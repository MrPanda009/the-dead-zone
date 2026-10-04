"""Unit tests for SETU-DRR Live Forecast Trigger & Status Endpoints.

Verifies:
1. POST /alerts/forecast/trigger accepts targeted district and enqueues task with HTTP 202.
2. POST /alerts/forecast/trigger accepts national (all districts) trigger with HTTP 202.
3. POST /alerts/forecast/trigger rejects invalid district names with HTTP 400.
4. POST /alerts/forecast/trigger enforces debounce locking (HTTP 409 Conflict) when a run is active.
5. GET /alerts/forecast/status returns real-time district telemetry and scheduler health.
"""

from __future__ import annotations

import uuid
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.dependencies import require_serving_version
from pipeline.hazard.forecast_config import FORECAST_DISTRICTS


@pytest.fixture
def client():
    # Override require_serving_version for unit tests to bypass database readiness check
    mock_run_id = uuid.uuid4()
    app.dependency_overrides[require_serving_version] = lambda: mock_run_id
    yield TestClient(app)
    app.dependency_overrides.pop(require_serving_version, None)


class TestForecastTriggerEndpoints:
    """Test suite for on-demand trigger and observability endpoints."""

    @patch("api.routes.alerts._execute_forecast_background_task")
    def test_trigger_single_district_accepted(self, mock_task, client):
        """Verifies targeting an explicit valid district returns 202 Accepted."""
        # Ensure lock is clear
        import api.routes.alerts as alerts_mod
        alerts_mod._RUN_IN_PROGRESS = False

        res = client.post(
            "/alerts/forecast/trigger",
            json={"district": "wayanad", "live": False, "dry_run": True},
        )
        assert res.status_code == 202
        data = res.json()
        assert data["status"] == "ACCEPTED"
        assert data["target_districts"] == ["wayanad"]
        assert "run_id" in data
        assert "enqueued_at" in data

    @patch("api.routes.alerts._execute_forecast_background_task")
    def test_trigger_all_districts_accepted(self, mock_task, client):
        """Verifies omitting district triggers all 7 operational districts."""
        import api.routes.alerts as alerts_mod
        alerts_mod._RUN_IN_PROGRESS = False

        res = client.post(
            "/alerts/forecast/trigger",
            json={"live": False, "dry_run": True},
        )
        assert res.status_code == 202
        data = res.json()
        assert data["status"] == "ACCEPTED"
        assert len(data["target_districts"]) == len(FORECAST_DISTRICTS)
        assert "wayanad" in data["target_districts"]
        assert "barpeta" in data["target_districts"]
        assert "morena" in data["target_districts"]

    def test_trigger_invalid_district_rejected(self, client):
        """Verifies unknown district names return 400 Bad Request."""
        import api.routes.alerts as alerts_mod
        alerts_mod._RUN_IN_PROGRESS = False

        res = client.post(
            "/alerts/forecast/trigger",
            json={"district": "atlantis", "live": False},
        )
        assert res.status_code == 400
        assert "Unknown district 'atlantis'" in res.json()["detail"]

    def test_trigger_concurrency_lock_debounce(self, client):
        """Verifies HTTP 409 Conflict when a forecast run is currently executing."""
        import api.routes.alerts as alerts_mod
        from datetime import datetime, timezone
        alerts_mod._RUN_IN_PROGRESS = True
        alerts_mod._LAST_RUN_STARTED_AT = datetime.now(timezone.utc)

        try:
            res = client.post(
                "/alerts/forecast/trigger",
                json={"district": "wayanad"},
            )
            assert res.status_code == 409
            assert "currently executing" in res.json()["detail"]
        finally:
            alerts_mod._RUN_IN_PROGRESS = False

    def test_get_forecast_status(self, client):
        """Verifies GET /alerts/forecast/status exposes telemetry for all registered districts."""
        res = client.get("/alerts/forecast/status")
        assert res.status_code == 200
        data = res.json()

        assert "scheduler_enabled" in data
        assert "schedule_cron" in data
        assert "is_run_in_progress" in data
        assert "districts" in data
        assert isinstance(data["districts"], list)
        assert len(data["districts"]) == len(FORECAST_DISTRICTS)

        # Check district structure
        d_map = {d["key"]: d for d in data["districts"]}
        assert "wayanad" in d_map
        assert d_map["wayanad"]["admin_id"] == 178
        assert d_map["wayanad"]["lgd_code"] == 555
        assert d_map["wayanad"]["weather_state"] in ("CLEAR", "ALERT_ACTIVE", "STALE", "NO_DATA")
