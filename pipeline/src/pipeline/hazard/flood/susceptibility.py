"""Flood Susceptibility Combination (Step 9).

Pure-function module implementing the empirical flood-susceptibility algebra:
  - FR-3.17 hard-zero enforcement (HAND > 30m OR slope > 15°)
  - Percentile-based HAND normalization over the flood-eligible domain
  - Weighted combination: S_f = w_F * F + w_H * H_hand
  - Confidence layer: min(1, n_valid / 30)

No I/O — only numpy array operations on grid-aligned rasters from Steps 5–8.
"""

from typing import Optional, Tuple
import numpy as np


# Default combination weights for Barpeta pilot (equal weighting)
DEFAULT_W_FREQ = 0.5
DEFAULT_W_HAND = 0.5

# Default percentile ceiling for HAND normalization
DEFAULT_HAND_CLIP_PERCENTILE = 99.0

# Default observation ceiling for confidence calculation
DEFAULT_OBSERVATION_CEILING = 30

# Hazard regime thresholds (Phase 2). Occurrence is the JRC GSW long-term water
# occurrence fraction; SAR frequency is the raw monsoon-stack inundation frequency.
DEFAULT_REGIME_CHANNEL_OCCURRENCE = 0.75
DEFAULT_REGIME_CHAR_OCCURRENCE = 0.40
DEFAULT_REGIME_CHAR_SAR_FREQUENCY = 0.40
HAZARD_REGIMES = ("floodplain", "char_belt", "channel")

# Regime-specific scoring (Phase 2b). Fixed expert weights for a screening-grade tool; supervised
# calibration against a pre-2015 NDEM holdout is Priority 5. Tributary distance is the strongest
# single NDEM predictor in Barpeta (AUC 0.668), hence its weight on the floodplain.
DEFAULT_FLOODPLAIN_WEIGHTS: dict[str, float] = {"w_hand": 0.35, "w_anom": 0.35, "w_trib": 0.30}
DEFAULT_CHAR_WEIGHTS: dict[str, float] = {"w_instability": 0.40, "w_baseline": 0.30, "w_mainstem": 0.30}
# Distance at which proximity to a river stops contributing (score 1.0 at the bank, 0.0 at the scale).
DEFAULT_TRIBUTARY_DISTANCE_SCALE_M = 5000.0
DEFAULT_MAINSTEM_DISTANCE_SCALE_M = 10000.0

# Model variants. v0.1 combines raw SAR frequency with HAND; v0.2 replaces raw
# frequency with anomalous frequency (SAR frequency in excess of JRC long-term
# occurrence) so that recurring river-channel water no longer reads as flood hazard.
MODEL_VARIANTS: dict[str, dict] = {
    "v0.1": {"frequency_input": "raw"},
    "v0.2": {
        "frequency_input": "anomalous",
        "anomalous_mode": "excess",
        "baseline_occurrence_threshold_pct": 40.0,
    },
}


def normalize_hand_percentile(
    hand_m: np.ndarray,
    eligible_mask: np.ndarray,
    clip_percentile: float = DEFAULT_HAND_CLIP_PERCENTILE,
) -> Tuple[np.ndarray, float]:
    """Normalize HAND into [0.0, 1.0] using percentile-based normalization.

    Per Plan §9.2: H_hand = 1 - N(HAND) over the non-zeroed domain.
    Percentile-based normalization is the "more defensible default because it is
    not hostage to a single outlier cell."

    Low HAND → high susceptibility (near drainage).
    High HAND → low susceptibility (elevated terrain).

    Args:
        hand_m: 2D float32 array of HAND values in meters.
        eligible_mask: 2D bool array (True where flood-eligible, i.e. not hard-zeroed).
        clip_percentile: Percentile of eligible-domain HAND used as normalization ceiling.

    Returns:
        Tuple of (hand_normalized, clip_value_m):
            - hand_normalized: 2D float32 array in [0.0, 1.0], NaN outside eligible domain.
            - clip_value_m: The percentile value in meters used for normalization.
    """
    hand_normalized = np.full(hand_m.shape, np.nan, dtype=np.float32)

    eligible_hand = hand_m[eligible_mask & np.isfinite(hand_m)]
    if eligible_hand.size == 0:
        return hand_normalized, 0.0

    clip_value_m = float(np.percentile(eligible_hand, clip_percentile))
    if clip_value_m <= 0:
        clip_value_m = 1.0  # Safety fallback

    # Normalize: 0m → 1.0 (most susceptible), clip_value_m → 0.0 (least susceptible)
    valid = eligible_mask & np.isfinite(hand_m)
    normalized = 1.0 - np.clip(hand_m[valid] / clip_value_m, 0.0, 1.0)
    hand_normalized[valid] = normalized.astype(np.float32)

    return hand_normalized, clip_value_m


