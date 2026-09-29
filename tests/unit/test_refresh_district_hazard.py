"""Pure-logic tests for the district derived-table refresh job (no database)."""

from core.enums import Hazard
from pipeline.jobs.refresh_district_hazard import _differs, _hazard_map

OLD = {
    "mhi_static": 0.9045,
    "mhi_live": 0.9045,
    "mhi_fcst": 0.9045,
    "dominant_hazard": "landslide",
    "zone_class": "permanent_red",
}


def test_hazard_map_groups_by_cell_and_skips_unknown_types():
    rows = [
        {"h3": 1, "hazard_type": "landslide", "susceptibility": 0.2},
        {"h3": 1, "hazard_type": "Flash_Flood ", "susceptibility": 0.5},
        {"h3": 1, "hazard_type": "meteor_strike", "susceptibility": 0.9},
        {"h3": 2, "hazard_type": "riverine_flood", "susceptibility": 0.4},
    ]
    result = _hazard_map(rows, "susceptibility")
    assert result[1] == {Hazard.LANDSLIDE: 0.2, Hazard.FLASH_FLOOD: 0.5}
    assert result[2] == {Hazard.RIVERINE_FLOOD: 0.4}


def test_hazard_map_keeps_first_row_per_hazard():
    rows = [
        {"h3": 1, "hazard_type": "landslide", "susceptibility": 0.2},
        {"h3": 1, "hazard_type": "landslide", "susceptibility": 0.9},
    ]
    assert _hazard_map(rows, "susceptibility")[1][Hazard.LANDSLIDE] == 0.2


def test_differs_is_false_for_identical_rows():
    assert _differs(OLD, dict(OLD)) is False


def test_differs_detects_each_derived_column():
    for key, value in (
        ("mhi_static", 0.5),
        ("mhi_live", 0.5),
        ("mhi_fcst", None),
        ("dominant_hazard", "flash_flood"),
        ("zone_class", "caution"),
    ):
        assert _differs(OLD, {**OLD, key: value}) is True, key


def test_differs_treats_null_to_value_as_change():
    assert _differs({**OLD, "mhi_fcst": None}, {**OLD, "mhi_fcst": 0.1}) is True
    assert _differs({**OLD, "mhi_fcst": None}, {**OLD, "mhi_fcst": None}) is False
