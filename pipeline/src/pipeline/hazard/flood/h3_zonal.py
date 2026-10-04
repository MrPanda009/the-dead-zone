"""H3 Resolution 8 Zonal Statistics and Aggregation Module (Step 10).

Moves raster-space flood susceptibility onto the platform's common H3 hexagonal grid:
  - Generates H3 Res 8 cells for reporting AOI.
  - Computes exact fractional pixel zonal statistics using exactextract.
  - Applies §10.3 quality control flagging for edge/low-coverage cells.
  - Produces GeoParquet export conforming to PRD schema.
"""

from typing import Sequence, Optional
from pathlib import Path
import h3
import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import Polygon
import exactextract
import rasterio

try:
    from .aoi import require_bbox
    from .susceptibility import (
        DEFAULT_CHAR_WEIGHTS,
        DEFAULT_FLOODPLAIN_WEIGHTS,
        DEFAULT_MAINSTEM_DISTANCE_SCALE_M,
        DEFAULT_TRIBUTARY_DISTANCE_SCALE_M,
        classify_hazard_regime,
        combine_susceptibility_char,
        combine_susceptibility_floodplain,
        normalize_inverse_distance,
        sar_instability_from_frequency,
    )
except (ImportError, ValueError):
    from aoi import require_bbox
    from susceptibility import (
        DEFAULT_CHAR_WEIGHTS,
        DEFAULT_FLOODPLAIN_WEIGHTS,
        DEFAULT_MAINSTEM_DISTANCE_SCALE_M,
        DEFAULT_TRIBUTARY_DISTANCE_SCALE_M,
        classify_hazard_regime,
        combine_susceptibility_char,
        combine_susceptibility_floodplain,
        normalize_inverse_distance,
        sar_instability_from_frequency,
    )

# Default parameters
DEFAULT_H3_RESOLUTION = 8
DEFAULT_MIN_VALID_PIXEL_FRACTION = 0.5
DEFAULT_MODEL_VERSION = "flood-susceptibility-v0.1"
DEFAULT_HAZARD_TYPE = "riverine_flood"
CHANNEL_EXCLUDED_FLAG = "channel_excluded"


def polyfill_reporting_aoi(
    bbox_wgs84: Sequence[float],
    resolution: int = DEFAULT_H3_RESOLUTION,
) -> list[str]:
    """Polyfills the reporting AOI at the given H3 resolution.

    Args:
        bbox_wgs84: District bounding box [min_lon, min_lat, max_lon, max_lat].
        resolution: H3 resolution level (default 8).

    Returns:
        Sorted list of unique H3 hexadecimal cell strings.
    """
    min_lon, min_lat, max_lon, max_lat = require_bbox(bbox_wgs84)
    ring = [
        (min_lat, min_lon),
        (max_lat, min_lon),
        (max_lat, max_lon),
        (min_lat, max_lon),
    ]
    poly = h3.LatLngPoly(ring)
    cells = h3.polygon_to_cells(poly, res=resolution)
    return sorted(list(cells))


def h3_cells_to_geodataframe(cells: Sequence[str]) -> gpd.GeoDataFrame:
    """Converts a list of H3 cell hex strings to a GeoDataFrame in EPSG:4326.

    Args:
        cells: Sequence of H3 cell hex strings.

    Returns:
        GeoDataFrame with columns:
          - h3_hex: str
          - h3_int: int64
          - centroid_lon: float
          - centroid_lat: float
          - geometry: shapely.geometry.Polygon (EPSG:4326)
    """
    h3_ints = []
    centroids_lon = []
    centroids_lat = []
    geometries = []

    for c in cells:
        h_int = h3.str_to_int(c)
        h3_ints.append(h_int)
        lat, lng = h3.cell_to_latlng(c)
        centroids_lon.append(round(lng, 6))
        centroids_lat.append(round(lat, 6))

        boundary = h3.cell_to_boundary(c)  # list of (lat, lng)
        poly = Polygon([(b_lng, b_lat) for b_lat, b_lng in boundary])
        geometries.append(poly)

    gdf = gpd.GeoDataFrame(
        {
            "h3_hex": list(cells),
            "h3_int": h3_ints,
            "centroid_lon": centroids_lon,
            "centroid_lat": centroids_lat,
            "geometry": geometries,
        },
        crs="EPSG:4326",
    )
    return gdf