def combine_susceptibility(
    frequency: np.ndarray,
    hand_normalized: np.ndarray,
    eligible_mask: np.ndarray,
    w_freq: float = DEFAULT_W_FREQ,
    w_hand: float = DEFAULT_W_HAND,
) -> np.ndarray:
    """Combine inundation frequency and normalized HAND into flood susceptibility.

    Per Plan §9.3: S_f = w_F * F + w_H * H_hand
    Per Plan §9.1 / FR-3.17: Hard-zero pixels are forced to exactly 0.0.
    Per FR-3.3: Zeros must survive downstream trigger amplification — they are 0.0, not NaN.

    Args:
        frequency: 2D float32 array of inundation frequency F(x,y) in [0.0, 1.0].
        hand_normalized: 2D float32 array of normalized HAND H_hand in [0.0, 1.0].
        eligible_mask: 2D bool array (True where flood-eligible).
        w_freq: Weight for inundation frequency (default 0.5).
        w_hand: Weight for normalized HAND (default 0.5).

    Returns:
        2D float32 array of flood susceptibility in [0.0, 1.0].
        - Eligible pixels: weighted combination.
        - Hard-zero pixels (valid terrain but not eligible): exactly 0.0.
        - No-data pixels (no terrain): NaN.
    """
    assert abs((w_freq + w_hand) - 1.0) < 1e-6, f"Weights must sum to 1.0, got {w_freq + w_hand}"

    susceptibility = np.full(frequency.shape, np.nan, dtype=np.float32)

    # For eligible pixels, compute the weighted combination
    # Handle NaN in either input: use available signal where one component is missing
    valid_both = eligible_mask & np.isfinite(frequency) & np.isfinite(hand_normalized)
    valid_freq_only = eligible_mask & np.isfinite(frequency) & (~np.isfinite(hand_normalized))
    valid_hand_only = eligible_mask & (~np.isfinite(frequency)) & np.isfinite(hand_normalized)

    # Standard combination where both signals are available
    susceptibility[valid_both] = (
        w_freq * frequency[valid_both] + w_hand * hand_normalized[valid_both]
    )

    # Graceful degradation: use available signal scaled to full range
    susceptibility[valid_freq_only] = frequency[valid_freq_only]
    susceptibility[valid_hand_only] = hand_normalized[valid_hand_only]

    # FR-3.17 / FR-3.3: Hard-zero enforcement
    # Valid terrain that is NOT eligible gets exactly 0.0 (not NaN)
    valid_terrain = np.isfinite(frequency) | np.isfinite(hand_normalized)
    hard_zero = valid_terrain & (~eligible_mask)
    susceptibility[hard_zero] = 0.0

    # Final clamp to [0.0, 1.0]
    finite_mask = np.isfinite(susceptibility)
    susceptibility[finite_mask] = np.clip(susceptibility[finite_mask], 0.0, 1.0)

    return susceptibility


def compute_confidence(
    valid_observation_count: np.ndarray,
    eligible_mask: np.ndarray,
    observation_ceiling: int = DEFAULT_OBSERVATION_CEILING,
) -> np.ndarray:
    """Compute pixel-wise confidence for the flood susceptibility estimate.

    Per Plan §9.4: confidence = min(1, n_valid / 30)

    Args:
        valid_observation_count: 2D uint16 array of valid SAR observation counts per pixel.
        eligible_mask: 2D bool array (True where flood-eligible).
        observation_ceiling: Number of observations for full confidence (default 30).

    Returns:
        2D float32 array of confidence in [0.0, 1.0].
        - Eligible pixels: min(1, n_valid / ceiling).
        - Hard-zero pixels: 0.0 (certain-zero by construction, not by observation).
        - No-data pixels: NaN.
    """
    confidence = np.full(valid_observation_count.shape, np.nan, dtype=np.float32)

    # Eligible domain: confidence scales with observation density
    valid = eligible_mask & (valid_observation_count > 0)
    confidence[valid] = np.minimum(
        1.0,
        valid_observation_count[valid].astype(np.float32) / float(observation_ceiling),
    )

    # Zero-observation eligible pixels
    zero_obs_eligible = eligible_mask & (valid_observation_count == 0)
    confidence[zero_obs_eligible] = 0.0

    # Hard-zero pixels: confidence = 0.0 (their susceptibility is deterministic, not observed)
    has_terrain = np.isfinite(confidence) | (valid_observation_count > 0)
    hard_zero = has_terrain & (~eligible_mask)
    confidence[hard_zero] = 0.0

    return confidence


