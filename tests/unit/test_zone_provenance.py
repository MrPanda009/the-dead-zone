"""Zone provenance: model version and data quality come from stored versions, not constants."""

from datetime import datetime, timezone

from api.services.zones_service import ZonesService
from core.domain.provenance import classify_data_quality, pick_model_version
from core.enums import DataQuality

REAL = ("copernicus-census2011", "terrain-copernicus-v1.0")
SEED = ("demo-day2-v1", "baseline-v1")


def test_seed_fixture_is_synthetic():
    assert classify_data_quality(*SEED) == DataQuality.SYNTHETIC


def test_real_inputs_are_valid():
    assert classify_data_quality(*REAL) == DataQuality.VALID


def test_any_synthetic_input_taints_the_cell():
    assert classify_data_quality("demo-day2-v1", "terrain-copernicus-v1.0") == DataQuality.SYNTHETIC
    assert classify_data_quality("copernicus-census2011", "baseline-v1") == DataQuality.SYNTHETIC


def test_unknown_model_is_missing_not_valid():
    assert classify_data_quality("copernicus-census2011", None) == DataQuality.MISSING
    assert classify_data_quality("copernicus-census2011", "unknown") == DataQuality.MISSING


def test_pick_model_version_prefers_dominant_hazard():
    hazards = [
        {"hazard_type": "landslide", "model_version": "a"},
        {"hazard_type": "flash_flood", "model_version": "b"},
    ]
    assert pick_model_version(hazards, "flash_flood") == "b"
    assert pick_model_version(hazards, "storm_surge") == "a"
    assert pick_model_version([], "landslide") == "unknown"


class _FakeRepo:
    def __init__(self, cell, hazards):
        self._data = {"cell": cell, "hazards": hazards}

    def get_zone_by_h3(self, _h3_int):
        return self._data


def _detail(cell_overrides, hazards):
    cell = {
        "res": 8, "lon": 76.1, "lat": 11.5, "valid_at": datetime(2026, 9, 29, tzinfo=timezone.utc),
        "mhi_static": 0.7, "mhi_live": 0.7, "mhi_fcst": 0.7,
        "dominant_hazard": "flash_flood", "zone_class": "caution", "population": 10.0,
        "dataset_version": "copernicus-census2011", "factors": [], "model_version": None,
        **cell_overrides,
    }
    service = ZonesService.__new__(ZonesService)
    service.repo = _FakeRepo(cell, hazards)
    return service.get_zone_detail("8860064a15fffff")


HAZARDS = [{"hazard_type": "flash_flood", "susceptibility": 0.5, "confidence": 0.8,
            "model_version": "terrain-copernicus-v1.0"}]


def test_detail_reports_real_layer_as_valid_with_its_own_model():
    detail = _detail({}, HAZARDS)
    assert detail.model_version == "terrain-copernicus-v1.0"
    assert detail.data_quality == "valid"
    assert detail.explanation_model_version is None


def test_detail_keeps_explanation_model_separate_from_score_model():
    detail = _detail({"model_version": "baseline-v1", "factors": [{"feature": "slope_deg", "value": 1, "contribution": 0.1}]}, HAZARDS)
    assert detail.model_version == "terrain-copernicus-v1.0"
    assert detail.explanation_model_version == "baseline-v1"


def test_detail_for_seeded_cell_stays_synthetic():
    seeded = [{**HAZARDS[0], "model_version": "baseline-v1"}]
    detail = _detail({"dataset_version": "demo-day2-v1"}, seeded)
    assert (detail.model_version, detail.data_quality) == ("baseline-v1", "synthetic")
