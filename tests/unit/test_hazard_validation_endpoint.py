"""Unit tests for the GET /hazard/validation endpoint."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)
PUBLISHED_METRICS = Path(__file__).resolve().parents[2] / "data/processed/flood_validation/barpeta/metrics.json"


def test_get_hazard_validation_barpeta_returns_validated_metrics():
    """GET /hazard/validation?admin=277 returns real Barpeta validation metrics."""
    response = client.get("/hazard/validation?admin=277")
    assert response.status_code == 200
    data = response.json()

    assert data["district"] == "barpeta"
    assert data["status"] == "validated"
    # The API serves the published v0.2 run; compare against what is on disk rather than
    # hard-coding numbers that change whenever the model is rebuilt.
    published = json.loads(PUBLISHED_METRICS.read_text(encoding="utf-8"))
    spatial = published["spatial"]
    assert data["model_version"] == "flood-susceptibility-v0.2" == published["model_version"]
    assert data["n_cells"] == spatial["n_cells"]
    assert data["roc_auc"] == pytest.approx(spatial["auc"]["model"])
    assert data["roc_auc_ci95"][0] < data["roc_auc"] < data["roc_auc_ci95"][1]
    assert data["evaluation_domain"]["hazard_regimes"] == ["floodplain"]
    assert data["imbalance"]["n_neg"] == spatial["imbalance"]["n_neg"]
    assert data["baseline_anomalous_frequency_auc"] is not None
    assert set(data["baseline_ci95"]) >= {"auc", "spearman", "auc_model_minus"}
    assert {r["regime"] for r in data["by_regime"]} == {"floodplain", "char_belt", "channel"}
    roles = {r["year"]: r["role"] for r in data["per_year"]}
    assert roles[2020] == "in_sample" and roles[2021] == "temporal_holdout"
    assert data["year_matched_year"] == 2020
    assert data["year_matched_auc"] == pytest.approx(spatial["year_matched"]["auc"])

    # CWC Stack year loss context
    losses = data["losses_context"]
    assert losses is not None
    assert losses["stack_year"] == 2020
    assert losses["percentile"] == 60.0
    assert losses["flag"] == "typical"

    # Caveat text enforces anti-overclaim
    assert "calibrated" not in data["caveat_text"].lower()
    assert "Agreement measures spatial alignment" in data["caveat_text"]


def test_get_hazard_validation_unvalidated_district_returns_not_validated():
    """Districts without a computed validation run report status='not_validated'."""
    response = client.get("/hazard/validation?admin=540")  # Kodagu
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "not_validated"
    assert "not yet been computed" in data["caveat_text"]
