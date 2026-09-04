"""Integration tests for Dynamic Alerts, Forecasts & Relocation Allocation APIs (Day 6).

Endpoints tested:
- GET /alerts/active
- GET /alerts/forecast
- POST /plan/allocate
"""

import pytest
from fastapi.testclient import TestClient
from api.main import app
from core.enums import Tier


@pytest.fixture
def client():
    return TestClient(app)


class TestDay6AlertsAndAllocationAPI:
    """Integration test suite for Day 6 dynamic serving and allocation endpoints."""

    def test_get_active_alerts_structure(self, client):
        res = client.get("/alerts/active?limit=10")
        assert res.status_code == 200
        data = res.json()

        assert "total_active_cells" in data
        assert "total_exposed_population" in data
        assert "issued_at" in data
        assert "items" in data
        assert isinstance(data["items"], list)

        if data["total_active_cells"] > 0 and len(data["items"]) > 0:
            item = data["items"][0]
            assert "h3" in item
            assert "mhi_live" in item
            assert item["mhi_live"] >= 0.75
            assert "mhi_static" in item
            assert item["mhi_static"] < 0.75
            assert "dominant_hazard" in item
            assert "centroid" in item
            assert len(item["centroid"]) == 2
            assert "screening_grade" in item

    def test_get_forecast_alerts_structure_and_72h_validation(self, client):
        # 1. Valid 48h horizon query
        res = client.get("/alerts/forecast?horizon=48&limit=10")
        assert res.status_code == 200
        data = res.json()

        assert "total_forecast_cells" in data
        assert "total_exposed_population" in data
        assert "issuing_model" in data
        assert data["issuing_model"] is None or isinstance(data["issuing_model"], str)
        assert data["horizon_hours"] == 48
        assert "items" in data

        if data["total_forecast_cells"] > 0 and len(data["items"]) > 0:
            item = data["items"][0]
            assert "h3" in item
            assert "mhi_fcst" in item
            assert item["mhi_fcst"] >= 0.75
            assert "mhi_static" in item
            assert item["mhi_static"] < 0.75
            assert "horizon_hours" in item
            assert item["horizon_hours"] == 48
            assert "screening_grade" in item

        # 2. Reject horizon > 72h (FR-3.12 constraint)
        res_invalid_high = client.get("/alerts/forecast?horizon=96")
        assert res_invalid_high.status_code == 422

        # 3. Reject horizon < 1h
        res_invalid_low = client.get("/alerts/forecast?horizon=0")
        assert res_invalid_low.status_code == 422

    def test_post_plan_allocate_success(self, client):
        payload = {
            "max_search_radius_km": 25.0,
            "target_tiers": ["immediate", "short_term"],
            "allow_group_splits": True,
            "distance_penalty_weight": 1.0,
        }
        res = client.post("/plan/allocate", json=payload)
        assert res.status_code == 200
        data = res.json()

        assert "allocation_run_id" in data
        assert "status" in data
        assert data["status"] == "COMPLETED"
        assert "total_demand_households" in data
        assert "total_relocated_households" in data
        assert "unmet_demand_households" in data
        assert "solver_latency_ms" in data
        assert "assignments" in data
        assert "group_split_warnings" in data
        assert "screening_grade" in data

        # Validate assignment schemas if habitations were allocated
        if data["total_relocated_households"] > 0 and len(data["assignments"]) > 0:
            a = data["assignments"][0]
            assert "habitation_id" in a
            assert "habitation_name" in a
            assert "site_id" in a
            assert "site_distance_km" in a
            assert "households" in a
            assert a["households"] > 0
            assert "tier" in a
            assert "priority_score" in a
            assert "site_suitability" in a
            assert "has_group_split" in a

    def test_post_plan_allocate_invalid_radius_rejection(self, client):
        # Negative search radius
        res = client.post("/plan/allocate", json={"max_search_radius_km": -5.0})
        assert res.status_code == 422

        # Excessively large search radius (> 100km)
        res2 = client.post("/plan/allocate", json={"max_search_radius_km": 500.0})
        assert res2.status_code == 422

    def test_post_plan_allocate_empty_tiers_rejection(self, client):
        res = client.post("/plan/allocate", json={"target_tiers": []})
        assert res.status_code in (400, 422)

    def test_security_sql_injection_defense(self, client):
        # Query active alerts with malicious SQL payload
        res = client.get("/alerts/active?hazard=landslide'%20OR%20'1'='1")
        assert res.status_code == 200
        data = res.json()
        # Should return 0 records cleanly rather than dumping the database
        assert data["total_active_cells"] == 0
