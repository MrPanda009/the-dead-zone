"""Pydantic v2 schemas for the static hazard vector-map layer.

Endpoints: GET /hazard/layers, GET /hazard/cells, GET /hazard/cells/{h3}

Design note — why this is separate from `core.schemas.zones`:
`GET /zones` composes the Multi-Hazard Index from `mhi_snapshot`. The flood pipeline
(pipeline/hazard/flood, Steps 1-10) writes `hazard_static` + `hazard_static_flood` and
never touches `mhi_snapshot`, so a cell can carry a fully-modelled flood susceptibility
while its MHI row does not exist. These schemas serve the raw per-hazard layer directly.
"""

from typing import Any, Dict, List, Optional
from pydantic import Field

from core.enums import CoverageFlag, HazardRegime
from core.schemas.common import BaseSchema, SCREENING_GRADE_NOTICE


class HazardCellDTO(BaseSchema):
    """One H3 cell of a static hazard layer, sized for bulk viewport transport.

    Geometry is deliberately omitted: the client reconstructs the hexagon from the H3
    index (deck.gl `H3HexagonLayer` derives boundaries on the GPU). Shipping polygons
    inflates the Barpeta res-8 payload from ~0.47 MB to ~3.4 MB for identical pixels.
    """

    h3: str = Field(description="H3 index as lowercase hexadecimal string.")
    susceptibility: float = Field(
        ge=0.0, le=1.0, description="Static susceptibility S_h in [0, 1]."
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description=(
            "Raw model confidence. Normalise against `HazardLayerLegendDTO.confidence_ceiling` "
            "before rendering — an absolute threshold will hide a whole layer."
        ),
    )
    quality_flag: CoverageFlag = Field(
        default=CoverageFlag.FULL,
        description="Coverage class. `no_coverage` means susceptibility 0.0 is a fill, not a measurement.",
    )
    hard_zero_fraction: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Fraction of cell excluded by FR-3.17 (HAND > 30m OR slope > 15deg).",
    )
    hazard_regime: Optional[HazardRegime] = Field(
        default=None,
        description="floodplain | char_belt | channel. Char-belt scores understate exposure; show the regime.",
    )


class RegimeContextDTO(BaseSchema):
    """What a cell's hazard regime means, so the dossier explains the score instead of just showing it."""

    regime: HazardRegime
    headline: str = Field(description="One-line label for the regime banner.")
    description: str = Field(description="Plain-language explanation of the regime's physical hazard.")
    primary_hazards: List[str] = Field(default_factory=list, description="Dominant hazard mechanisms.")
    scoring_basis: str = Field(description="Formula family that produced this cell's susceptibility.")
    key_drivers: List[str] = Field(
        default_factory=list,
        description="FloodDriverDTO field names that matter most for this regime, in display order.",
    )


class RegimeSummaryDTO(BaseSchema):
    """Per-regime roll-up inside a district summary."""

    regime: HazardRegime
    cell_count: int = Field(ge=0)
    population: int = Field(default=0, ge=0)
    mean_susceptibility: Optional[float] = Field(
        default=None, description="None for the channel regime, which is excluded from scoring."
    )


class HazardLayerLegendDTO(BaseSchema):
    """Quantile class breaks and normalisation ceilings for the active layer.

    Computed server-side over the queried population rather than assumed client-side.
    A linear 0->1 ramp renders the Barpeta flood layer almost uniformly: half its cells
    fall between 0.39 and 0.48 because mean HAND is 1.83 m across the floodplain, which
    saturates the `1 - HAND/P99` term. The signal lives in the top decile.
    """

    method: str = Field(default="quantile", description="Classification method used to derive breaks.")
    quantiles: List[float] = Field(description="Quantile positions the breaks were sampled at.")
    breaks: List[float] = Field(description="Ascending class break values in susceptibility units.")
    domain: List[float] = Field(description="[min, max] observed susceptibility across the layer.")
    confidence_ceiling: float = Field(
        gt=0.0,
        le=1.0,
        description=(
            "Maximum confidence present in the layer. Divide each cell's confidence by this "
            "to obtain a displayable [0, 1] value."
        ),
    )
    prz_susceptibility_threshold: float = Field(
        description="FR-3.9 Permanent Red Zone susceptibility cut (core.constants.PRZ_ANY_SUSCEPTIBILITY).",
    )


