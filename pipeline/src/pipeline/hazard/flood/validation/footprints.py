"""Reference observation footprints and coverage mask calculation.

Provides spatial footprint boundaries for historical reference events
(e.g. ISRO NDEM satellite swaths and multi-year coverage footprints)
to ensure that un-imaged regions or gaps in reference sensor footprints
are never erroneously evaluated as 'not flooded' / dry negatives.
"""

from __future__ import annotations

from typing import Any, Literal
import geopandas as gpd
import numpy as np
import shapely
from shapely.geometry import MultiPolygon, Polygon


def build_reference_footprint(
    gdf: gpd.GeoDataFrame,
    processing_crs: str,
    *,
    buffer_m: float = 2000.0,
    method: Literal["concave_hull", "convex_hull", "bbox"] = "concave_hull",
    ratio: float = 0.3,
) -> Polygon | MultiPolygon:
    """Build a spatial reference observation footprint geometry.

    Args:
        gdf: GeoDataFrame containing polygons imaged in the reference layer.
        processing_crs: Target planar CRS for distance buffer.
        buffer_m: Buffer distance in meters to bridge sensor swath gaps.
        method: Hull construction method ('concave_hull', 'convex_hull', or 'bbox').
        ratio: Concave hull ratio parameter (0.0 to 1.0).

    Returns:
        Projected Polygon or MultiPolygon representing the observation footprint.
    """
    if gdf.empty:
        return Polygon()

    if gdf.crs is None or str(gdf.crs).lower() != processing_crs.lower():
        proj = gdf.to_crs(processing_crs)
    else:
        proj = gdf

    # Dissolve valid geometries
    valid_geoms = [g for g in proj.geometry if g is not None and not g.is_empty]
    if not valid_geoms:
        return Polygon()

    union_geom = shapely.unary_union(valid_geoms)

    if method == "bbox":
        minx, miny, maxx, maxy = union_geom.bounds
        hull = shapely.box(minx, miny, maxx, maxy)
    elif method == "convex_hull":
        hull = union_geom.convex_hull
    else:  # concave_hull
        try:
            hull = shapely.concave_hull(union_geom, ratio=ratio)
        except Exception:
            hull = union_geom.convex_hull

    if buffer_m > 0:
        buffered = hull.buffer(buffer_m)
        return buffered

    return hull


def cells_in_footprint(
    cells_proj: gpd.GeoDataFrame,
    footprint: Polygon | MultiPolygon,
    min_overlap: float = 0.5,
) -> np.ndarray:
    """Determine which cells overlap sufficiently with the reference footprint.

    Args:
        cells_proj: GeoDataFrame of H3 cell polygons in projected CRS.
        footprint: Spatial boundary of sensor/reference observations.
        min_overlap: Minimum intersection area fraction to consider cell covered.

    Returns:
        1D boolean numpy array indicating covered cells.
    """
    if footprint is None or footprint.is_empty or len(cells_proj) == 0:
        return np.zeros(len(cells_proj), dtype=bool)

    # Fast spatial index bounding box rejection
    possible_matches = cells_proj.geometry.intersects(footprint)
    matched_indices = np.where(possible_matches)[0]

    covered = np.zeros(len(cells_proj), dtype=bool)
    if len(matched_indices) == 0:
        return covered

    # Check exact fractional overlap
    sub_geoms = cells_proj.geometry.iloc[matched_indices]
    inter_areas = sub_geoms.intersection(footprint).area
    cell_areas = sub_geoms.area
    fracs = inter_areas / np.maximum(cell_areas, 1e-6)

    valid_mask = fracs >= min_overlap
    covered[matched_indices[valid_mask]] = True
    return covered


def audit_gridcode_semantics(gdf: gpd.GeoDataFrame) -> dict[str, Any]:
    """Audit polygon counts and areas by gridcode value to verify flood semantics.

    Args:
        gdf: GeoDataFrame loaded from NDEM historical data.

    Returns:
        Dict detailing polygon counts, NaN count, and area summary.
    """
    if gdf.empty:
        return {"n_polygons": 0, "gridcode_distribution": {}}

    total = len(gdf)
    dist: dict[str, int] = {}
    if "gridcode" in gdf.columns:
        counts = gdf["gridcode"].value_counts(dropna=False).to_dict()
        for k, v in counts.items():
            key_str = "NaN" if (k is None or (isinstance(k, float) and np.isnan(k))) else str(k)
            dist[key_str] = int(v)

    return {
        "n_polygons": total,
        "gridcode_distribution": dist,
    }
