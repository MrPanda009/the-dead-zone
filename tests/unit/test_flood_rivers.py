"""Unit tests for multi-axis river distance baselines (Phase 1)."""

import geopandas as gpd
import numpy as np
import pytest
from shapely.geometry import LineString, Point, box

from pipeline.hazard.flood.rivers import (
    RiverNetworkConfig,
    classify_river_network,
    compute_cell_river_distances,
)


def test_classify_river_network_synthetic():
    cfg = RiverNetworkConfig(
        mainstem_names=("Brahmaputra", "Brahmaputra River"),
    )

    lines = [
        LineString([(0, 0), (10, 0)]),    # Brahmaputra
        LineString([(0, 5), (10, 5)]),    # Beki
        LineString([(0, 8), (10, 8)]),    # Unknown stream
    ]
    osm_gdf = gpd.GeoDataFrame(
        {
            "name": ["Brahmaputra River", "Beki", "Unnamed Stream"],
            "waterway": ["river", "river", "stream"],
            "geometry": lines,
        },
        crs="EPSG:3857",
    )

    classified = classify_river_network(osm_gdf, hydrorivers=None, cfg=cfg, processing_crs="EPSG:3857")

    assert "river_class" in classified.columns
    classes = classified["river_class"].tolist()
    assert classes == ["mainstem", "tributary", "minor"]


def test_compute_cell_river_distances_synthetic():
    # Grid in EPSG:3857 (meters)
    # Mainstem line along y = 0
    mainstem = LineString([(0, 0), (1000, 0)])
    # Tributary line along y = 1000
    tributary = LineString([(0, 1000), (1000, 1000)])

    rivers = gpd.GeoDataFrame(
        {
            "river_class": ["mainstem", "tributary"],
            "name": ["Brahmaputra", "Beki"],
            "geometry": [mainstem, tributary],
        },
        crs="EPSG:3857",
    )

    # 3 cells at (500, 200), (500, 500), (500, 900)
    cells = gpd.GeoDataFrame(
        {
            "h3_hex": ["c1", "c2", "c3"],
            "centroid_lon": [0, 0, 0],
            "centroid_lat": [0, 0, 0],
            "geometry": [
                box(450, 150, 550, 250),   # centroid (500, 200)
                box(450, 450, 550, 550),   # centroid (500, 500)
                box(450, 850, 550, 950),   # centroid (500, 900)
            ],
        },
        crs="EPSG:3857",
    )

    dists = compute_cell_river_distances(cells, rivers, processing_crs="EPSG:3857")

    assert "dist_mainstem_m" in dists.columns
    assert "dist_tributary_m" in dists.columns
    assert "dist_any_river_m" in dists.columns

    # Cell 1: y=200 -> dist to mainstem = 200, dist to tributary = 800, any = 200
    assert dists.loc[0, "dist_mainstem_m"] == pytest.approx(200.0, abs=1.0)
    assert dists.loc[0, "dist_tributary_m"] == pytest.approx(800.0, abs=1.0)
    assert dists.loc[0, "dist_any_river_m"] == pytest.approx(200.0, abs=1.0)

    # Cell 3: y=900 -> dist to mainstem = 900, dist to tributary = 100, any = 100
    assert dists.loc[2, "dist_mainstem_m"] == pytest.approx(900.0, abs=1.0)
    assert dists.loc[2, "dist_tributary_m"] == pytest.approx(100.0, abs=1.0)
    assert dists.loc[2, "dist_any_river_m"] == pytest.approx(100.0, abs=1.0)