def classify_hazard_regime(
    jrc_occurrence_frac: np.ndarray,
    sar_frequency: np.ndarray,
    channel_threshold: float = DEFAULT_REGIME_CHANNEL_OCCURRENCE,
    char_threshold: float = DEFAULT_REGIME_CHAR_OCCURRENCE,
    char_sar_threshold: float = DEFAULT_REGIME_CHAR_SAR_FREQUENCY,
) -> np.ndarray:
    """Classify land surface into hazard regimes: 'channel', 'char_belt', or 'floodplain'.

    Per Phase 2 Plan:
    Separates the active riverbed and dynamic sandbar islands (chars) into
    distinct hazard regimes rather than dropping char populations or conflating
    them with inland agricultural floodplains.

    Args:
        jrc_occurrence_frac: JRC water occurrence fraction in [0.0, 1.0].
        sar_frequency: SAR inundation detection frequency in [0.0, 1.0].
        channel_threshold: Occurrence fraction at or above which a cell is active channel.
        char_threshold: Occurrence fraction at or above which a cell is char belt.
        char_sar_threshold: SAR frequency at or above which a cell is char belt.

    Returns:
        1D or 2D array of string regime labels ('channel', 'char_belt', 'floodplain').
    """
    occ = np.nan_to_num(jrc_occurrence_frac, nan=0.0)
    sar = np.nan_to_num(sar_frequency, nan=0.0)

    regimes = np.full(occ.shape, "floodplain", dtype=object)

    is_channel = occ >= channel_threshold
    is_char = (~is_channel) & ((occ >= char_threshold) | (sar >= char_sar_threshold))

    regimes[is_char] = "char_belt"
    regimes[is_channel] = "channel"

    return regimes


def combine_susceptibility_floodplain(
    hand_normalized: np.ndarray,
    anomalous_frequency: np.ndarray,
    dist_tributary_norm: Optional[np.ndarray] = None,
    eligible_mask: Optional[np.ndarray] = None,
    w_hand: float = 0.5,
    w_anom: float = 0.5,
    w_trib: float = 0.0,
) -> np.ndarray:
    """Combine physical drivers for the terrestrial floodplain hazard regime.

    In the inland alluvial plain (embankment-breach & backwater flood hazard),
    susceptibility is driven by terrain drainage (HAND), anomalous inundation
    frequency above normal dry-season water, and proximity to major tributaries.

    Formula:
        S_floodplain = w_H * H_hand + w_A * F_anom + w_T * D_trib
    Where weights sum to 1.0 (default equal 0.5/0.5 for HAND and Anomalous freq,
    leaving tributary calibration to Priority 5).
    """
    total_w = w_hand + w_anom + w_trib
    if total_w <= 0:
        total_w = 1.0
    w_h = w_hand / total_w
    w_a = w_anom / total_w
    w_t = w_trib / total_w

    if eligible_mask is None:
        eligible_mask = np.ones(hand_normalized.shape, dtype=bool)

    susc = np.zeros(hand_normalized.shape, dtype=np.float32)
    valid_count = np.zeros(hand_normalized.shape, dtype=np.float32)

    h_finite = np.isfinite(hand_normalized) & eligible_mask
    if np.any(h_finite):
        susc[h_finite] += w_h * hand_normalized[h_finite]
        valid_count[h_finite] += w_h

    a_finite = np.isfinite(anomalous_frequency) & eligible_mask
    if np.any(a_finite):
        susc[a_finite] += w_a * anomalous_frequency[a_finite]
        valid_count[a_finite] += w_a

    if dist_tributary_norm is not None and w_t > 0:
        t_finite = np.isfinite(dist_tributary_norm) & eligible_mask
        if np.any(t_finite):
            susc[t_finite] += w_t * dist_tributary_norm[t_finite]
            valid_count[t_finite] += w_t

    # Re-normalize where partial drivers are available
    with np.errstate(divide="ignore", invalid="ignore"):
        has_signal = valid_count > 0
        susc[has_signal] = susc[has_signal] / valid_count[has_signal]
        susc[~has_signal] = np.nan

    # Respect hard-zero domain
    valid_terrain = np.isfinite(hand_normalized) | np.isfinite(anomalous_frequency)
    hard_zero = valid_terrain & (~eligible_mask)
    susc[hard_zero] = 0.0

    finite_mask = np.isfinite(susc)
    susc[finite_mask] = np.clip(susc[finite_mask], 0.0, 1.0)
    return susc


