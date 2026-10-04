"""Unit tests for reference observation footprints and gridcode semantics (Phase 0)."""

import geopandas as gpd
import numpy as np
import pytest
from shapely.geometry import Polygon, box

from pipeline.hazard.flood.validation.footprints import (
    audit_gridcode_semantics,
    build_reference_footprint,
    cells_in_footprint,
)


def test_build_reference_footprint_convex():
    # Create simple polygon boxes
    p1 = box(10.0, 20.0, 10.5, 20.5)
    p2 = box(10.8, 20.8, 11.0, 21.0)
    gdf = gpd.GeoDataFrame({"geometry": [p1, p2]}, crs="EPSG:4326")

    hull = build_reference_footprint(gdf, processing_crs="EPSG:4326", buffer_m=0.0, method="convex_hull")
    assert hull.is_valid
    assert not hull.is_empty
    # Bounds should encompass p1 and p2
    minx, miny, maxx, maxy = hull.bounds
    assert minx <= 10.0 and maxx >= 11.0
    assert miny <= 20.0 and maxy >= 21.0


def test_cells_in_footprint_overlap():
    hull = box(0.0, 0.0, 10.0, 10.0)
    # Cell 1: completely inside
    c1 = box(1.0, 1.0, 2.0, 2.0)
    # Cell 2: half inside (width 2, height 1, overlap 1x1 = 50%)
    c2 = box(9.0, 1.0, 11.0, 2.0)
    # Cell 3: mostly outside (width 10, height 1, overlap 1x1 = 10%)
    c3 = box(9.0, 4.0, 19.0, 5.0)
    # Cell 4: completely outside
    c4 = box(20.0, 20.0, 25.0, 25.0)

    gdf_cells = gpd.GeoDataFrame(
        {"h3": ["c1", "c2", "c3", "c4"], "geometry": [c1, c2, c3, c4]},
        crs="EPSG:3857",
    )

    mask_50 = cells_in_footprint(gdf_cells, hull, min_overlap=0.50)
    assert mask_50.tolist() == [True, True, False, False]

    mask_80 = cells_in_footprint(gdf_cells, hull, min_overlap=0.80)
    assert mask_80.tolist() == [True, False, False, False]


def test_audit_gridcode_semantics_water():
    p = box(0.0, 0.0, 1.0, 1.0)
    gdf = gpd.GeoDataFrame({"gridcode": [1], "geometry": [p]}, crs="EPSG:3857")

    audit = audit_gridcode_semantics(gdf)
    assert audit["n_polygons"] == 1
    assert audit["gridcode_distribution"] == {"1": 1}