def compute_zonal_statistics(
    cells_gdf: gpd.GeoDataFrame,
    raster_paths: dict[str, Path | str],
    target_crs: Optional[str] = None,
    pixel_res_m: Optional[float] = None,
) -> gpd.GeoDataFrame:
    """Computes exact fractional-coverage zonal statistics for all input rasters.

    Args:
        cells_gdf: GeoDataFrame of H3 cells in EPSG:4326.
        raster_paths: Dictionary mapping metric keys to raster filepaths:
          - 'susceptibility': Path to flood susceptibility GeoTIFF
          - 'confidence': Path to confidence GeoTIFF
          - 'frequency': Path to inundation frequency GeoTIFF
          - 'hand': Path to HAND GeoTIFF
          - 'slope': Path to slope GeoTIFF
          - 'cropland': Path to cropland fraction GeoTIFF (optional)
          - 'hard_zero': Path to hard-zero mask GeoTIFF (optional)
        target_crs: Projected CRS matching the rasters. Defaults to the
          susceptibility raster's own CRS.
        pixel_res_m: Raster pixel resolution in meters. Defaults to the
          susceptibility raster's pixel width.

    Returns:
        GeoDataFrame with original EPSG:4326 geometry and aggregated metric columns.
    """
    if target_crs is None or pixel_res_m is None:
        with rasterio.open(raster_paths["susceptibility"]) as src:
            target_crs = target_crs or str(src.crs)
            pixel_res_m = pixel_res_m or float(abs(src.transform.a))

    # Reproject cells to raster projected CRS for exact planar overlap
    cells_proj = cells_gdf.to_crs(target_crs)
    pixel_area_m2 = pixel_res_m * pixel_res_m
    expected_pixels = cells_proj.geometry.area / pixel_area_m2

    res_df = cells_gdf.copy()

    # 1. Flood Susceptibility (mean, max, count for valid pixel fraction)
    susc_path = str(raster_paths["susceptibility"])
    susc_stats = exactextract.exact_extract(
        susc_path,
        cells_proj,
        ["mean", "max", "count"],
        output="pandas",
    )
    valid_count = susc_stats["count"].to_numpy()
    valid_frac = np.clip(valid_count / expected_pixels.to_numpy(), 0.0, 1.0)

    res_df["mean_flood_susceptibility"] = susc_stats["mean"].astype("float32")
    res_df["max_flood_susceptibility"] = susc_stats["max"].astype("float32")
    res_df["valid_pixel_fraction"] = valid_frac.astype("float32")

    # 2. Confidence (mean)
    if "confidence" in raster_paths and raster_paths["confidence"]:
        conf_path = str(raster_paths["confidence"])
        conf_stats = exactextract.exact_extract(conf_path, cells_proj, ["mean"], output="pandas")
        res_df["mean_confidence"] = conf_stats["mean"].astype("float32")
    else:
        res_df["mean_confidence"] = np.float32(1.0)

    # 3. Inundation Frequency (mean)
    if "frequency" in raster_paths and raster_paths["frequency"]:
        freq_path = str(raster_paths["frequency"])
        freq_stats = exactextract.exact_extract(freq_path, cells_proj, ["mean"], output="pandas")
        res_df["mean_inundation_frequency"] = freq_stats["mean"].astype("float32")
    else:
        res_df["mean_inundation_frequency"] = np.float32(0.0)

    # 4. HAND (mean, min)
    if "hand" in raster_paths and raster_paths["hand"]:
        hand_path = str(raster_paths["hand"])
        hand_stats = exactextract.exact_extract(hand_path, cells_proj, ["mean", "min"], output="pandas")
        res_df["mean_hand"] = hand_stats["mean"].astype("float32")
        res_df["min_hand"] = hand_stats["min"].astype("float32")
    else:
        res_df["mean_hand"] = np.nan
        res_df["min_hand"] = np.nan

    # 5. Slope (mean)
    if "slope" in raster_paths and raster_paths["slope"]:
        slope_path = str(raster_paths["slope"])
        slope_stats = exactextract.exact_extract(slope_path, cells_proj, ["mean"], output="pandas")
        res_df["mean_slope"] = slope_stats["mean"].astype("float32")
    else:
        res_df["mean_slope"] = np.nan

    # 6. Cropland Fraction (mean)
    if "cropland" in raster_paths and raster_paths["cropland"]:
        crop_path = str(raster_paths["cropland"])
        crop_stats = exactextract.exact_extract(crop_path, cells_proj, ["mean"], output="pandas")
        res_df["mean_cropland_fraction"] = crop_stats["mean"].astype("float32")
    else:
        res_df["mean_cropland_fraction"] = np.nan

    # 7. Hard-Zero Mask (mean fraction of hard-zero pixels)
    if "hard_zero" in raster_paths and raster_paths["hard_zero"]:
        hz_path = str(raster_paths["hard_zero"])
        hz_stats = exactextract.exact_extract(hz_path, cells_proj, ["mean"], output="pandas")
        res_df["hard_zero_fraction"] = hz_stats["mean"].astype("float32")
    else:
        res_df["hard_zero_fraction"] = np.float32(0.0)

    # 8. Population Count (sum of people per pixel within cell)
    if "population" in raster_paths and raster_paths["population"]:
        pop_path = str(raster_paths["population"])
        with rasterio.open(pop_path) as pop_src:
            pop_crs = str(pop_src.crs)

        # Match CRS: use native EPSG:4326 cells if raster is in EPSG:4326 to preserve counts
        if "4326" in pop_crs:
            pop_features = cells_gdf
        elif pop_crs == str(cells_proj.crs):
            pop_features = cells_proj
        else:
            pop_features = cells_gdf.to_crs(pop_crs)

        pop_stats = exactextract.exact_extract(pop_path, pop_features, ["sum"], output="pandas")
        res_df["population"] = np.nan_to_num(pop_stats["sum"].to_numpy(), nan=0.0).round().astype("float32")
    else:
        res_df["population"] = np.float32(0.0)

    # 9. Baseline Water Fraction (Priority 1)
    if "baseline_water" in raster_paths and raster_paths["baseline_water"]:
        bw_path = str(raster_paths["baseline_water"])
        bw_stats = exactextract.exact_extract(bw_path, cells_proj, ["mean"], output="pandas")
        res_df["baseline_water_fraction"] = bw_stats["mean"].astype("float32")

    # 10. Permanent Water Fraction
    if "permanent_water" in raster_paths and raster_paths["permanent_water"]:
        pw_path = str(raster_paths["permanent_water"])
        pw_stats = exactextract.exact_extract(pw_path, cells_proj, ["mean"], output="pandas")
        res_df["permanent_water_fraction"] = pw_stats["mean"].astype("float32")

    # 11. JRC Water Occurrence Mean
    if "jrc_occurrence" in raster_paths and raster_paths["jrc_occurrence"]:
        occ_path = str(raster_paths["jrc_occurrence"])
        occ_stats = exactextract.exact_extract(occ_path, cells_proj, ["mean"], output="pandas")
        res_df["jrc_occurrence_mean"] = (occ_stats["mean"].astype("float32") / 100.0)

    # 12. Anomalous Inundation Frequency (model v0.2 input)
    if "anomalous_frequency" in raster_paths and raster_paths["anomalous_frequency"]:
        anom_path = str(raster_paths["anomalous_frequency"])
        anom_stats = exactextract.exact_extract(anom_path, cells_proj, ["mean"], output="pandas")
        res_df["mean_anomalous_frequency"] = anom_stats["mean"].astype("float32")

    # 13. Normalized HAND (floodplain formula input; NaN outside the eligible domain)
    if "hand_normalized" in raster_paths and raster_paths["hand_normalized"]:
        hn_path = str(raster_paths["hand_normalized"])
        hn_stats = exactextract.exact_extract(hn_path, cells_proj, ["mean"], output="pandas")
        res_df["mean_hand_normalized"] = hn_stats["mean"].astype("float32")

    return res_df


