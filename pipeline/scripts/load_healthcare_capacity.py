"""Master CLI execution engine for healthcare dataset ingestion and carrying capacity calculation.

Features:
- Validates raw dataset integrity, coordinate bounds, and district boundary mappings (--check).
- Executes transactional dry-run with rollback to inspect spatial capacity stats (--dry-run).
- Atomically commits geocoded facilities and updates candidate relocation site capacities (--load).
- Supports single district (--district barpeta|wayanad|morena|dholpur) or all pilot districts (--district all).
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection, Engine

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(REPO_ROOT / "core" / "src") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "core" / "src"))
if str(REPO_ROOT / "pipeline" / "src") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "pipeline" / "src"))

from core.config import settings
from pipeline.capacity.health_evaluator import HealthCapacityEvaluator, HealthEvaluationReport
from pipeline.ingestion.fetch_healthcare import (
    CANONICAL_HEALTHCARE_URL,
    DEFAULT_HEALTHCARE_CSV,
    HealthFacilityRecord,
    download_healthcare_dataset,
    parse_and_filter_facilities,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("load_healthcare")

# Target pilot districts and their standard LGD codes
DISTRICT_CONFIGS: dict[str, dict[str, Any]] = {
    "barpeta": {"name": "Barpeta", "lgd": 303, "state": "Assam", "is_hilly": False},
    "wayanad": {"name": "Wayanad", "lgd": 555, "state": "Kerala", "is_hilly": True},
    "morena": {"name": "Morena", "lgd": 417, "state": "Madhya Pradesh", "is_hilly": False},
    "dholpur": {"name": "Dholpur", "lgd": 98, "state": "Rajasthan", "is_hilly": False},
}


class HealthcarePipelineManager:
    """Orchestrates download, validation, staging, and carrying capacity evaluation."""

    def __init__(
        self,
        engine: Optional[Engine] = None,
        csv_path: Optional[Path] = None,
        remote_url: str = CANONICAL_HEALTHCARE_URL,
        search_radius_m: float = 12000.0,
        utilization_pct: float = 0.75,
    ) -> None:
        self.engine = engine or create_engine(settings.get_sqlalchemy_url())
        self.csv_path = csv_path or DEFAULT_HEALTHCARE_CSV
        self.remote_url = remote_url
        self.evaluator = HealthCapacityEvaluator(
            search_radius_m=search_radius_m,
            catchment_utilization_pct=utilization_pct,
        )

    def ensure_dataset(self, force_download: bool = False) -> Path:
        """Ensures the healthcare CSV dataset is downloaded and present locally."""
        return download_healthcare_dataset(
            url=self.remote_url,
            dest_path=self.csv_path,
            force=force_download,
        )

    def get_admin_id(self, conn: Connection, district_slug: str) -> int:
        """Resolves district admin_boundary ID by LGD code or canonical name."""
        cfg = DISTRICT_CONFIGS[district_slug]
        lgd = cfg["lgd"]
        name = cfg["name"]

        res = conn.execute(
            text("SELECT id FROM admin_boundary WHERE lgd_code = :lgd LIMIT 1;"),
            {"lgd": lgd},
        ).scalar()
        if res is not None:
            return int(res)

        res = conn.execute(
            text("SELECT id FROM admin_boundary WHERE LOWER(name) = :name LIMIT 1;"),
            {"name": name.lower()},
        ).scalar()
        if res is not None:
            return int(res)

        raise ValueError(f"District '{name}' (LGD: {lgd}) not found in admin_boundary table.")

    def check(self, districts: list[str]) -> bool:
        """Validates raw dataset integrity, spatial coordinates, and admin matches."""
        logger.info("=== Pre-flight Healthcare Dataset Check ===")
        csv_file = self.ensure_dataset()
        if not csv_file.exists():
            logger.error("Dataset not found at %s", csv_file)
            return False

        logger.info("Dataset present: %s (%.2f MB)", csv_file, csv_file.stat().st_size / (1024 * 1024))
        all_ok = True

        with self.engine.connect() as conn:
            for slug in districts:
                if slug not in DISTRICT_CONFIGS:
                    logger.warning("Unknown district slug: %s", slug)
                    continue

                cfg = DISTRICT_CONFIGS[slug]
                try:
                    admin_id = self.get_admin_id(conn, slug)
                    logger.info("  [+] District '%s': resolved admin_id = %d", cfg["name"], admin_id)
                except Exception as e:
                    logger.error("  [-] District '%s': admin resolution failed (%s)", cfg["name"], e)
                    all_ok = False
                    continue

                facilities = parse_and_filter_facilities(csv_file, slug)
                if not facilities:
                    logger.warning("  [-] District '%s': 0 facilities extracted!", cfg["name"])
                    all_ok = False
                    continue

                lats = [f.latitude for f in facilities]
                lons = [f.longitude for f in facilities]
                logger.info(
                    "  [+] District '%s': %d valid facilities. Lat [%.4f, %.4f], Lon [%.4f, %.4f]",
                    cfg["name"],
                    len(facilities),
                    min(lats),
                    max(lats),
                    min(lons),
                    max(lons),
                )

                site_count = conn.execute(
                    text("SELECT count(*) FROM candidate_site WHERE admin_id = :aid"),
                    {"aid": admin_id},
                ).scalar() or 0
                logger.info("  [+] District '%s': %d candidate sites in database", cfg["name"], site_count)

        return all_ok

    def _ingest_district_facilities(
        self,
        conn: Connection,
        admin_id: int,
        import_run_id: Optional[uuid.UUID],
        facilities: list[HealthFacilityRecord],
    ) -> int:
        """Idempotently replaces health_facility records for the given admin_id."""
        conn.execute(
            text("DELETE FROM health_facility WHERE admin_id = :aid"),
            {"aid": admin_id},
        )

        insert_sql = text("""
            INSERT INTO health_facility (
                nin_n,
                admin_id,
                import_run_id,
                name,
                facility_type,
                ownership_type,
                subdistrict,
                location_type,
                address,
                geom,
                h3_res8,
                is_active,
                is_physical,
                norm_population,
                metadata
            )
            VALUES (
                :nin_n,
                :admin_id,
                :import_run_id,
                :name,
                :facility_type,
                :ownership_type,
                :subdistrict,
                :location_type,
                :address,
                ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
                :h3_res8,
                :is_active,
                :is_physical,
                :norm_population,
                CAST(:metadata AS jsonb)
            );
        """)

        params = [
            {
                "nin_n": f.nin_n,
                "admin_id": admin_id,
                "import_run_id": import_run_id,
                "name": f.name,
                "facility_type": f.facility_type,
                "ownership_type": f.ownership_type,
                "subdistrict": f.subdistrict,
                "location_type": f.location_type,
                "address": f.address,
                "lon": f.longitude,
                "lat": f.latitude,
                "h3_res8": f.h3_res8,
                "is_active": f.is_active,
                "is_physical": f.is_physical,
                "norm_population": f.norm_population,
                "metadata": json.dumps(f.metadata),
            }
            for f in facilities
        ]

        if params:
            conn.execute(insert_sql, params)

        return len(params)

    def run_district(
        self,
        conn: Connection,
        district_slug: str,
        import_run_id: Optional[uuid.UUID] = None,
        dry_run: bool = False,
    ) -> HealthEvaluationReport:
        """Ingests facilities and evaluates health carrying capacity for one district."""
        cfg = DISTRICT_CONFIGS[district_slug]
        admin_id = self.get_admin_id(conn, district_slug)
        csv_file = self.ensure_dataset()
        facilities = parse_and_filter_facilities(csv_file, district_slug)

        logger.info(
            "[%s] Staging %d facilities for %s (admin_id: %d)...",
            "DRY-RUN" if dry_run else "LOAD",
            len(facilities),
            cfg["name"],
            admin_id,
        )

        self._ingest_district_facilities(conn, admin_id, import_run_id, facilities)

        report = self.evaluator.evaluate_district(
            conn=conn,
            admin_id=admin_id,
            district_name=cfg["name"],
            dry_run=dry_run,
        )

        logger.info(
            "[%s] %s Results: %d sites | Mean CC_health: %.1f | Bottlenecks: %s",
            "DRY-RUN" if dry_run else "LOAD",
            cfg["name"],
            report.total_sites,
            report.mean_cc_health,
            dict(report.binding_counts),
        )
        return report

    def execute(
        self,
        districts: list[str],
        mode: str = "load",
    ) -> dict[str, HealthEvaluationReport]:
        """Executes ingestion pipeline across specified districts with transaction safety."""
        reports: dict[str, HealthEvaluationReport] = {}
        is_dry_run = mode == "dry-run"

        logger.info(
            "=== Starting Healthcare Pipeline (%s mode) for %d district(s) ===",
            mode.upper(),
            len(districts),
        )

        with self.engine.connect() as conn:
            with conn.begin() as trans:
                # Resolve or create pipeline run provenance record inside transaction
                now = datetime.now(timezone.utc)
                existing_run_id = conn.execute(
                    text("""
                        SELECT id FROM data_import_run
                        WHERE dataset_name = 'health_facilities_directory'
                          AND district_name = 'multi_district'
                          AND manifest_hash = 'mohw_nin_registry_v1'
                          AND status = 'PROMOTED'
                        LIMIT 1;
                    """)
                ).scalar()

                if existing_run_id:
                    import_run_id = existing_run_id
                    conn.execute(
                        text("UPDATE data_import_run SET promoted_at = :now WHERE id = :id;"),
                        {"id": import_run_id, "now": now},
                    )
                else:
                    import_run_id = uuid.uuid4()
                    conn.execute(
                        text("""
                            INSERT INTO data_import_run (
                                id, dataset_name, district_name, source_pipeline, pipeline_version,
                                status, manifest_hash, artifact_hashes, row_counts, promoted_at
                            ) VALUES (
                                :id, 'health_facilities_directory', 'multi_district', 'healthcare_pipeline_v1', 'v1.0',
                                'PROMOTED', 'mohw_nin_registry_v1', '{}'::jsonb, '{}'::jsonb, :now
                            );
                        """),
                        {"id": import_run_id, "now": now},
                    )


                for slug in districts:
                    if slug not in DISTRICT_CONFIGS:
                        logger.warning("Skipping unknown district slug: %s", slug)
                        continue

                    report = self.run_district(conn, slug, import_run_id=import_run_id, dry_run=is_dry_run)
                    reports[slug] = report

                if is_dry_run:
                    logger.info("[DRY-RUN] Explicitly rolling back transaction. No DB changes committed.")
                    trans.rollback()
                else:
                    logger.info("[LOAD] Committing transaction to database...")
                    trans.commit()

        logger.info("=== Pipeline Execution Complete ===")
        return reports


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest healthcare facilities and evaluate carrying capacity.")
    parser.add_argument(
        "--district",
        default="all",
        help="District slug: 'barpeta', 'wayanad', 'morena', 'dholpur', or 'all' (default: all)",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Run pre-flight checks on dataset, coordinates, and boundaries without touching DB",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run ingestion and capacity calculations in a transaction, printing stats, and roll back",
    )
    parser.add_argument(
        "--load",
        action="store_true",
        help="Execute ingestion and commit capacity updates to PostgreSQL/Neon DB",
    )
    parser.add_argument(
        "--file",
        type=Path,
        default=None,
        help="Custom path to local healthcare CSV file",
    )
    parser.add_argument(
        "--url",
        default=CANONICAL_HEALTHCARE_URL,
        help="Custom remote URL override for dataset",
    )
    parser.add_argument(
        "--radius-km",
        type=float,
        default=12.0,
        help="Spatial catchment radius in kilometers (default: 12.0)",
    )
    parser.add_argument(
        "--utilization",
        type=float,
        default=0.75,
        help="Baseline catchment utilization fraction 0.0-0.95 (default: 0.75)",
    )
    parser.add_argument(
        "--force-download",
        action="store_true",
        help="Force re-download of dataset even if cached locally",
    )

    args = parser.parse_args()

    if args.district.lower() == "all":
        target_districts = list(DISTRICT_CONFIGS.keys())
    else:
        slug = args.district.lower().strip()
        if slug not in DISTRICT_CONFIGS:
            print(f"Error: Unknown district '{slug}'. Supported: {list(DISTRICT_CONFIGS.keys())}")
            sys.exit(1)
        target_districts = [slug]

    manager = HealthcarePipelineManager(
        csv_path=args.file,
        remote_url=args.url,
        search_radius_m=args.radius_km * 1000.0,
        utilization_pct=args.utilization,
    )

    if args.force_download:
        manager.ensure_dataset(force_download=True)

    if args.check:
        ok = manager.check(target_districts)
        sys.exit(0 if ok else 1)
    elif args.dry_run:
        manager.execute(target_districts, mode="dry-run")
    elif args.load:
        manager.execute(target_districts, mode="load")
    else:
        print("Please specify an action: --check, --dry-run, or --load")
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
