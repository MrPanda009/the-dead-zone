"""Unit tests for INDOFLOODS gauge validation and station gap audit (Phase 3)."""

from __future__ import annotations

import math
from pathlib import Path
import numpy as np
import pandas as pd
import pytest

from pipeline.hazard.flood.validation.config import get_validation_config
from pipeline.hazard.flood.validation.reference_indofloods import (
    load_indofloods_metadata,
    load_indofloods_events,
    find_stations_near_bbox,
    audit_district_gauge_gaps,
    verify_wayanad_gauge_locations,
    compute_reach_correlation,
    compute_scene_date_temporal_check,
)
from pipeline.hazard.flood.validation.checks_indofloods import run_indofloods_validation


REPO_ROOT = Path(__file__).resolve().parents[2]
INDOFLOODS_DIR = REPO_ROOT / "data/validation/indofloods"


def test_load_indofloods_metadata_and_events():
    """Verify that INDOFLOODS metadata and event catalogs load and link correctly."""
    meta_df = load_indofloods_metadata()
    events_df = load_indofloods_events()

    assert len(meta_df) == 214
    assert len(events_df) == 4548
    assert "GaugeID" in meta_df.columns
    assert "GaugeID" in events_df.columns

    # Verify GaugeID format
    assert meta_df["GaugeID"].iloc[0].startswith("INDOFLOODS-gauge-")
    assert events_df["GaugeID"].iloc[0].startswith("INDOFLOODS-gauge-")


def test_audit_district_gauge_gaps_assam():
    """Assam has 0 stations in INDOFLOODS — audit must document NO-GO status."""
    meta_df = load_indofloods_metadata()
    events_df = load_indofloods_events()

    audit = audit_district_gauge_gaps(
        district_key="barpeta",
        bbox_wgs84=[90.70, 26.05, 91.45, 26.75],
        state="Assam",
        meta_df=meta_df,
        events_df=events_df,
    )

    assert audit["status"] == "NO_GO_NO_STATIONS"
    assert audit["n_state_stations"] == 0
    assert audit["n_nearby_stations"] == 0
    assert "0 stations in Assam" in audit["finding_documentation"]


def test_audit_district_gauge_gaps_chambal():
    """Dholpur and Morena have Chambal stations, but 0 qualifying flood events."""
    meta_df = load_indofloods_metadata()
    events_df = load_indofloods_events()

    audit_dh = audit_district_gauge_gaps(
        district_key="dholpur",
        bbox_wgs84=[77.2272, 26.3569, 78.2708, 26.9513],
        state="Rajasthan",
        meta_df=meta_df,
        events_df=events_df,
    )

    assert audit_dh["status"] == "NO_GO_ZERO_QUALIFYING_EVENTS"
    assert audit_dh["n_nearby_stations"] > 0
    assert audit_dh["n_nearby_events"] == 0
    assert "0 qualifying flood events" in audit_dh["finding_documentation"]


def test_audit_district_gauge_gaps_rudraprayag():
    """Rudraprayag gauges exist (Karanprayag/Shrinagar) but have 0 qualifying flood events."""
    meta_df = load_indofloods_metadata()
    events_df = load_indofloods_events()

    audit = audit_district_gauge_gaps(
        district_key="rudraprayag",
        bbox_wgs84=[78.8, 30.2, 79.4, 30.8],
        state="Uttarakhand",
        meta_df=meta_df,
        events_df=events_df,
    )

    assert audit["status"] == "NO_GO_ZERO_QUALIFYING_EVENTS"
    assert audit["n_nearby_events"] == 0


def test_verify_wayanad_gauge_locations():
    """Verify station coordinates and catchment contexts for Kuttyadi and Nellithurai."""
    meta_df = load_indofloods_metadata()
    verif = verify_wayanad_gauge_locations(meta_df)

    assert "kuttyadi" in verif
    k = verif["kuttyadi"]
    assert k["gauge_id"] == "INDOFLOODS-gauge-403"
    assert k["latitude"] == pytest.approx(11.625)
    assert k["longitude"] == pytest.approx(75.7844)
    assert k["is_inside_wayanad_admin"] is False
    assert k["distance_to_wayanad_envelope_km"] > 10.0

    assert "nellithurai" in verif
    n = verif["nellithurai"]
    assert "Bhavani" in n["river"]
    assert n["is_inside_wayanad_admin"] is False


def test_reach_correlation_synthetic():
    """Reach check computes elevated scores near gauge vs background."""
    gauge_lat, gauge_lon = 11.625, 75.7844

    # 10 cells within 8 km (reach), 50 cells > 30 km (background)
    reach_lats = [gauge_lat + 0.005 * i for i in range(10)]
    reach_lons = [gauge_lon + 0.005 * i for i in range(10)]
    reach_scores = [0.8 + 0.01 * i for i in range(10)]  # high risk

    bg_lats = [gauge_lat + 0.5 + 0.01 * i for i in range(50)]
    bg_lons = [gauge_lon + 0.5 + 0.01 * i for i in range(50)]
    bg_scores = [0.2 + 0.01 * (i % 10) for i in range(50)]  # low risk

    df = pd.DataFrame({
        "centroid_lat": reach_lats + bg_lats,
        "centroid_lon": reach_lons + bg_lons,
        "susceptibility": reach_scores + bg_scores,
    })

    res = compute_reach_correlation(
        cells_df=df,
        gauge_lat=gauge_lat,
        gauge_lon=gauge_lon,
        reach_radius_km=15.0,
    )

    assert res["status"] == "evaluated"
    assert res["n_reach_cells"] == 10
    assert res["n_background_cells"] == 50
    assert res["mean_reach_score"] > res["mean_background_score"]
    assert res["p_value"] < 0.001


def test_scene_date_temporal_check_synthetic():
    """Mann-Whitney U correctly detects significant elevation during in-event scenes."""
    scene_dates = [
        "2020-07-01", "2020-07-10", "2020-07-20",  # In-event
        "2020-10-01", "2020-10-15", "2020-11-01", "2020-11-15", "2020-12-01",  # Out-of-event
    ]
    event_windows = [("2020-06-25", "2020-07-25")]

    # In-event has ~0.35 water fraction, out-of-event has ~0.04
    water_fractions = [0.35, 0.40, 0.32, 0.05, 0.04, 0.03, 0.04, 0.05]

    res = compute_scene_date_temporal_check(
        scene_dates=scene_dates,
        in_event_windows=event_windows,
        scene_water_fractions=water_fractions,
    )

    assert res["status"] == "evaluated"
    assert res["n_in_event_scenes"] == 3
    assert res["n_out_of_event_scenes"] == 5
    assert res["mean_in_event_fraction"] > res["mean_out_of_event_fraction"]
    assert res["p_value"] < 0.05


def test_run_indofloods_validation_end_to_end(tmp_path: Path):
    """End-to-end execution of INDOFLOODS gauge validation for Barpeta."""
    config = get_validation_config(
        district="barpeta",
        output_dir=str(tmp_path),
    )

    payload = run_indofloods_validation(config)

    assert payload["district"] == "barpeta"
    assert payload["status"] == "gap_documented"
    assert "gap_audit" in payload
    assert "temporal_scene_check" in payload
    assert payload["temporal_scene_check"]["n_in_event_scenes"] > 0

    # Verify output JSON was saved
    report_file = tmp_path / "gauges_report.json"
    assert report_file.exists()
