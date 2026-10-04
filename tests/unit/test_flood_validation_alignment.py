"""Unit tests for flood validation alignment, permanent-water masking, and baselines.

Tests the fixes to the spike script issues (§2.2, §3):
- Permanent water bodies are properly masked out.
- Un-imaged years are not counted as dry (frequency is normalized by coverage).
- Spatial blocking (H3 res-5) and regional partitioning are assigned.
- Comparative baselines are generated with dynamic parameters.
"""

from __future__ import annotations

import math
import h3
import numpy as np
import pandas as pd
import pytest

from pipeline.hazard.flood.validation.alignment import (
    filter_quality_flag,
    filter_permanent_water,
    compute_coverage_frequency,
    assign_h3_parent_blocks,
    assign_regional_split,
    build_alignment_dataset,
)
from pipeline.hazard.flood.validation.baselines import (
    compute_hand_baseline,
    compute_frequency_baseline,
    compute_distance_to_river_baseline,
    compute_random_baseline,
    attach_all_baselines,
)


def test_filter_quality_flag():
    """Only cells with the required quality flag are retained."""
    df = pd.DataFrame({
        "h3_hex": ["h1", "h2", "h3", "h4"],
        "quality_flag": ["full", "low_coverage", "full", "no_coverage"],
    })
    filtered, n_excluded = filter_quality_flag(df, required_flag="full")
    assert len(filtered) == 2
    assert n_excluded == 2
    assert list(filtered["h3_hex"]) == ["h1", "h3"]


def test_filter_permanent_water_excludes_river_cells():
    """Cells with permanent water fraction > threshold are dropped."""
    df = pd.DataFrame({
        "h3_hex": ["h_land", "h_wetland", "h_river", "h_lake"],
        "permanent_water_fraction": [0.00, 0.01, 0.05, 0.40],
    })
    # Filter at default 1% (0.01) threshold
    filtered_1pct, n_ex_1 = filter_permanent_water(
        df, water_fraction_col="permanent_water_fraction", max_water_fraction=0.01
    )
    assert len(filtered_1pct) == 2
    assert n_ex_1 == 2
    assert list(filtered_1pct["h3_hex"]) == ["h_land", "h_wetland"]

    # Filter at 5% sensitivity threshold
    filtered_5pct, n_ex_5 = filter_permanent_water(
        df, water_fraction_col="permanent_water_fraction", max_water_fraction=0.05
    )
    assert len(filtered_5pct) == 3
    assert n_ex_5 == 1
    assert "h_lake" not in filtered_5pct["h3_hex"].values


def test_coverage_frequency_unimaged_not_counted_as_dry():
    """Fixes spike bug: Un-imaged years must NOT count as dry."""
    # Cell 0: flooded in 4 of 5 imaged years -> 4/5 = 0.80 (NOT 4/17 = 0.235)
    # Cell 1: flooded in 0 of 5 imaged years -> 0/5 = 0.00
    # Cell 2: flooded in 0 of 0 imaged years -> NaN (un-imaged, not dry)
    # Cell 3: flooded in 2 of 2 imaged years -> 1.00
    flooded_years = np.array([4, 0, 0, 2])
    coverage_years = np.array([5, 5, 0, 2])

    freq = compute_coverage_frequency(flooded_years, coverage_years)

    assert freq[0] == pytest.approx(0.80)
    assert freq[1] == pytest.approx(0.00)
    assert math.isnan(freq[2])
    assert freq[3] == pytest.approx(1.00)


def test_assign_h3_parent_blocks():
    """Valid H3 res-8 cells are mapped to their corresponding H3 res-5 parents."""
    # Generate valid H3 res-8 cells in Barpeta region
    base_lat, base_lon = 26.32, 91.00
    res8_cell = h3.latlng_to_cell(base_lat, base_lon, 8)
    neighbors = list(h3.grid_disk(res8_cell, 1))[:3]

    df = pd.DataFrame({"h3_hex": neighbors})
    with_parents = assign_h3_parent_blocks(df, h3_col="h3_hex", parent_res=5)

    assert "parent_block" in with_parents.columns
    expected_parent = h3.cell_to_parent(res8_cell, 5)
    for p in with_parents["parent_block"]:
        assert p == expected_parent


