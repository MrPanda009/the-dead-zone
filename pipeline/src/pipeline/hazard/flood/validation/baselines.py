"""Comparative baseline models for flood susceptibility validation.

Implements benchmark baselines to test whether the blended SAR + HAND model
demonstrates genuine predictive lift over simpler heuristics:
- HAND-only (lower height above drainage = higher risk, dynamically scaled to p99)
- SAR Inundation Frequency only
- Distance to river / permanent water bodies
- Random baseline
"""

from __future__ import annotations

from typing import Sequence
import numpy as np
import pandas as pd


def compute_hand_baseline(
    hand_values: np.ndarray | pd.Series | Sequence[float],
    hand_p99: float | None = None,
) -> np.ndarray:
    """Compute inverted, normalized HAND baseline score.

    Lower HAND indicates terrain closer to drainage base level, which corresponds
    to higher flood risk. Scores are scaled into [0.0, 1.0].
    Fixes spike script bug: dynamically computes p99 instead of hardcoding 10.65.

    Args:
        hand_values: Array of Height Above Nearest Drainage (HAND) in meters.
        hand_p99: Optional 99th percentile cutoff. If None, computed from the data.

    Returns:
        1D float array of baseline scores in [0.0, 1.0].
    """
    arr = np.asarray(hand_values, dtype=float)
    if len(arr) == 0:
        return np.array([], dtype=float)

    if hand_p99 is None:
        valid_vals = arr[~np.isnan(arr)]
        if len(valid_vals) > 0:
            hand_p99 = float(np.percentile(valid_vals, 99))
        else:
            hand_p99 = 1.0

    if hand_p99 <= 0.0 or np.isnan(hand_p99):
        hand_p99 = 1.0

    clipped = np.clip(arr / hand_p99, 0.0, 1.0)
    # Lower HAND -> higher flood risk score
    return 1.0 - clipped


def compute_frequency_baseline(
    frequency_values: np.ndarray | pd.Series | Sequence[float],
) -> np.ndarray:
    """Compute SAR inundation frequency baseline score in [0.0, 1.0].

    Args:
        frequency_values: Array of historical inundation frequencies (0.0 to 1.0).

    Returns:
        1D float array of frequency scores clipped to [0.0, 1.0].
    """
    arr = np.asarray(frequency_values, dtype=float)
    return np.clip(arr, 0.0, 1.0)


def compute_distance_to_river_baseline(
    distances: np.ndarray | pd.Series | Sequence[float],
    max_dist: float | None = None,
) -> np.ndarray:
    """Compute inverted distance-to-river baseline score in [0.0, 1.0].

    Closer proximity to river/water bodies indicates higher flood hazard.

    Args:
        distances: Distance to nearest major river channel in meters.
        max_dist: Optional maximum distance for clipping. If None, uses 99th percentile.

    Returns:
        1D float array of distance baseline scores in [0.0, 1.0].
    """
    arr = np.asarray(distances, dtype=float)
    if len(arr) == 0:
        return np.array([], dtype=float)

    valid = np.isfinite(arr)
    if not np.any(valid):
        return np.full(arr.shape, np.nan, dtype=float)

    if max_dist is None:
        valid_vals = arr[valid]
        if len(valid_vals) > 0:
            max_dist = float(np.percentile(valid_vals, 99))
        else:
            max_dist = 1.0

    if max_dist <= 0.0 or np.isnan(max_dist):
        max_dist = 1.0

    out = np.full(arr.shape, np.nan, dtype=float)
    clipped = np.clip(arr[valid] / max_dist, 0.0, 1.0)
    out[valid] = 1.0 - clipped
    return out


def generate_distance_to_water_raster(
    water_raster_path: str | Path,
    output_raster_path: str | Path,
    water_value: int = 1,
) -> Path:
    """Compute and save Euclidean distance in meters from each pixel to nearest water pixel.

    Uses scipy.ndimage.distance_transform_edt for fast O(N) distance computation.

    Args:
        water_raster_path: Path to binary or classified water raster GeoTIFF.
        output_raster_path: Output GeoTIFF destination.
        water_value: Value indicating water presence (default 1).

    Returns:
        Path to generated distance raster.
    """
    from pathlib import Path
    import rasterio
    from scipy.ndimage import distance_transform_edt
    from pipeline.hazard.flood.water_mask import save_raster_geotiff

    water_raster_path = Path(water_raster_path)
    output_raster_path = Path(output_raster_path)

    with rasterio.open(water_raster_path) as src:
        water_data = src.read(1)
        transform = src.transform
        crs = src.crs
        pixel_res_m = float(abs(src.transform.a))

    # Water pixels are target features; calculate distance from non-water to water
    is_not_water = water_data != water_value
    dist_px = distance_transform_edt(is_not_water)
    dist_m = (dist_px * pixel_res_m).astype(np.float32)

    save_raster_geotiff(
        output_raster_path,
        dist_m,
        transform,
        crs,
        nodata=np.nan,
        dtype="float32",
    )
    return output_raster_path



def compute_random_baseline(
    n: int,
    random_seed: int = 42,
) -> np.ndarray:
    """Generate uniform random baseline scores in [0.0, 1.0].

    Args:
        n: Number of samples.
        random_seed: Deterministic RNG seed.

    Returns:
        1D float array of random scores.
    """
    rng = np.random.default_rng(random_seed)
    return rng.uniform(0.0, 1.0, size=n)


def attach_all_baselines(
    df: pd.DataFrame,
    hand_col: str = "mean_hand",
    freq_col: str = "mean_inundation_frequency",
    dist_col: str | None = None,
    dist_cols: dict[str, str] | None = None,
    random_seed: int = 42,
) -> pd.DataFrame:
    """Compute and attach all comparative baseline scores to a DataFrame.

    Adds columns:
    - 'baseline_hand': Scaled inverted HAND score.
    - 'baseline_freq': Pure inundation frequency score.
    - 'baseline_random': Uniform random score.
    - 'baseline_distance_to_river': If dist_col is provided and present.
    - 'baseline_dist_mainstem': If dist_mainstem_m is present.
    - 'baseline_dist_tributary': If dist_tributary_m is present.
    - 'baseline_dist_any_river': If dist_any_river_m is present.

    Args:
        df: Input DataFrame with model cells.
        hand_col: Column containing HAND values.
        freq_col: Column containing SAR inundation frequencies.
        dist_col: Optional legacy column containing distance to river in meters.
        dist_cols: Optional dict mapping target baseline key to source column name.
        random_seed: Seed for random baseline.

    Returns:
        DataFrame copy with baseline score columns added.
    """
    out = df.copy()

    if hand_col in out.columns:
        out["baseline_hand"] = compute_hand_baseline(out[hand_col])
    else:
        out["baseline_hand"] = np.nan

    if freq_col in out.columns:
        out["baseline_freq"] = compute_frequency_baseline(out[freq_col])
    else:
        out["baseline_freq"] = np.nan

    if dist_col and dist_col in out.columns:
        out["baseline_distance_to_river"] = compute_distance_to_river_baseline(out[dist_col])

    # Multi-axis river distance baselines
    mapping = {
        "baseline_dist_mainstem": "dist_mainstem_m",
        "baseline_dist_tributary": "dist_tributary_m",
        "baseline_dist_any_river": "dist_any_river_m",
    }
    if dist_cols:
        mapping.update(dist_cols)

    for base_key, col_name in mapping.items():
        if col_name in out.columns:
            out[base_key] = compute_distance_to_river_baseline(out[col_name])

    out["baseline_random"] = compute_random_baseline(len(out), random_seed=random_seed)

    return out