def apply_quality_flags(
    stats_gdf: gpd.GeoDataFrame,
    min_valid_fraction: float = DEFAULT_MIN_VALID_PIXEL_FRACTION,
    model_version: str = DEFAULT_MODEL_VERSION,
    hazard_type: str = DEFAULT_HAZARD_TYPE,
) -> gpd.GeoDataFrame:
    """Applies §10.3 quality control: flags low-coverage cells and adjusts confidence.

    Args:
        stats_gdf: GeoDataFrame output from compute_zonal_statistics.
        min_valid_fraction: Minimum valid pixel fraction threshold (default 0.5).
        model_version: Tag string for model version.
        hazard_type: Must be 'riverine_flood' (FR-3.16).

    Returns:
        GeoDataFrame with quality_flag, clean susceptibility, and confidence columns.
    """
    df = stats_gdf.copy()
    valid_frac = df["valid_pixel_fraction"].to_numpy()

    # Determine quality flag
    quality_flag = np.where(
        valid_frac >= min_valid_fraction,
        "full",
        np.where(valid_frac > 0.0, "low_coverage", "no_coverage"),
    )
    df["quality_flag"] = quality_flag

    # Clean susceptibility: fill NaNs with 0.0 for cells outside coverage
    mean_susc = df["mean_flood_susceptibility"].to_numpy()
    clean_susc = np.nan_to_num(mean_susc, nan=0.0)
    clean_susc = np.clip(clean_susc, 0.0, 1.0)
    df["susceptibility"] = clean_susc.astype("float32")

    # Quality-adjusted confidence
    # Full coverage: retain mean confidence * valid_frac
    # Low coverage (<0.5): scale down and cap at 0.3
    # No coverage: 0.0
    mean_conf = np.nan_to_num(df["mean_confidence"].to_numpy(), nan=0.0)
    adj_conf = mean_conf * valid_frac
    adj_conf = np.where(
        quality_flag == "full",
        adj_conf,
        np.where(quality_flag == "low_coverage", np.minimum(adj_conf, 0.3), 0.0),
    )
    adj_conf = np.clip(adj_conf, 0.0, 1.0)
    df["confidence"] = adj_conf.astype("float32")

    # Add metadata columns
    df["hazard_type"] = hazard_type
    df["model_version"] = model_version

    # Phase 2: Explicit Hazard Regime ('channel', 'char_belt', 'floodplain'), from JRC
    # long-term occurrence and raw SAR frequency. Without occurrence there is no basis
    # for the split, so the regime is left null rather than guessed.
    if "jrc_occurrence_mean" in df.columns:
        jrc_occ = np.nan_to_num(df["jrc_occurrence_mean"].to_numpy(), nan=0.0)
        sar_freq = np.nan_to_num(df["mean_inundation_frequency"].to_numpy(), nan=0.0)
        df["hazard_regime"] = classify_hazard_regime(
            jrc_occurrence_frac=jrc_occ,
            sar_frequency=sar_freq,
        )
        df = apply_regime_susceptibility(df)
    else:
        df["hazard_regime"] = None

    return df


