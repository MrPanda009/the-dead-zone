"""CLI Job for Harvesting HOT / Overpass Infrastructure for SETU-DRR Districts.

Usage:
    uv run python -m pipeline.jobs.harvest_osm_infrastructure --district Wayanad
    uv run python -m pipeline.jobs.harvest_osm_infrastructure --lgd 555
    uv run python -m pipeline.jobs.harvest_osm_infrastructure --all
    uv run python -m pipeline.jobs.harvest_osm_infrastructure --district Wayanad --dry-run
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from core.config import settings
from pipeline.capacity.overpass_client import OverpassClient, OverpassConfig
from pipeline.capacity.osm_aggregator import OsmAggregator

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("setu_pipeline.jobs.harvest_osm")


def resolve_district_info(
    session: Session,
    district_name: Optional[str] = None,
    lgd_code: Optional[int] = None,
) -> list[dict[str, Any]]:
    """Resolves target district admin boundaries and bounding boxes from database."""
    query = """
        SELECT
            id,
            name,
            lgd_code,
            ST_YMin(geom::box2d) as min_lat,
            ST_XMin(geom::box2d) as min_lon,
            ST_YMax(geom::box2d) as max_lat,
            ST_XMax(geom::box2d) as max_lon
        FROM admin_boundary
        WHERE level = 'district'
    """
    params: dict[str, Any] = {}
    if district_name:
        query += " AND lower(name) = lower(:name)"
        params["name"] = district_name
    elif lgd_code:
        query += " AND lgd_code = :lgd"
        params["lgd"] = lgd_code

    query += " ORDER BY name ASC;"

    results = session.execute(text(query), params).mappings().all()
    return [dict(r) for r in results]


def run_district_harvest(
    session: Session,
    district: dict[str, Any],
    client: OverpassClient,
    dry_run: bool = False,
    mock_data: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Executes harvest and aggregation pipeline for one district."""
    admin_id = district["id"]
    name = district["name"]
    bbox = (
        float(district["min_lat"]),
        float(district["min_lon"]),
        float(district["max_lat"]),
        float(district["max_lon"]),
    )

    logger.info(
        f"Processing district '{name}' (ID: {admin_id}, LGD: {district.get('lgd_code')}) "
        f"with BBox: {bbox}"
    )

    # 1. Fetch raw Overpass data
    data, sha256, raw_bytes = client.query_district_infrastructure(bbox, mock_response=mock_data)
    elements = data.get("elements", [])
    logger.info(f"Retrieved {len(elements)} raw elements for district '{name}'.")

    if dry_run:
        logger.info(f"[DRY-RUN] Skipping database persistence for district '{name}'.")
        return {
            "district": name,
            "admin_id": admin_id,
            "elements_retrieved": len(elements),
            "sha256": sha256,
            "facilities_persisted": 0,
            "sites_updated": 0,
            "dry_run": True,
        }

    # 2. Register Source Snapshot for audit provenance
    snapshot_id = uuid.uuid4()
    now_utc = datetime.now(timezone.utc)
    session.execute(
        text("""
            INSERT INTO source_snapshot (
                id, source_id, retrieved_at, valid_at, uri, sha256, size_bytes, metadata
            ) VALUES (
                :id, 'HOT_OVERPASS_API', :now, :now, :uri, :sha256, :size_bytes, CAST(:metadata AS jsonb)
            );
        """),
        {
            "id": snapshot_id,
            "now": now_utc,
            "uri": f"overpass://district/{name.lower()}/bbox/{bbox[0]:.4f},{bbox[1]:.4f},{bbox[2]:.4f},{bbox[3]:.4f}",
            "sha256": sha256,
            "size_bytes": len(raw_bytes),
            "metadata": json.dumps({
                "district": name,
                "admin_id": admin_id,
                "lgd_code": district.get("lgd_code"),
                "elements_count": len(elements),
                "bbox": bbox,
            }),
        },
    )
    session.commit()
    logger.info(f"Registered SourceSnapshot {snapshot_id} (SHA-256: {sha256[:12]}...).")

    # 3. Classify and ingest facilities
    aggregator = OsmAggregator(session)
    facilities = aggregator.ingest_overpass_elements(
        elements,
        admin_id=admin_id,
        snapshot_id=snapshot_id,
    )

    # 4. Spatially screen candidate relocation sites in this district
    sites_updated = aggregator.update_district_candidate_sites(admin_id)

    return {
        "district": name,
        "admin_id": admin_id,
        "elements_retrieved": len(elements),
        "facilities_persisted": len(facilities),
        "sites_updated": sites_updated,
        "snapshot_id": str(snapshot_id),
        "sha256": sha256,
        "dry_run": False,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Harvest HOT/Overpass infrastructure data for SETU-DRR.")
    parser.add_argument("--district", help="District name (e.g., 'Wayanad', 'Kodagu', 'Barpeta')")
    parser.add_argument("--lgd", type=int, help="District LGD code (e.g., 555 for Wayanad)")
    parser.add_argument("--all", action="store_true", help="Harvest all pilot districts in database")
    parser.add_argument("--dry-run", action="store_true", help="Simulate without database writes")
    parser.add_argument("--mock-file", help="Path to local JSON mock file for testing/offline execution")
    parser.add_argument("--timeout", type=float, default=90.0, help="Overpass request timeout in seconds")

    args = parser.parse_args()

    if not args.district and not args.lgd and not args.all:
        parser.error("Specify --district, --lgd, or --all.")

    mock_data = None
    if args.mock_file:
        mock_path = Path(args.mock_file)
        if not mock_path.exists():
            logger.error(f"Mock file not found: {mock_path}")
            sys.exit(1)
        with open(mock_path, "r", encoding="utf-8") as f:
            mock_data = json.load(f)
        logger.info(f"Loaded mock Overpass payload from {mock_path}")

    engine = create_engine(settings.get_sqlalchemy_url(direct=True), pool_pre_ping=True)
    client = OverpassClient(config=OverpassConfig(timeout_seconds=args.timeout))

    with Session(engine) as session:
        districts = resolve_district_info(
            session,
            district_name=args.district if not args.all else None,
            lgd_code=args.lgd if not args.all else None,
        )

        if not districts:
            logger.error("No matching district boundaries found.")
            sys.exit(1)

        logger.info(f"Identified {len(districts)} district(s) for infrastructure harvesting.")
        summaries = []
        for d in districts:
            summary = run_district_harvest(
                session=session,
                district=d,
                client=client,
                dry_run=args.dry_run,
                mock_data=mock_data,
            )
            summaries.append(summary)

        print("\n=================== OSM HARVEST SUMMARY ===================")
        for s in summaries:
            print(f"District: {s['district']} (Admin ID: {s['admin_id']})")
            print(f"  Elements Retrieved:   {s['elements_retrieved']}")
            print(f"  Facilities Persisted: {s['facilities_persisted']}")
            print(f"  Candidate Sites Screened: {s['sites_updated']}")
            if not s["dry_run"]:
                print(f"  Source Snapshot ID:   {s.get('snapshot_id')}")
                print(f"  Snapshot SHA-256:     {s.get('sha256')[:16]}...")
            print("-" * 55)


if __name__ == "__main__":
    main()