class HazardLayerCoverageDTO(BaseSchema):
    """Population counts per coverage class, for the legend and the empty-state copy."""

    full: int = Field(default=0, ge=0)
    low_coverage: int = Field(default=0, ge=0)
    no_coverage: int = Field(default=0, ge=0)
    channel_excluded: int = Field(
        default=0, ge=0, description="Active-channel cells, left out of terrestrial statistics."
    )


class HazardLayerResponse(BaseSchema):
    """Envelope for GET /hazard/cells — cells plus everything needed to colour them."""

    hazard_type: str = Field(description="Hazard type served, e.g. 'riverine_flood'.")
    res: int = Field(description="H3 resolution of the returned cells.")
    count: int = Field(ge=0, description="Number of cells in this response.")
    truncated: bool = Field(
        default=False, description="True when the limit clipped the result set."
    )
    model_version: str = Field(default="v1.0.0", description="Pipeline model version tag.")
    legend: HazardLayerLegendDTO
    coverage: HazardLayerCoverageDTO
    cells: List[HazardCellDTO] = Field(default_factory=list)
    screening_grade: str = Field(default=SCREENING_GRADE_NOTICE)


class HazardLayerSummaryDTO(BaseSchema):
    """One available static hazard layer (GET /hazard/layers)."""

    hazard_type: str
    res: int
    cell_count: int = Field(ge=0)
    model_version: str
    min_susceptibility: float
    max_susceptibility: float
    mean_susceptibility: float
    confidence_ceiling: float


class FloodDriverDTO(BaseSchema):
    """Physical drivers behind a flood susceptibility score (hazard_static_flood)."""

    mean_inundation_frequency: Optional[float] = Field(
        default=None, description="Empirical Sentinel-1 inundation frequency F in [0, 1]."
    )
    mean_hand_m: Optional[float] = Field(default=None, description="Mean Height Above Nearest Drainage (m).")
    min_hand_m: Optional[float] = Field(default=None, description="Minimum HAND within the cell (m).")
    mean_slope_deg: Optional[float] = Field(default=None, description="Mean terrain slope (degrees).")
    mean_cropland_fraction: Optional[float] = Field(
        default=None, description="ESA WorldCover class-40 cropland fraction in [0, 1]."
    )
    max_susceptibility: Optional[float] = Field(
        default=None, description="Peak pixel susceptibility inside the cell."
    )
    valid_pixel_fraction: Optional[float] = Field(
        default=None, description="Fraction of the cell covered by valid raster pixels."
    )
    hard_zero_fraction: Optional[float] = Field(
        default=None, description="Fraction excluded by FR-3.17 hard-zero screening."
    )
    mean_anomalous_frequency: Optional[float] = Field(
        default=None,
        description="Model v0.2 frequency input: max(0, SAR frequency - JRC occurrence), in [0, 1].",
    )
    jrc_occurrence_mean: Optional[float] = Field(
        default=None, description="JRC long-term water occurrence, cell mean in [0, 1]."
    )
    baseline_water_fraction: Optional[float] = Field(
        default=None, description="Cell fraction with JRC occurrence >= 40 % (seasonal baseline water)."
    )
    hazard_regime: Optional[HazardRegime] = Field(
        default=None, description="floodplain | char_belt | channel."
    )
    dist_tributary_m: Optional[float] = Field(
        default=None, description="Metres to the nearest major tributary (floodplain score input)."
    )
    dist_mainstem_m: Optional[float] = Field(
        default=None, description="Metres to the nearest mainstem channel (char-belt score input)."
    )
    sar_instability: Optional[float] = Field(
        default=None,
        description="Wet/dry flip-flop proxy 4F(1-F) in [0, 1] from the SAR frequency (char-belt score input).",
    )
    observation_ceiling: int = Field(
        default=30, description="Denominator in confidence = min(1, n_valid / ceiling)."
    )


class HazardCellDetailDTO(BaseSchema):
    """Full per-cell dossier payload (GET /hazard/cells/{h3})."""

    h3: str
    h3_int: int
    res: int
    hazard_type: str
    susceptibility: float = Field(ge=0.0, le=1.0)
    confidence: float = Field(ge=0.0, le=1.0)
    confidence_normalised: float = Field(
        ge=0.0, le=1.0, description="confidence / layer ceiling — the value safe to display."
    )
    quality_flag: CoverageFlag
    model_version: str
    centroid: List[float] = Field(description="[longitude, latitude]")
    admin_name: Optional[str] = None
    population: float = 0.0
    is_permanent_red_candidate: bool = Field(
        default=False, description="susceptibility >= PRZ_ANY_SUSCEPTIBILITY (FR-3.9)."
    )
    drivers: Optional[FloodDriverDTO] = None
    regime_context: Optional[RegimeContextDTO] = None
    screening_grade: str = Field(default=SCREENING_GRADE_NOTICE)