def apply_regime_susceptibility(df: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Re-score each cell with the formula of its hazard regime (Phase 2b).

    - floodplain: ``w_H H_hand + w_A F_anom + w_T D_tributary`` (embankment-breach / backwater).
    - char_belt: ``w_I I_sar + w_B JRC_occurrence + w_M D_mainstem`` (erosion / instability).
    - channel: excluded; susceptibility 0.0, confidence 0.0 and ``quality_flag='channel_excluded'``
      so the cell is never read as measured terrestrial risk.

    A regime keeps the raster-derived v0.2 score when its inputs are missing (e.g. no HAND
    raster for floodplain), so older runs degrade rather than fail. Distance columns are
    optional; the combiners renormalise over the terms that are available. The raster score is
    preserved in ``mean_flood_susceptibility`` and the formula used in ``susceptibility_basis``.
    """
    out = df.copy()
    regime = out["hazard_regime"].to_numpy(dtype=object)
    susc = out["susceptibility"].to_numpy(dtype="float32").copy()
    conf = out["confidence"].to_numpy(dtype="float32").copy()
    flags = out["quality_flag"].to_numpy(dtype=object).copy()
    basis = np.full(len(out), "raster_v0.2", dtype=object)
    covered = flags != "no_coverage"

    def _col(name: str) -> np.ndarray | None:
        return out[name].to_numpy(dtype="float32") if name in out.columns else None

    is_fp = (regime == "floodplain") & covered
    hand_norm, anom = _col("mean_hand_normalized"), _col("mean_anomalous_frequency")
    if is_fp.any() and hand_norm is not None and anom is not None:
        dist_t = _col("dist_tributary_m")
        d_norm = normalize_inverse_distance(dist_t, DEFAULT_TRIBUTARY_DISTANCE_SCALE_M) if dist_t is not None else None
        fp = combine_susceptibility_floodplain(hand_norm, anom, d_norm, **DEFAULT_FLOODPLAIN_WEIGHTS)
        # Pixel-level hard-zero (HAND > 30 m / slope > 15 deg) scores exactly 0, so the cell mean
        # is scaled by the eligible share; HAND / anomalous means only see eligible-domain pixels.
        hz_col = _col("hard_zero_fraction")
        hz = np.nan_to_num(hz_col, nan=0.0) if hz_col is not None else 0.0
        fp = fp * (1.0 - np.clip(hz, 0.0, 1.0))
        use = is_fp & np.isfinite(fp)
        susc[use] = np.clip(fp[use], 0.0, 1.0)
        basis[use] = "floodplain_hand_anomalous_tributary" if d_norm is not None else "floodplain_hand_anomalous"

    is_char = (regime == "char_belt") & covered
    freq, occ = _col("mean_inundation_frequency"), _col("jrc_occurrence_mean")
    if is_char.any() and freq is not None and occ is not None:
        dist_m = _col("dist_mainstem_m")
        m_norm = normalize_inverse_distance(dist_m, DEFAULT_MAINSTEM_DISTANCE_SCALE_M) if dist_m is not None else None
        ch = combine_susceptibility_char(sar_instability_from_frequency(freq), occ, m_norm, **DEFAULT_CHAR_WEIGHTS)
        use = is_char & np.isfinite(ch)
        susc[use] = np.clip(ch[use], 0.0, 1.0)
        basis[use] = "char_erosion_instability_baseline_mainstem" if m_norm is not None else "char_erosion_instability_baseline"

    is_channel = (regime == "channel") & covered
    susc[is_channel] = 0.0
    conf[is_channel] = 0.0
    flags[is_channel] = CHANNEL_EXCLUDED_FLAG
    basis[is_channel] = CHANNEL_EXCLUDED_FLAG

    out["susceptibility"] = susc.astype("float32")
    out["confidence"] = conf.astype("float32")
    out["quality_flag"] = flags
    out["susceptibility_basis"] = basis
    return out


def export_parquet(stats_gdf: gpd.GeoDataFrame, output_path: Path | str) -> Path:
    """Exports the H3 zonal statistics GeoDataFrame to GeoParquet.

    Args:
        stats_gdf: Enriched GeoDataFrame in EPSG:4326.
        output_path: Target path for the .parquet file.

    Returns:
        Path to the saved GeoParquet file.
    """
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    stats_gdf.to_parquet(path, index=False)
    return path