def combine_susceptibility_char(
    sar_instability: np.ndarray,
    baseline_water: np.ndarray,
    dist_mainstem_norm: Optional[np.ndarray] = None,
    eligible_mask: Optional[np.ndarray] = None,
    w_instability: float = 0.5,
    w_baseline: float = 0.5,
    w_mainstem: float = 0.0,
) -> np.ndarray:
    """Combine physical drivers for the active char-belt hazard regime.

    In dynamic sandbars (chars), hazard is predominantly lateral erosion, surface
    instability, and seasonal submersion rather than inland embankment breach.
    Channel cells and char cells are kept distinct, with char hazard scoring
    reflecting surface change dynamics.
    """
    total_w = w_instability + w_baseline + w_mainstem
    if total_w <= 0:
        total_w = 1.0
    w_i = w_instability / total_w
    w_b = w_baseline / total_w
    w_m = w_mainstem / total_w

    if eligible_mask is None:
        eligible_mask = np.ones(sar_instability.shape, dtype=bool)

    susc = np.zeros(sar_instability.shape, dtype=np.float32)
    valid_count = np.zeros(sar_instability.shape, dtype=np.float32)

    i_finite = np.isfinite(sar_instability) & eligible_mask
    if np.any(i_finite):
        susc[i_finite] += w_i * sar_instability[i_finite]
        valid_count[i_finite] += w_i

    b_finite = np.isfinite(baseline_water) & eligible_mask
    if np.any(b_finite):
        susc[b_finite] += w_b * baseline_water[b_finite]
        valid_count[b_finite] += w_b

    if dist_mainstem_norm is not None and w_m > 0:
        m_finite = np.isfinite(dist_mainstem_norm) & eligible_mask
        if np.any(m_finite):
            susc[m_finite] += w_m * dist_mainstem_norm[m_finite]
            valid_count[m_finite] += w_m

    with np.errstate(divide="ignore", invalid="ignore"):
        has_signal = valid_count > 0
        susc[has_signal] = susc[has_signal] / valid_count[has_signal]
        susc[~has_signal] = np.nan

    finite_mask = np.isfinite(susc)
    susc[finite_mask] = np.clip(susc[finite_mask], 0.0, 1.0)
    return susc



def normalize_inverse_distance(dist_m: np.ndarray, scale_m: float) -> np.ndarray:
    """Normalized inverse distance: 1.0 at the channel, falling linearly to 0.0 at ``scale_m``.

    NaN (no mapped river) stays NaN so the combiners drop the term instead of reading it as "far".
    """
    dist = np.asarray(dist_m, dtype=np.float32)
    out = np.full(dist.shape, np.nan, dtype=np.float32)
    finite = np.isfinite(dist)
    out[finite] = 1.0 - np.clip(dist[finite] / float(scale_m), 0.0, 1.0)
    return out


def sar_instability_from_frequency(frequency: np.ndarray) -> np.ndarray:
    """Temporal-instability proxy ``4 F (1 - F)`` from the SAR water-detection frequency.

    The Bernoulli variance of the per-scene water flag peaks at F = 0.5 (a surface that flips
    between wet and dry across the monsoon stack, i.e. an unstable sandbar) and vanishes for
    surfaces that are always or never detected. It is derived from the existing frequency
    raster, so it needs no Sentinel-1 reprocessing; true VV-backscatter variance would replace it.
    """
    f = np.asarray(frequency, dtype=np.float32)
    out = np.full(f.shape, np.nan, dtype=np.float32)
    finite = np.isfinite(f)
    out[finite] = np.clip(4.0 * f[finite] * (1.0 - f[finite]), 0.0, 1.0)
    return out