class SusceptibilityBandBreakdown(BaseSchema):
    """Distribution shares of cells across susceptibility thresholds."""

    very_low: float = Field(default=0.0, description="Share with S < 0.20 [0, 1].")
    low: float = Field(default=0.0, description="Share with 0.20 <= S < 0.40 [0, 1].")
    moderate: float = Field(default=0.0, description="Share with 0.40 <= S < 0.60 [0, 1].")
    high: float = Field(default=0.0, description="Share with 0.60 <= S < 0.80 [0, 1].")
    very_high: float = Field(default=0.0, description="Share with S >= 0.80 [0, 1].")


class DistrictHazardSummaryDTO(BaseSchema):
    """District-level rollup for officer decision support (GET /hazard/summary)."""

    admin_id: int
    admin_name: str
    lgd_code: Optional[int] = None
    hazard_type: str = "riverine_flood"
    model_status: str = Field(
        default="computed",
        description="'computed' for SAR-modeled districts; 'not_computed' for unmodeled districts.",
    )
    model_version: Optional[str] = None
    total_cells: int = 0
    coverage: HazardLayerCoverageDTO = Field(default_factory=HazardLayerCoverageDTO)
    unmeasured_cells_count: int = Field(
        default=0,
        description="Number of no_coverage cells. Treated strictly as unmeasured, never safe.",
    )
    band_distribution: SusceptibilityBandBreakdown = Field(
        default_factory=SusceptibilityBandBreakdown
    )
    mean_susceptibility: float = 0.0
    max_susceptibility: float = 0.0
    habitations_at_risk_count: int = 0
    population_at_risk_sum: int = 0
    drivers_summary: Optional[FloodDriverDTO] = None
    regime_summary: List[RegimeSummaryDTO] = Field(
        default_factory=list,
        description="Cells, population and mean susceptibility per hazard regime.",
    )
    last_recorded_flood_loss: Optional[dict[str, Any]] = None
    officer_decision_prompt: str = ""
    screening_grade: str = Field(default=SCREENING_GRADE_NOTICE)


class FloodValidationDTO(BaseSchema):
    """Validation response DTO matching Phase 5 (§8) contract."""

    district: str
    admin_id: Optional[int] = None
    lgd_code: Optional[int] = None
    model_version: str = "flood-susceptibility-v0.1"
    status: str = Field(
        ...,
        description="'validated' if independent reference evaluation exists, else 'not_validated'",
    )
    generated_at: Optional[str] = None
    reference_name: str = ""
    reference_years: list[int] = Field(default_factory=list)
    n_cells: int = 0
    prevalence: float = 0.0
    roc_auc: Optional[float] = None
    roc_auc_ci95: Optional[list[float]] = None
    pr_auc: Optional[float] = None
    pr_auc_prevalence: Optional[float] = None
    spearman_frequency: Optional[float] = None
    baseline_hand_auc: Optional[float] = None
    baseline_frequency_auc: Optional[float] = None
    baseline_anomalous_frequency_auc: Optional[float] = None
    baseline_dist_mainstem_auc: Optional[float] = None
    baseline_dist_tributary_auc: Optional[float] = None
    baseline_dist_any_river_auc: Optional[float] = None
    baseline_distance_to_river_auc: Optional[float] = None
    by_regime: Optional[list[dict[str, Any]]] = None
    evaluation_domain: Optional[dict[str, Any]] = Field(
        default=None, description="Hazard regimes and filters defining the headline cells."
    )
    imbalance: Optional[dict[str, Any]] = Field(
        default=None, description="n_pos / n_neg / n_blocks and the low-negative-count warning."
    )
    baseline_ci95: Optional[dict[str, Any]] = Field(
        default=None,
        description="Block-bootstrap CIs: auc, spearman and auc_model_minus (paired) per predictor.",
    )
    per_year: Optional[list[dict[str, Any]]] = Field(
        default=None, description="Agreement per NDEM year; role marks in_sample / temporal_holdout years."
    )
    sensitivity: Optional[dict[str, Any]] = None
    year_matched_auc: Optional[float] = None
    year_matched_year: Optional[int] = None
    pre2015_auc: Optional[float] = None
    losses_context: Optional[dict[str, Any]] = None
    gauges: Optional[dict[str, Any]] = None
    caveat_text: str = ""
    markdown_report: Optional[str] = None

