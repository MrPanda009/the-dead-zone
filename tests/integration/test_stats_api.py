"""Integration tests for historical disaster statistics and comparison API endpoints."""

import pytest
from fastapi.testclient import TestClient
from api.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_list_states(client: TestClient) -> None:
    response = client.get("/stats/states")
    assert response.status_code == 200
    data = response.json()
    assert "states" in data
    assert len(data["states"]) > 0
    assert "Assam" in data["states"]


def test_get_disaster_stats_assam(client: TestClient) -> None:
    response = client.get("/stats/disasters?state=Assam&from_year=2014&to_year=2024")
    assert response.status_code == 200
    data = response.json()
    assert data["state_name"] == "Assam"
    assert len(data["loss_time_series"]) > 0
    assert len(data["ncrb_hazard_breakdown"]) > 0
    assert len(data["cwc_flood_history"]) > 0
    assert data["highway_damage"] is not None
    assert len(data["response_funding"]) > 0
    assert len(data["data_caveats"]) > 0


def test_compare_states(client: TestClient) -> None:
    response = client.get("/stats/disasters/comparison?state1=Assam&state2=Rajasthan")
    assert response.status_code == 200
    data = response.json()
    assert data["state1"]["state_name"] == "Assam"
    assert data["state2"]["state_name"] == "Rajasthan"
    assert len(data["insights"]) > 0


def test_list_case_studies(client: TestClient) -> None:
    response = client.get("/stats/case-studies")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert any(c["slug"] == "manipur-noney-landslide-2022" for c in data)
