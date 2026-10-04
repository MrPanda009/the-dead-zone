"""River network extraction and multi-axis distance baseline generation.

Extracts major river channels and tributaries from offline Geofabrik OSM PBF
and/or HydroRIVERS Asia dataset. Classifies rivers into:
- Mainstem: Brahmaputra River trunk channel
- Tributaries: Major named rivers and high-discharge channels (Beki, Pagladia, Kaldiya, Manas, etc.)
- Minor / Canals: Local drainage networks

Calculates per-H3-cell Euclidean distances in meters:
- dist_mainstem_m
- dist_tributary_m
- dist_any_river_m
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Sequence
import geopandas as gpd
import h3
import numpy as np
import pandas as pd
import pyogrio
from shapely.geometry import Polygon


@dataclass(frozen=True)
class RiverNetworkConfig:
    mainstem_names: tuple[str, ...] = (
        "Brahmaputra",
        "Brahmaputra River",
        "Chambal",
        "Chambal River",
        "Yamuna",
        "Yamuna River",
        "Kabini",
        "Kabini River",
        "Cauvery",
        "Kaveri",
    )
    include_canals: bool = False
    bbox_pad_deg: float = 0.15  # ~15km buffer to eliminate boundary edge truncation
    min_tributary_upstream_km2: float = 50.0  # HydroRIVERS catchment threshold for major tributary


def load_osm_rivers_from_pbf(
    pbf_path: str | Path,
    bbox_wgs84: Sequence[float],
    cfg: RiverNetworkConfig | None = None,
    processing_crs: str = "EPSG:32645",
) -> gpd.GeoDataFrame:
    """Extract river lines from offline Geofabrik OSM PBF within padded bounding box.

    Args:
        pbf_path: Path to regional .osm.pbf file.
        bbox_wgs84: [min_lon, min_lat, max_lon, max_lat]
        cfg: RiverNetworkConfig instance.
        processing_crs: Planar metric CRS.

    Returns:
        GeoDataFrame of river lines in EPSG:4326 and projected geometry.
    """
    cfg = cfg or RiverNetworkConfig()
    pad = cfg.bbox_pad_deg
    min_lon, min_lat, max_lon, max_lat = bbox_wgs84
    bbox_padded = (min_lon - pad, min_lat - pad, max_lon + pad, max_lat + pad)

    pbf = Path(pbf_path)
    if not pbf.exists():
        raise FileNotFoundError(f"OSM PBF file not found at: {pbf}")

    # Read lines layer with spatial filter directly via GDAL / pyogrio
    lines = pyogrio.read_dataframe(pbf, layer="lines", bbox=bbox_padded)
    if lines.empty or "waterway" not in lines.columns:
        return gpd.GeoDataFrame(columns=["name", "waterway", "geometry"], crs="EPSG:4326")

    # Filter waterways
    valid_waterways = ["river"]
    if cfg.include_canals:
        valid_waterways.append("canal")

    filtered = lines[lines["waterway"].isin(valid_waterways)].copy()
    if filtered.empty:
        return gpd.GeoDataFrame(columns=["name", "waterway", "geometry"], crs="EPSG:4326")

    filtered["name"] = filtered["name"].fillna("").astype(str)
    return filtered


def load_hydrorivers_reaches(
    shp_path: str | Path,
    bbox_wgs84: Sequence[float],
    cfg: RiverNetworkConfig | None = None,
    processing_crs: str = "EPSG:32645",
) -> gpd.GeoDataFrame:
    """Extract HydroRIVERS river reaches with upstream area and discharge metrics.

    Args:
        shp_path: Path to HydroRIVERS shapefile.
        bbox_wgs84: [min_lon, min_lat, max_lon, max_lat]
        cfg: RiverNetworkConfig instance.
        processing_crs: Planar metric CRS.

    Returns:
        GeoDataFrame of river reaches in EPSG:4326.
    """
    cfg = cfg or RiverNetworkConfig()
    pad = cfg.bbox_pad_deg
    min_lon, min_lat, max_lon, max_lat = bbox_wgs84
    bbox_padded = (min_lon - pad, min_lat - pad, max_lon + pad, max_lat + pad)

    shp = Path(shp_path)
    if not shp.exists():
        raise FileNotFoundError(f"HydroRIVERS shapefile not found at: {shp}")

    reaches = pyogrio.read_dataframe(shp, bbox=bbox_padded)
    return reaches


def classify_river_network(
    osm_rivers: gpd.GeoDataFrame,
    hydrorivers: gpd.GeoDataFrame | None = None,
    cfg: RiverNetworkConfig | None = None,
    processing_crs: str = "EPSG:32645",
) -> gpd.GeoDataFrame:
    """Classify river segments into 'mainstem', 'tributary', or 'minor'.

    Mainstem is identified via known name strings (e.g. Brahmaputra).
    Tributaries are identified by either:
    1. Having a known named river tag in OSM (non-mainstem)
    2. HydroRIVERS catchment area >= min_tributary_upstream_km2
    """
    cfg = cfg or RiverNetworkConfig()
    if osm_rivers.empty:
        return osm_rivers.copy()

    classified = osm_rivers.copy()
    classified["river_class"] = "minor"

    # 1. Mainstem identification
    is_mainstem = pd.Series(False, index=classified.index)
    for m_name in cfg.mainstem_names:
        is_mainstem |= classified["name"].str.contains(m_name, case=False, na=False)

    classified.loc[is_mainstem, "river_class"] = "mainstem"

    # 2. Tributary identification
    # Named rivers that are not mainstem are tributaries (excluding unnamed channels)
    name_clean = classified["name"].fillna("").str.strip()
    is_named_tributary = (
        (~is_mainstem)
        & (name_clean != "")
        & (~name_clean.str.lower().str.contains("unnamed", na=False))
    )
    classified.loc[is_named_tributary, "river_class"] = "tributary"

    # If HydroRIVERS is provided, augment unnamed channels with significant catchment area
    if hydrorivers is not None and not hydrorivers.empty:
        hr_proj = hydrorivers.to_crs(processing_crs)
        major_hr = hr_proj[hr_proj["UPLAND_SKM"] >= cfg.min_tributary_upstream_km2]
        if not major_hr.empty:
            cls_proj = classified.to_crs(processing_crs)
            # Find unnamed OSM rivers that run within 300m of a major HydroRIVERS reach
            unnamed_idx = classified[classified["river_class"] == "minor"].index
            if len(unnamed_idx) > 0:
                unnamed_geom = cls_proj.loc[unnamed_idx]
                joined = gpd.sjoin_nearest(unnamed_geom, major_hr, max_distance=300.0)
                if not joined.empty:
                    promoted_idx = joined.index.unique()
                    classified.loc[promoted_idx, "river_class"] = "tributary"

    return classified


def compute_cell_river_distances(
    cells_gdf: gpd.GeoDataFrame,
    classified_rivers: gpd.GeoDataFrame,
    processing_crs: str = "EPSG:32645",
) -> pd.DataFrame:
    """Calculate Euclidean distance from each H3 cell centroid to nearest river channel.

    Calculates:
    - dist_mainstem_m: Distance to Brahmaputra mainstem channel
    - dist_tributary_m: Distance to major tributary channel (Beki, Pagladia, etc.)
    - dist_any_river_m: Distance to any mapped river channel

    Args:
        cells_gdf: GeoDataFrame containing H3 cells.
        classified_rivers: Classified river lines.
        processing_crs: Target planar CRS.

    Returns:
        DataFrame with distance columns aligned to cells_gdf index.
    """
    if cells_gdf.empty:
        return pd.DataFrame(columns=["dist_mainstem_m", "dist_tributary_m", "dist_any_river_m"])

    # Project centroids
    cells_proj = cells_gdf.to_crs(processing_crs)
    centroids_gdf = gpd.GeoDataFrame(geometry=cells_proj.geometry.centroid, crs=processing_crs)

    rivers_proj = classified_rivers.to_crs(processing_crs)

    def _calc_dist(sub_rivers: gpd.GeoDataFrame) -> np.ndarray:
        if sub_rivers.empty:
            return np.full(len(centroids_gdf), np.nan)
        # sjoin_nearest to tree
        tree_g = gpd.GeoDataFrame(geometry=list(sub_rivers.geometry), crs=processing_crs)
        j = gpd.sjoin_nearest(centroids_gdf, tree_g, distance_col="d")
        # Keep minimum distance per original centroid index
        min_d = j.groupby(level=0)["d"].min()
        return min_d.reindex(centroids_gdf.index, fill_value=np.nan).to_numpy()

    mainstem = rivers_proj[rivers_proj["river_class"] == "mainstem"]
    tributaries = rivers_proj[rivers_proj["river_class"] == "tributary"]

    dist_mainstem = _calc_dist(mainstem)
    dist_tributary = _calc_dist(tributaries)
    dist_any = _calc_dist(rivers_proj)

    return pd.DataFrame({
        "dist_mainstem_m": dist_mainstem,
        "dist_tributary_m": dist_tributary,
        "dist_any_river_m": dist_any,
    }, index=cells_gdf.index)


# Locally staged river sources per district key: (OSM PBF, HydroRIVERS shapefile, mainstem names).
# Districts without an entry (or with missing files) simply score without the distance terms.
DISTRICT_RIVER_SOURCES: dict[str, tuple[str, str, tuple[str, ...]]] = {
    "barpeta": (
        "data/raw/osm/north-eastern-zone-latest.osm.pbf",
        "data/raw/hydrorivers/HydroRIVERS_v10_as_shp/HydroRIVERS_v10_as.shp",
        ("Brahmaputra", "Brahmaputra River"),
    ),
}


def load_cell_river_distances(
    cells_gdf: gpd.GeoDataFrame,
    district_key: str,
    bbox_wgs84: Sequence[float],
    processing_crs: str,
    repo_root: str | Path = ".",
    pbf_path: str | Path | None = None,
    hydrorivers_path: str | Path | None = None,
) -> pd.DataFrame | None:
    """Per-cell distance to mainstem / tributary / any river, or None when sources are unavailable.

    Never raises: the distance terms are optional scoring inputs, so a missing PBF or a parse
    failure is reported and the caller scores without them.
    """
    default = DISTRICT_RIVER_SOURCES.get(district_key)
    pbf = Path(pbf_path) if pbf_path else (Path(repo_root) / default[0] if default else None)
    hydro = Path(hydrorivers_path) if hydrorivers_path else (Path(repo_root) / default[1] if default else None)
    if pbf is None or not pbf.exists():
        print(f"  [rivers] No OSM PBF for '{district_key}'; river-distance terms skipped.")
        return None

    cfg = RiverNetworkConfig(mainstem_names=default[2]) if default else RiverNetworkConfig()
    try:
        osm = load_osm_rivers_from_pbf(pbf, bbox_wgs84, cfg=cfg, processing_crs=processing_crs)
        reaches = (
            load_hydrorivers_reaches(hydro, bbox_wgs84, cfg=cfg, processing_crs=processing_crs)
            if hydro is not None and hydro.exists() else None
        )
        classified = classify_river_network(osm, hydrorivers=reaches, cfg=cfg, processing_crs=processing_crs)
        if classified.empty:
            print("  [rivers] No river lines in AOI; river-distance terms skipped.")
            return None
        dists = compute_cell_river_distances(cells_gdf, classified, processing_crs=processing_crs)
    except Exception as exc:  # diagnostic input; never block the susceptibility build
        print(f"  [rivers] River-distance extraction failed ({exc}); terms skipped.")
        return None
    counts = {str(k): int(v) for k, v in classified["river_class"].value_counts().items()}
    print(f"  [rivers] Distances computed from {pbf.name}: {counts}")
    return dists
