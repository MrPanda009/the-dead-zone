"""Senior Backend Deep-Dive Testing Suite for Route 1 Live Forecasts.

Tests:
1. Multi-District Ingestion & Sparse Persistence Behavior
2. API contract verification (GET /alerts/forecast)
3. National view behavior (GET /alerts/forecast without admin_id)
4. Interaction with GET /zones and GET /zones/{h3} (Cell Dossier)
5. Dry-weather vs Active-weather UI signals
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
import uuid

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from core.config import settings
from core.enums import ZoneClass
from api.services.alerts_service import AlertsService
from api.services.zones_service import ZonesService
from pipeline.hazard.forecast_config import FORECAST_DISTRICTS, get_forecast_district
from pipeline.jobs.run_district_forecast import run_district_forecast_cycle

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("test_route1_deep_dive")


def run_tests():
    engine = create_engine(settings.get_sqlalchemy_url(direct=True))
    
    with Session(engine) as session:
        print("\n" + "=" * 80)
        print("TEST 1: Run Wayanad Forecast Cycle with realistic weather artifact")
        print("=" * 80)
        
        cfg = get_forecast_district("wayanad")
        # Run forecast with low threshold to guarantee alerts for testing
        res = run_district_forecast_cycle(cfg, session, live=False, dry_run=False, min_mhi_threshold=0.40)
        print(f"Outcome: status={res.status}, total_cells={res.cells_total}, danger_cells={res.cells_above_threshold}, peak_mhi={res.max_mhi_fcst:.4f}")
        
        # Check actual database rows written
        hd_rows = session.execute(text("SELECT count(*) FROM hazard_dynamic WHERE forecast_cycle_at IS NOT NULL;")).scalar()
        mhi_fcst_rows = session.execute(text("SELECT count(*) FROM mhi_snapshot WHERE mhi_fcst IS NOT NULL;")).scalar()
        print(f"NeonDB rows written: hazard_dynamic={hd_rows}, mhi_snapshot={mhi_fcst_rows}")

        print("\n" + "=" * 80)
        print("TEST 2: Verify GET /alerts/forecast with admin=178 (District View)")
        print("=" * 80)
        alerts_service = AlertsService(session)
        district_alerts = alerts_service.get_forecast_alerts(horizon_hours=72, admin_id=178, min_mhi=0.40, limit=10)
        print(f"District Alerts Response: total_cells={district_alerts.total_forecast_cells}, exposed_pop={district_alerts.total_exposed_population}, items_count={len(district_alerts.items)}")
        if district_alerts.items:
            first = district_alerts.items[0]
            print(f"  Sample Item: h3={first.h3}, mhi_fcst={first.mhi_fcst}, dominant_hazard={first.dominant_hazard}, horizon={first.horizon_hours}h, valid_at={first.valid_at}")

        print("\n" + "=" * 80)
        print("TEST 3: Verify GET /alerts/forecast without admin (National View)")
        print("=" * 80)
        national_alerts = alerts_service.get_forecast_alerts(horizon_hours=72, admin_id=None, min_mhi=0.40, limit=10)
        print(f"National Alerts Response: total_cells={national_alerts.total_forecast_cells}, exposed_pop={national_alerts.total_exposed_population}, items_count={len(national_alerts.items)}")

        print("\n" + "=" * 80)
        print("TEST 4: Interaction with GET /zones (Map View)")
        print("=" * 80)
        zones_service = ZonesService(session)
        # Check zones for Wayanad bbox
        wayanad_bbox = "75.77,11.45,76.44,11.97"
        zones = zones_service.get_zones(bbox=wayanad_bbox, res=8, admin=178, limit=50)
        print(f"Zones returned: {len(zones)} cells.")
        
        # Check if any zone cell returned has forecast fields or if zone_class was modified
        zone_classes = {}
        for z in zones:
            cls = z.zone_class.value
            zone_classes[cls] = zone_classes.get(cls, 0) + 1
        print(f"Zone class distribution on Map view: {zone_classes}")

        print("\n" + "=" * 80)
        print("TEST 5: Interaction with GET /zones/{h3} (Cell Dossier View)")
        print("=" * 80)
        if district_alerts.items:
            target_h3 = district_alerts.items[0].h3
            cell_detail = zones_service.repo.get_cell_with_hazard_breakdown(int(district_alerts.items[0].h3_int))
            if cell_detail:
                c = cell_detail["cell"]
                print(f"Dossier Cell {target_h3}: valid_at={c.get('valid_at')}, mhi_static={c.get('mhi_static')}, mhi_live={c.get('mhi_live')}, mhi_fcst={c.get('mhi_fcst')}, zone_class={c.get('zone_class')}")

        # Cleanup after testing
        print("\n" + "=" * 80)
        print("CLEANUP: Restoring clean NeonDB state")
        print("=" * 80)
        session.execute(text("DELETE FROM hazard_dynamic WHERE forecast_cycle_at IS NOT NULL;"))
        session.execute(text("DELETE FROM mhi_snapshot WHERE mhi_fcst IS NOT NULL;"))
        session.execute(text("DELETE FROM pipeline_run WHERE run_type = 'forecast_pipeline';"))
        session.execute(text("DELETE FROM source_snapshot WHERE source_id = 'open_meteo_ecmwf';"))
        session.commit()
        print("NeonDB cleaned successfully.")


if __name__ == "__main__":
    run_tests()
