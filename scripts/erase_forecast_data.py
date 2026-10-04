"""Script to safely erase all live forecast data from NeonDB.

Deletes:
1. All forecast snapshots in mhi_snapshot (362,304 rows belonging to forecast runs)
2. All forecast trigger records in hazard_dynamic (362,304 rows from open_meteo_ecmwf)
3. All forecast pipeline runs in pipeline_run (forecast_pipeline, forecast_ingest)
4. All open_meteo_ecmwf source snapshots in source_snapshot

Preserves:
- All static baseline grid cells and admin boundaries
- All static hazard rows in hazard_static and hazard_static_flood
- All static mhi_snapshot baseline rows (mhi_fcst is NULL)
- All habitations, candidate sites, allocations, OSM facilities, health facilities, and disaster stats.
"""

from __future__ import annotations

import argparse
import logging
from sqlalchemy import create_engine, text
from core.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("erase_forecast_data")


def erase_forecast_data(dry_run: bool = False) -> dict[str, int]:
    url = settings.get_sqlalchemy_url(direct=True)
    engine = create_engine(url)

    with engine.connect() as conn:
        trans = conn.begin()
        try:
            logger.info("Starting forecast data cleanup in NeonDB (dry_run=%s)...", dry_run)

            # 1. Delete forecast rows from mhi_snapshot
            mhi_del = conn.execute(text("""
                DELETE FROM mhi_snapshot
                WHERE mhi_fcst IS NOT NULL
                   OR pipeline_run_id IN (
                       SELECT id FROM pipeline_run WHERE run_type IN ('forecast_pipeline', 'forecast_ingest')
                   );
            """)).rowcount or 0
            logger.info("Deleted from mhi_snapshot: %d rows", mhi_del)

            # 2. Delete forecast rows from hazard_dynamic
            hd_del = conn.execute(text("""
                DELETE FROM hazard_dynamic
                WHERE forecast_cycle_at IS NOT NULL
                   OR source = 'open_meteo_ecmwf'
                   OR pipeline_run_id IN (
                       SELECT id FROM pipeline_run WHERE run_type IN ('forecast_pipeline', 'forecast_ingest')
                   );
            """)).rowcount or 0
            logger.info("Deleted from hazard_dynamic: %d rows", hd_del)

            # 3. Delete forecast runs from pipeline_run
            pr_del = conn.execute(text("""
                DELETE FROM pipeline_run
                WHERE run_type IN ('forecast_pipeline', 'forecast_ingest');
            """)).rowcount or 0
            logger.info("Deleted from pipeline_run: %d rows", pr_del)

            # 4. Delete Open-Meteo source snapshots
            ss_del = conn.execute(text("""
                DELETE FROM source_snapshot
                WHERE source_id = 'open_meteo_ecmwf';
            """)).rowcount or 0
            logger.info("Deleted from source_snapshot: %d rows", ss_del)

            # Verify surviving baseline
            surviving_mhi = conn.execute(text("SELECT count(*) FROM mhi_snapshot;")).scalar()
            surviving_hd = conn.execute(text("SELECT count(*) FROM hazard_dynamic;")).scalar()
            surviving_hs = conn.execute(text("SELECT count(*) FROM hazard_static;")).scalar()
            logger.info("Surviving mhi_snapshot baseline rows: %d", surviving_mhi)
            logger.info("Surviving hazard_dynamic rows: %d", surviving_hd)
            logger.info("Surviving hazard_static rows: %d", surviving_hs)

            if dry_run:
                trans.rollback()
                logger.info("[DRY-RUN] Changes rolled back successfully.")
            else:
                trans.commit()
                logger.info("Transaction committed successfully. NeonDB freed from obsolete forecast data!")

            return {
                "mhi_snapshot_deleted": mhi_del,
                "hazard_dynamic_deleted": hd_del,
                "pipeline_run_deleted": pr_del,
                "source_snapshot_deleted": ss_del,
                "surviving_mhi": surviving_mhi,
                "surviving_hd": surviving_hd,
                "surviving_hs": surviving_hs,
            }
        except Exception:
            trans.rollback()
            logger.exception("Error executing forecast cleanup. Rolled back.")
            raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Erase all live forecast data from NeonDB.")
    parser.add_argument("--dry-run", action="store_true", help="Simulate deletion without committing.")
    args = parser.parse_args()
    erase_forecast_data(dry_run=args.dry_run)
