"""Pipeline Job for Ingesting Historical Disaster Losses and Statistics.

Normalizes state names and year formats from data.gov.in datasets (NCRB Forces of Nature,
MHA Rajya Sabha flood/loss series, CWC Flood Damages, Highway Damages, and NDRF/SDRF Allocations)
and persists them into PostgreSQL.

Usage:
    uv run python -m pipeline.jobs.ingest_disaster_history
    uv run python -m pipeline.jobs.ingest_disaster_history --dry-run
"""

from __future__ import annotations

import argparse
import json
import logging
import re
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Optional

from sqlalchemy import create_engine, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from core.config import settings
from core.db_models import (
    CwcFloodDamageRecord,
    DisasterCaseStudy,
    DisasterReliefAllocation,
    HighwayDisasterDamage,
    HistoricalDisasterLoss,
    NcrbNaturalHazardCasualty,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("setu_pipeline.jobs.ingest_disaster_history")

# Standardized state mapping to handle historical variations and typos in official reports
STATE_CANONICAL_MAP: dict[str, str] = {
    "andaman and nicobar islands": "Andaman & Nicobar Islands",
    "andaman & nicobar islands": "Andaman & Nicobar Islands",
    "andhra pradesh": "Andhra Pradesh",
    "arunachal pradesh": "Arunachal Pradesh",
    "assam": "Assam",
    "bihar": "Bihar",
    "chandigarh": "Chandigarh",
    "chhattisgarh": "Chhattisgarh",
    "chhatisgarh": "Chhattisgarh",
    "dadra and nagar haveli and daman and diu": "Dadra & Nagar Haveli and Daman & Diu",
    "daman and diu": "Daman & Diu",
    "delhi": "Delhi",
    "delhi ut": "Delhi",
    "goa": "Goa",
    "gujarat": "Gujarat",
    "haryana": "Haryana",
    "himachal pradesh": "Himachal Pradesh",
    "jammu and kashmir": "Jammu & Kashmir",
    "jammu & kashmir": "Jammu & Kashmir",
    "jharkhand": "Jharkhand",
    "karnataka": "Karnataka",
    "kerala": "Kerala",
    "ladakh": "Ladakh",
    "lakshadweep": "Lakshadweep",
    "madhya pradesh": "Madhya Pradesh",
    "maharashtra": "Maharashtra",
    "manipur": "Manipur",
    "meghalaya": "Meghalaya",
    "mizoram": "Mizoram",
    "nagaland": "Nagaland",
    "odisha": "Odisha",
    "orissa": "Odisha",
    "puducherry": "Puducherry",
    "pondicherry": "Puducherry",
    "punjab": "Punjab",
    "rajasthan": "Rajasthan",
    "sikkim": "Sikkim",
    "tamil nadu": "Tamil Nadu",
    "tamilnadu": "Tamil Nadu",
    "telangana": "Telangana",
    "telengana": "Telangana",
    "tripura": "Tripura",
    "uttarakhand": "Uttarakhand",
    "uttaranchal": "Uttarakhand",
    "uttar pradesh": "Uttar Pradesh",
    "west bengal": "West Bengal",
}


def normalize_state_name(raw: str) -> str:
    """Cleans punctuation, footnotes, asterisks and normalizes to standard TitleCase."""
    if not raw:
        return "Unknown"
    cleaned = re.sub(r"[\*\d#]+$", "", raw.strip()).strip()
    cleaned = re.sub(r"\s+", " ", cleaned).lower()
    return STATE_CANONICAL_MAP.get(cleaned, cleaned.title())


def parse_year_range(year_label: str) -> tuple[int, int]:
    """Parses year strings like '2014-15', '2019-2020', '2022' into (start_year, end_year)."""
    m = re.match(r"^(\d{4})(?:-(\d{2,4}))?$", year_label.strip())
    if not m:
        # Default fallback
        return (2020, 2020)
    start_yr = int(m.group(1))
    if not m.group(2):
        return (start_yr, start_yr)
    end_part = m.group(2)
    if len(end_part) == 2:
        end_yr = int(str(start_yr)[:2] + end_part)
    else:
        end_yr = int(end_part)
    return (start_yr, end_yr)


class DisasterHistoryIngestor:
    def __init__(self, session: Session, fixtures_dir: Optional[Path] = None) -> None:
        self.session = session
        if fixtures_dir is None:
            # Default to pipeline/data/fixtures/disaster_history
            repo_root = Path(__file__).resolve().parents[4]
            self.fixtures_dir = repo_root / "pipeline" / "data" / "fixtures" / "disaster_history"
        else:
            self.fixtures_dir = Path(fixtures_dir)

    def load_json(self, filename: str) -> list[dict[str, Any]]:
        path = self.fixtures_dir / filename
        if not path.exists():
            logger.warning("Fixture file not found: %s", path)
            return []
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def ingest_ncrb_casualties(self) -> int:
        records = self.load_json("ncrb_forces_of_nature.json")
        count = 0
        for r in records:
            state = normalize_state_name(r["state_name"])
            stmt = insert(NcrbNaturalHazardCasualty).values(
                state_name=state,
                calendar_year=int(r["calendar_year"]),
                landslide_deaths=int(r.get("landslide_deaths", 0)),
                flash_flood_deaths=int(r.get("flash_flood_deaths", 0)),
                flood_deaths=int(r.get("flood_deaths", 0)),
                cloudburst_deaths=int(r.get("cloudburst_deaths", 0)),
                cyclone_deaths=int(r.get("cyclone_deaths", 0)),
                avalanche_deaths=int(r.get("avalanche_deaths", 0)),
                lightning_deaths=int(r.get("lightning_deaths", 0)),
                cold_heat_wave_deaths=int(r.get("cold_heat_wave_deaths", 0)),
                other_nature_deaths=int(r.get("other_nature_deaths", 0)),
                total_deaths=int(r.get("total_deaths", 0)),
                source_uuid=r["source_uuid"],
            ).on_conflict_do_update(
                constraint="uq_state_year_ncrb",
                set_={
                    "landslide_deaths": int(r.get("landslide_deaths", 0)),
                    "flash_flood_deaths": int(r.get("flash_flood_deaths", 0)),
                    "flood_deaths": int(r.get("flood_deaths", 0)),
                    "lightning_deaths": int(r.get("lightning_deaths", 0)),
                    "total_deaths": int(r.get("total_deaths", 0)),
                },
            )
            self.session.execute(stmt)
            count += 1
        logger.info("Ingested/updated %d NCRB natural hazard casualty rows.", count)
        return count

    def ingest_mha_losses(self) -> int:
        records = self.load_json("mha_rajya_sabha_losses.json")
        count = 0
        for r in records:
            state = normalize_state_name(r["state_name"])
            start_yr, end_yr = parse_year_range(r["year_label"])
            stmt = insert(HistoricalDisasterLoss).values(
                state_name=state,
                year_label=r["year_label"],
                year_start=start_yr,
                year_end=end_yr,
                lives_lost=int(r.get("lives_lost", 0)),
                cattle_lost=int(r.get("cattle_lost", 0)),
                houses_damaged=int(r.get("houses_damaged", 0)),
                crop_area_affected_ha=float(r.get("crop_area_affected_ha", 0.0)),
                hazard_types_included=r.get("hazard_types_included", "Floods/Landslides"),
                source_uuid=r["source_uuid"],
                source_title=r["source_title"],
                source_ministry=r["source_ministry"],
                data_quality_notes=r.get("data_quality_notes"),
            ).on_conflict_do_update(
                constraint="uq_state_year_loss",
                set_={
                    "lives_lost": int(r.get("lives_lost", 0)),
                    "cattle_lost": int(r.get("cattle_lost", 0)),
                    "houses_damaged": int(r.get("houses_damaged", 0)),
                    "crop_area_affected_ha": float(r.get("crop_area_affected_ha", 0.0)),
                },
            )
            self.session.execute(stmt)
            count += 1
        logger.info("Ingested/updated %d MHA historical disaster loss rows.", count)
        return count

    def ingest_cwc_flood_damages(self) -> int:
        records = self.load_json("cwc_flood_damages.json")
        count = 0
        for r in records:
            state = normalize_state_name(r["state_name"])
            stmt = insert(CwcFloodDamageRecord).values(
                state_name=state,
                calendar_year=int(r["calendar_year"]),
                area_affected_mha=float(r.get("area_affected_mha", 0.0)),
                population_affected_m=float(r.get("population_affected_m", 0.0)),
                human_lives_lost=int(r.get("human_lives_lost", 0)),
                cattle_lost=int(r.get("cattle_lost", 0)),
                houses_damaged_count=int(r.get("houses_damaged_count", 0)),
                total_damage_crores=float(r.get("total_damage_crores", 0.0)),
                source_uuid=r["source_uuid"],
            ).on_conflict_do_update(
                constraint="uq_cwc_state_year",
                set_={
                    "area_affected_mha": float(r.get("area_affected_mha", 0.0)),
                    "population_affected_m": float(r.get("population_affected_m", 0.0)),
                    "human_lives_lost": int(r.get("human_lives_lost", 0)),
                    "total_damage_crores": float(r.get("total_damage_crores", 0.0)),
                },
            )
            self.session.execute(stmt)
            count += 1
        logger.info("Ingested/updated %d CWC flood damage rows.", count)
        return count

    def ingest_highway_damages(self) -> int:
        records = self.load_json("highway_damages.json")
        count = 0
        for r in records:
            state = normalize_state_name(r["state_name"])
            stmt = insert(HighwayDisasterDamage).values(
                state_name=state,
                reporting_period=r["reporting_period"],
                damaged_length_km=float(r["damaged_length_km"]),
                disaster_triggers=r.get("disaster_triggers", "Heavy Rain / Landslide / Flood"),
                source_uuid=r["source_uuid"],
            ).on_conflict_do_update(
                constraint="uq_highway_state_period",
                set_={
                    "damaged_length_km": float(r["damaged_length_km"]),
                    "disaster_triggers": r.get("disaster_triggers", "Heavy Rain / Landslide / Flood"),
                },
            )
            self.session.execute(stmt)
            count += 1
        logger.info("Ingested/updated %d Highway damage rows.", count)
        return count

    def ingest_relief_allocations(self) -> int:
        records = self.load_json("relief_allocations.json")
        count = 0
        for r in records:
            state = normalize_state_name(r["state_name"])
            stmt = insert(DisasterReliefAllocation).values(
                state_name=state,
                fiscal_year=r["fiscal_year"],
                sdrf_central_share_cr=float(r.get("sdrf_central_share_cr", 0.0)),
                sdrf_state_share_cr=float(r.get("sdrf_state_share_cr", 0.0)),
                ndrf_releases_cr=float(r.get("ndrf_releases_cr", 0.0)),
                lives_saved_count=int(r.get("lives_saved_count", 0)),
                source_uuid=r["source_uuid"],
            ).on_conflict_do_update(
                constraint="uq_relief_state_year",
                set_={
                    "sdrf_central_share_cr": float(r.get("sdrf_central_share_cr", 0.0)),
                    "ndrf_releases_cr": float(r.get("ndrf_releases_cr", 0.0)),
                    "lives_saved_count": int(r.get("lives_saved_count", 0)),
                },
            )
            self.session.execute(stmt)
            count += 1
        logger.info("Ingested/updated %d Disaster relief allocation rows.", count)
        return count

    def ingest_case_studies(self) -> int:
        records = self.load_json("case_studies.json")
        count = 0
        for r in records:
            stmt = insert(DisasterCaseStudy).values(
                slug=r["slug"],
                title=r["title"],
                disaster_type=r["disaster_type"],
                state_name=normalize_state_name(r["state_name"]),
                location_name=r["location_name"],
                event_date=date.fromisoformat(r["event_date"]),
                fatalities=int(r.get("fatalities", 0)),
                injured=int(r.get("injured", 0)),
                missing=int(r.get("missing", 0)),
                compensation_cr=float(r.get("compensation_cr", 0.0)),
                summary=r["summary"],
                geotechnical_context=r.get("geotechnical_context"),
                response_actions=r.get("response_actions", []),
                source_refs=r.get("source_refs", []),
            ).on_conflict_do_update(
                index_elements=["slug"],
                set_={
                    "fatalities": int(r.get("fatalities", 0)),
                    "injured": int(r.get("injured", 0)),
                    "compensation_cr": float(r.get("compensation_cr", 0.0)),
                    "summary": r["summary"],
                    "geotechnical_context": r.get("geotechnical_context"),
                },
            )
            self.session.execute(stmt)
            count += 1
        logger.info("Ingested/updated %d Disaster case study rows.", count)
        return count

    def run_all(self) -> dict[str, int]:
        ncrb = self.ingest_ncrb_casualties()
        mha = self.ingest_mha_losses()
        cwc = self.ingest_cwc_flood_damages()
        hwy = self.ingest_highway_damages()
        relief = self.ingest_relief_allocations()
        cases = self.ingest_case_studies()
        self.session.commit()
        return {
            "ncrb_casualties": ncrb,
            "mha_losses": mha,
            "cwc_flood_damages": cwc,
            "highway_damages": hwy,
            "relief_allocations": relief,
            "case_studies": cases,
        }


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest disaster history datasets into SETU-DRR.")
    parser.add_argument("--dry-run", action="store_true", help="Simulate ingestion without commit.")
    parser.add_argument("--fixtures-dir", default=None, help="Custom fixtures directory path.")
    args = parser.parse_args()

    engine = create_engine(settings.get_sqlalchemy_url(direct=True))
    with Session(engine) as session:
        ingestor = DisasterHistoryIngestor(session, fixtures_dir=args.fixtures_dir)
        if args.dry_run:
            logger.info("Running dry-run simulation...")
            # Run without commit
            summary = {
                "ncrb": len(ingestor.load_json("ncrb_forces_of_nature.json")),
                "mha": len(ingestor.load_json("mha_rajya_sabha_losses.json")),
                "cwc": len(ingestor.load_json("cwc_flood_damages.json")),
                "hwy": len(ingestor.load_json("highway_damages.json")),
                "relief": len(ingestor.load_json("relief_allocations.json")),
                "case_studies": len(ingestor.load_json("case_studies.json")),
            }
            logger.info("Dry run complete: %s", summary)
            return

        summary = ingestor.run_all()
        logger.info("Ingestion completed successfully: %s", summary)


if __name__ == "__main__":
    main()
