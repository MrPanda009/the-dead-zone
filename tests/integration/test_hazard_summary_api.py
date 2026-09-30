"""Integration tests for district-level hazard summary and decision prompt endpoint."""

import pytest
from fastapi.testclient import TestClient
from api.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_hazard_summary_unmodeled_kodagu(client: TestClient) -> None:
    """Kodagu has no riverine flood SAR model; returns not_computed."""
    response = client.get("/hazard/summary?admin=540")
    assert response.status_code == 200
    data = response.json()
    assert data["admin_name"] == "Kodagu"
    assert data["model_status"] == "not_computed"
    assert "not been computed" in data["officer_decision_prompt"]


def test_hazard_summary_unmodeled_wayanad(client: TestClient) -> None:
    """Wayanad has baseline/terrain hazard only; returns not_computed for SAR flood."""
    response = client.get("/hazard/summary?admin=555")
    assert response.status_code == 200
    data = response.json()
    assert data["admin_name"] == "Wayanad"
    assert data["model_status"] == "not_computed"
    assert "not been computed" in data["officer_decision_prompt"]


def test_hazard_summary_barpeta_or_absent(client: TestClient) -> None:
    """If Barpeta is present in the database, verifies computed SAR rollup; otherwise 404."""
    response = client.get("/hazard/summary?admin=277")
    if response.status_code == 200:
        data = response.json()
        assert data["admin_name"] == "Barpeta"
        assert data["model_status"] == "computed"
        assert "band_distribution" in data
        assert "officer_decision_prompt" in data
    else:
        assert response.status_code == 404


def test_hazard_summary_invalid_admin(client: TestClient) -> None:
    response = client.get("/hazard/summary?admin=999999")
    assert response.status_code == 404
