"""End-to-End Senior Backend Engineering Test: Simulated Storm Ingestion and API Contract Audit.

Simulates a heavy monsoon storm (35 mm/h peak convective cell) over Wayanad,
executes Route 1 sparse forecast persistence into NeonDB, audits API endpoints:
1. GET /alerts/forecast?admin=178 (District View)
2. GET /alerts/forecast (National View)
3. GET /zones (Map View)
4. GET /zones/{h3} (Cell Dossier View)
5. Validates NeonDB row counts and cleans up afterward.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from core.config import settings
from core.enums import ZoneClass
from api.services.alerts_service import AlertsService
from api.services.zones_service import ZonesService
from pipeline.hazard.forecast_config import get_forecast_district
from pipeline.jobs.run_district_forecast import run_district_forecast_cycle

REPO_ROOT = Path(__file__).resolve().parents[1]


def create_storm_fixture() -> Path:
    """Creates a temporary storm payload with 35 mm/h peak over Southern Wayanad."""
    ref_file = REPO_ROOT / "data" / "raw" / "open_meteo" / "ecmwf_wayanad_20261003T111326Z.json"
    with open(ref_file, "r") as f:
        payload = json.load(f)

    # Inject heavy rainfall in the first 5 stations (South/Central Wayanad: Chooralmala, Meppadi, Vythiri)
    # between hour 12 and 18
    for i in range(min(5, len(payload))):
        precip = payload[i]["hourly"]["precipitation"]
        for h in range(12, 18):
            precip[h] = 35.0  # Intense cloudburst

    storm_path = REPO_ROOT / "data" / "raw" / "open_meteo" / "ecmwf_wayanad_reference.json"
    with open(storm_path, "w") as f:
        json.dump(payload, f)

    return storm_path


def test_storm_lifecycle():
    engine = create_engine(settings.get_sqlalchemy_url(direct=True))
    storm_fixture = create_storm_fixture()

    try:
        with Session(engine) as session:
            print("=" * 80)
            print("STAGE 1: Execute Route 1 Sparse Forecast with Monsoon Storm")
            print("=" * 80)
            cfg = get_forecast_district("wayanad")
            # Run forecast with storm fixture (live=False uses ecmwf_wayanad_reference.json)
            result = run_district_forecast_cycle(cfg, session, live=False, dry_run=False, min_mhi_threshold=0.45)
            print(f"Pipeline Result: {result.status}, total_cells={result.cells_total}, danger_cells={result.cells_above_threshold}, peak_mhi={result.max_mhi_fcst:.4f}")

            # Verify database rows
            hd_count = session.execute(text("SELECT count(*) FROM hazard_dynamic WHERE forecast_cycle_at IS NOT NULL;")).scalar()
            mhi_fcst_count = session.execute(text("SELECT count(*) FROM mhi_snapshot WHERE mhi_fcst IS NOT NULL;")).scalar()
            print(f"NeonDB rows written: hazard_dynamic={hd_count}, mhi_snapshot={mhi_fcst_count}")
            assert hd_count == result.cells_above_threshold, f"Expected {result.cells_above_threshold} hazard_dynamic rows, got {hd_count}"
            assert mhi_fcst_count == result.cells_above_threshold, f"Expected {result.cells_above_threshold} mhi_snapshot rows, got {mhi_fcst_count}"

            print("\n" + "=" * 80)
            print("STAGE 2: Test GET /alerts/forecast?admin=178 (District View)")
            print("=" * 80)
            alerts_service = AlertsService(session)
            resp = alerts_service.get_forecast_alerts(horizon_hours=72, admin_id=178, min_mhi=0.45, limit=20)
            print(f"District Alerts Response: total_cells={resp.total_forecast_cells}, exposed_population={resp.total_exposed_population}, items_count={len(resp.items)}")
            assert resp.total_forecast_cells == result.cells_above_threshold, "Alerts count mismatch!"
            
            top_alert = resp.items[0]
            print(f"  Top Alert: h3={top_alert.h3} (int={top_alert.h3_int}), MHI_fcst={top_alert.mhi_fcst}, dominant={top_alert.dominant_hazard}, valid_at={top_alert.valid_at}")

            print("\n" + "=" * 80)
            print("STAGE 3: Test GET /alerts/forecast without admin (National Operations View)")
            print("=" * 80)
            nat_resp = alerts_service.get_forecast_alerts(horizon_hours=72, admin_id=None, min_mhi=0.45, limit=20)
            print(f"National Alerts Response: total_cells={nat_resp.total_forecast_cells}, exposed_population={nat_resp.total_exposed_population}, items_count={len(nat_resp.items)}")

            print("\n" + "=" * 80)
            print("STAGE 4: Test GET /zones (Map View) Side Effects")
            print("=" * 80)
            zones_service = ZonesService(session)
            wayanad_bbox = "75.77,11.45,76.44,11.97"
            zones = zones_service.get_zones(bbox=wayanad_bbox, res=8, admin=178, limit=100)
            print(f"Retrieved {len(zones)} zone cells for Wayanad.")
            
            zone_classes = {}
            cells_with_fcst = 0
            for z in zones:
                c_str = z.zone_class.value
                zone_classes[c_str] = zone_classes.get(c_str, 0) + 1
                if z.mhi_fcst is not None:
                    cells_with_fcst += 1
            print(f"Zone classes on Map view: {zone_classes}")
            print(f"Cells carrying mhi_fcst on Map view: {cells_with_fcst}")

            print("\n" + "=" * 80)
            print("STAGE 5: Test GET /zones/{h3} (Cell Dossier View)")
            print("=" * 80)
            dossier = zones_service.get_zone_detail(top_alert.h3)
            print(f"Dossier for danger cell {top_alert.h3}:")
            print(f"  mhi_static: {dossier.mhi_static}, mhi_live: {dossier.mhi_live}, mhi_fcst: {dossier.mhi_fcst}")
            print(f"  dominant_hazard: {dossier.dominant_hazard}, zone_class: {dossier.zone_class}")
            print(f"  valid_at: {dossier.valid_at}")

            print("\n" + "=" * 80)
            print("ALL TEST STAGES COMPLETED SUCCESSFULLY!")
            print("=" * 80)

    finally:
        # Cleanup
        if storm_fixture.exists():
            storm_fixture.unlink()
        with Session(engine) as clean_session:
            clean_session.execute(text("DELETE FROM hazard_dynamic WHERE forecast_cycle_at IS NOT NULL;"))
            clean_session.execute(text("DELETE FROM mhi_snapshot WHERE mhi_fcst IS NOT NULL;"))
            clean_session.execute(text("DELETE FROM pipeline_run WHERE run_type = 'forecast_pipeline';"))
            clean_session.execute(text("DELETE FROM source_snapshot WHERE source_id = 'open_meteo_ecmwf';"))
            clean_session.commit()
            print("Cleanup complete: NeonDB restored to clean baseline.")


if __name__ == "__main__":
    test_storm_lifecycle()