def test_assign_regional_split():
    """Cells are partitioned into north and south groups by latitude."""
    df = pd.DataFrame({
        "centroid_lat": [26.1, 26.2, 26.4, 26.5],
        "val": [1, 2, 3, 4],
    })
    res = assign_regional_split(df, lat_col="centroid_lat")
    assert "region_block" in res.columns
    # Median is (26.2 + 26.4) / 2 = 26.3
    # 26.1, 26.2 -> south; 26.4, 26.5 -> north
    assert list(res["region_block"]) == ["south", "south", "north", "north"]


def test_build_alignment_dataset_full_flow():
    """Full alignment joins data, applies quality & water filters, and returns audit metadata."""
    model_df = pd.DataFrame({
        "h3_hex": ["c1", "c2", "c3", "c4"],
        "susceptibility": [0.8, 0.6, 0.4, 0.2],
        "quality_flag": ["full", "full", "low_coverage", "full"],
        "permanent_water_fraction": [0.0, 0.20, 0.0, 0.0],  # c2 has 20% water
        "centroid_lat": [26.4, 26.3, 26.2, 26.1],
    })
    ref_df = pd.DataFrame({
        "h3_hex": ["c1", "c2", "c3", "c4"],
        "ref_flood_fraction": [0.30, 0.50, 0.05, 0.00],
    })

    aligned, audit = build_alignment_dataset(
        model_df=model_df,
        ref_df=ref_df,
        h3_col="h3_hex",
        ref_flood_fraction_col="ref_flood_fraction",
        water_fraction_col="permanent_water_fraction",
        max_permanent_water_fraction=0.01,
        required_quality_flag="full",
        primary_threshold=0.10,
    )

    # c3 is dropped by quality_flag ('low_coverage')
    # c2 is dropped by permanent_water (0.20 > 0.01)
    # Remaining: c1, c4
    assert len(aligned) == 2
    assert audit["n_joined_cells"] == 4
    assert audit["n_evaluated_cells"] == 2
    assert audit["n_excluded_non_full"] == 1
    assert audit["n_excluded_permanent_water"] == 1

    # c1 has ref_flood_fraction=0.30 >= 0.10 -> 1
    # c4 has ref_flood_fraction=0.00 < 0.10 -> 0
    # Prevalence = 1 / 2 = 0.50
    assert audit["prevalence"] == pytest.approx(0.50)
    assert "y_true_binary" in aligned.columns
    assert list(aligned["y_true_binary"]) == [1, 0]


def test_hand_baseline_dynamic_percentile():
    """HAND baseline computes p99 dynamically, inverts HAND, and clips properly."""
    hand_raw = np.array([0.0, 5.0, 10.0, 20.0, 100.0])
    # With hand_p99 explicitly provided:
    score = compute_hand_baseline(hand_raw, hand_p99=20.0)
    # hand=0.0 -> score=1.0 (lowest elevation, highest risk)
    # hand=10.0 -> score=0.5
    # hand=20.0 -> score=0.0
    # hand=100.0 -> score=0.0 (clipped)
    assert score[0] == pytest.approx(1.0)
    assert score[2] == pytest.approx(0.5)
    assert score[3] == pytest.approx(0.0)
    assert score[4] == pytest.approx(0.0)

    # Dynamic p99 without hardcoded value:
    dyn_score = compute_hand_baseline(hand_raw)
    assert len(dyn_score) == len(hand_raw)
    assert np.all((dyn_score >= 0.0) & (dyn_score <= 1.0))


def test_distance_to_river_baseline():
    """Distance baseline awards higher scores to closer proximity."""
    distances = np.array([0.0, 500.0, 1000.0, 5000.0])
    score = compute_distance_to_river_baseline(distances, max_dist=1000.0)
    assert score[0] == pytest.approx(1.0)  # at river bank
    assert score[1] == pytest.approx(0.5)  # 500m
    assert score[2] == pytest.approx(0.0)  # 1000m
    assert score[3] == pytest.approx(0.0)  # clipped


def test_attach_all_baselines():
    """attach_all_baselines appends all baseline columns to DataFrame."""
    df = pd.DataFrame({
        "mean_hand": [2.0, 8.0, 15.0],
        "mean_inundation_frequency": [0.7, 0.4, 0.1],
        "dist_river": [100.0, 500.0, 1200.0],
    })
    out = attach_all_baselines(df, hand_col="mean_hand", freq_col="mean_inundation_frequency", dist_col="dist_river")
    for col in ["baseline_hand", "baseline_freq", "baseline_random", "baseline_distance_to_river"]:
        assert col in out.columns
        assert len(out[col]) == 3
        assert np.all((out[col] >= 0.0) & (out[col] <= 1.0))
