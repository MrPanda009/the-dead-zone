"""Deterministic Pilot Data Seeding Module & Job (Day 2).

Populates PostgreSQL with deterministic spatial fixtures for:
1. Administrative Boundaries (Wayanad LGD 555, Kodagu LGD 540)
2. Pilot Habitations with Demographics, Vulnerability, and Loss History
3. H3 Res 7 and Res 8 Grids with Dasymetric Population
4. Static Multi-Hazard Scores, MHI Snapshots, and Heuristic Explanations
5. Pipeline Publication (PipelineRun + ServingVersion)

Idempotent: Safely cleans and reseeds pilot records without foreign key conflicts.
"""

import sys
import uuid
import random
import json
import logging
from datetime import datetime, date, timezone
from typing import Optional

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from core.config import settings
from core.enums import Hazard, Tier, ZoneClass
from core.h3_utils import (
    h3_to_int,
    h3_to_str,
    h3_to_centroid,
    h3_to_wkt_point,
    h3_to_wkt_polygon,
    h3_get_resolution,
)
from pipeline.grid.district_grid import (
    generate_h3_grid_for_bbox,
    dasymetrically_distribute_population,
    create_grid_cell_records,
)
from pipeline.hazard.terrain_zonal import TerrainHazardEvaluator
from core.domain.priority import (
    compute_priority_score,
    compute_time_decayed_loss,
    classify_triage_tier,
)
from core.domain.hazard import compute_mhi, classify_zone

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_pilot_data")

# Fixed random seed for 100% deterministic reproducibility
SEED = 42
DATASET_VERSION = "demo-day2-v1"
MODEL_VERSION = "baseline-v1"


# Pilot District Configurations
PILOT_DISTRICTS = [
    {
        "name": "Wayanad",
        "lgd_code": 555,
        "level": "district",
        "state": "Kerala",
        "population": 817420,
        "households": 194000,
        # Bounding box covering Wayanad [min_lon, min_lat, max_lon, max_lat]
        "bbox": (75.80, 11.50, 76.35, 11.90),
        "habitations": [
            {
                "name": "Chooralmala",
                "lgd_code": 627101,
                "lat": 11.5432,
                "lon": 76.1689,
                "population": 3840,
                "households": 860,
                "prz_overlap_pct": 82.5,
                "active_deformation": True,
                "fatal_3_monsoons": True,
                "v_demo": 0.58, "v_struct": 0.72, "v_access": 0.65, "v_econ": 0.60,
            },
            {
                "name": "Mundakkai",
                "lgd_code": 627102,
                "lat": 11.5365,
                "lon": 76.1795,
                "population": 2150,
                "households": 490,
                "prz_overlap_pct": 91.0,
                "active_deformation": True,
                "fatal_3_monsoons": True,
                "v_demo": 0.62, "v_struct": 0.81, "v_access": 0.74, "v_econ": 0.68,
            },
            {
                "name": "Meppadi",
                "lgd_code": 627103,
                "lat": 11.5512,
                "lon": 76.1284,
                "population": 14200,
                "households": 3200,
                "prz_overlap_pct": 35.0,
                "active_deformation": False,
                "fatal_3_monsoons": False,
                "v_demo": 0.44, "v_struct": 0.48, "v_access": 0.35, "v_econ": 0.42,
            },
            {
                "name": "Vythiri",
                "lgd_code": 627104,
                "lat": 11.5520,
                "lon": 76.0410,
                "population": 9800,
                "households": 2150,
                "prz_overlap_pct": 48.0,
                "active_deformation": False,
                "fatal_3_monsoons": False,
                "v_demo": 0.51, "v_struct": 0.55, "v_access": 0.42, "v_econ": 0.49,
            },
            {
                "name": "Kalpetta",
                "lgd_code": 627105,
                "lat": 11.6090,
                "lon": 76.0830,
                "population": 31500,
                "households": 7100,
                "prz_overlap_pct": 12.0,
                "active_deformation": False,
                "fatal_3_monsoons": False,
                "v_demo": 0.32, "v_struct": 0.30, "v_access": 0.20, "v_econ": 0.28,
            },
            {
                "name": "Mananthavady",
                "lgd_code": 627106,
                "lat": 11.8020,
                "lon": 76.0030,
                "population": 28400,
                "households": 6300,
                "prz_overlap_pct": 18.5,
                "active_deformation": False,
                "fatal_3_monsoons": False,
                "v_demo": 0.38, "v_struct": 0.36, "v_access": 0.25, "v_econ": 0.34,
            },
        ],
        "disasters": [
            {
                "ts": date(2024, 7, 30),
                "hazard_type": "landslide",
                "lat": 11.5390,
                "lon": 76.1720,
                "fatalities": 350,
                "injured": 280,
                "houses_damaged": 420,
                "severity": 1.0,
                "source": "GSI / Kerala SDMA",
                "source_ref": "Chooralmala-Mundakkai Debris Flow 2024",
            },
            {
                "ts": date(2019, 8, 8),
                "hazard_type": "landslide",
                "lat": 11.5280,
                "lon": 76.1450,
                "fatalities": 17,
                "injured": 12,
                "houses_damaged": 65,
                "severity": 0.75,
                "source": "Kerala SDMA",
                "source_ref": "Puthumala Landslide 2019",
            },
        ],
    },
    {
        "name": "Kodagu",
        "lgd_code": 540,
        "level": "district",
        "state": "Karnataka",
        "population": 554519,
        "households": 132000,
        # Bounding box covering Kodagu [min_lon, min_lat, max_lon, max_lat]
        "bbox": (75.50, 12.15, 76.05, 12.55),
        "habitations": [
            {
                "name": "Madikeri",
                "lgd_code": 628101,
                "lat": 12.4244,
                "lon": 75.7382,
                "population": 33400,
                "households": 7800,
                "prz_overlap_pct": 28.0,
                "active_deformation": False,
                "fatal_3_monsoons": False,
                "v_demo": 0.35, "v_struct": 0.40, "v_access": 0.22, "v_econ": 0.30,
            },
            {
                "name": "Bhagamandala",
                "lgd_code": 628102,
                "lat": 12.3912,
                "lon": 75.5312,
                "population": 4100,
                "households": 920,
                "prz_overlap_pct": 74.0,
                "active_deformation": True,
                "fatal_3_monsoons": False,
                "v_demo": 0.54, "v_struct": 0.68, "v_access": 0.62, "v_econ": 0.56,
            },
            {
                "name": "Somwarpet",
                "lgd_code": 628103,
                "lat": 12.5975,
                "lon": 75.8654,
                "population": 11200,
                "households": 2500,
                "prz_overlap_pct": 22.0,
                "active_deformation": False,
                "fatal_3_monsoons": False,
                "v_demo": 0.39, "v_struct": 0.42, "v_access": 0.30, "v_econ": 0.35,
            },
        ],
        "disasters": [
            {
                "ts": date(2018, 8, 17),
                "hazard_type": "landslide",
                "lat": 12.3950,
                "lon": 75.5400,
                "fatalities": 18,
                "injured": 35,
                "houses_damaged": 210,
                "severity": 0.85,
                "source": "Karnataka SDMA",
                "source_ref": "Kodagu Multi-Landslide Event 2018",
            },
        ],
    },
]


def seed_database(db_url: Optional[str] = None) -> None:
    """Executes deterministic seeding for pilot districts."""
    url = db_url or settings.get_sqlalchemy_url(direct=True)
    engine = create_engine(url, pool_pre_ping=True)
    rng = random.Random(SEED)
    evaluator = TerrainHazardEvaluator()

    logger.info("Connecting to database for Day 2 pilot seeding...")

    with engine.begin() as conn:
        # 1. Clean existing pilot data cleanly
        logger.info("Purging any existing seed data...")
        conn.execute(text("DELETE FROM serving_version WHERE dataset_name = 'default';"))
        conn.execute(text("DELETE FROM explanation;"))
        conn.execute(text("DELETE FROM mhi_snapshot;"))
        conn.execute(text("DELETE FROM hazard_static;"))
        conn.execute(text("DELETE FROM grid_cell;"))
        conn.execute(text("DELETE FROM habitation_risk;"))
        conn.execute(text("DELETE FROM vulnerability;"))
        conn.execute(text("DELETE FROM disaster_event;"))
        conn.execute(text("DELETE FROM habitation;"))
        conn.execute(text("DELETE FROM admin_boundary;"))
        conn.execute(text("DELETE FROM pipeline_run WHERE code_version = 'day2-seed';"))

        # 2. Record Pipeline Run
        pipeline_run_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        conn.execute(
            text("""
                INSERT INTO pipeline_run (
                    id, run_type, status, started_at, completed_at,
                    code_version, config_version, model_version
                ) VALUES (
                    :id, 'pilot_seed', 'COMPLETED', :now, :now,
                    'day2-seed', 'v1.0', :model_ver
                );
            """),
            {"id": pipeline_run_id, "now": now, "model_ver": MODEL_VERSION},
        )
        logger.info(f"Created PipelineRun: {pipeline_run_id}")

        # 3. Seed Each Pilot District
        total_cells_seeded = 0
        total_habitations_seeded = 0

        for dist in PILOT_DISTRICTS:
            name = dist["name"]
            lgd = dist["lgd_code"]
            min_lon, min_lat, max_lon, max_lat = dist["bbox"]

            logger.info(f"Seeding district {name} (LGD: {lgd})...")

            # District bounding box polygon
            wkt_geom = f"MULTIPOLYGON((({min_lon} {min_lat}, {max_lon} {min_lat}, {max_lon} {max_lat}, {min_lon} {max_lat}, {min_lon} {min_lat})))"
            wkt_bbox = f"POLYGON(({min_lon} {min_lat}, {max_lon} {min_lat}, {max_lon} {max_lat}, {min_lon} {max_lat}, {min_lon} {min_lat}))"

            admin_res = conn.execute(
                text("""
                    INSERT INTO admin_boundary (level, lgd_code, name, geom, bbox)
                    VALUES (:level, :lgd, :name, ST_GeomFromText(:geom, 4326), ST_GeomFromText(:bbox, 4326))
                    RETURNING id;
                """),
                {
                    "level": dist["level"],
                    "lgd": lgd,
                    "name": name,
                    "geom": wkt_geom,
                    "bbox": wkt_bbox,
                },
            )
            admin_id = admin_res.scalar_one()

            # Seed Disaster Events
            for d in dist["disasters"]:
                conn.execute(
                    text("""
                        INSERT INTO disaster_event (
                            ts, hazard_type, geom, fatalities, injured, houses_damaged, severity, source, source_ref
                        ) VALUES (
                            :ts, :hazard_type, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
                            :fatalities, :injured, :houses_damaged, :severity, :source, :source_ref
                        );
                    """),
                    {
                        "ts": d["ts"],
                        "hazard_type": d["hazard_type"],
                        "lat": d["lat"],
                        "lon": d["lon"],
                        "fatalities": d["fatalities"],
                        "injured": d["injured"],
                        "houses_damaged": d["houses_damaged"],
                        "severity": d["severity"],
                        "source": d["source"],
                        "source_ref": d["source_ref"],
                    },
                )

            # Seed Habitations & Vulnerability
            for h in dist["habitations"]:
                hab_res = conn.execute(
                    text("""
                        INSERT INTO habitation (
                            lgd_code, name, type, admin_id, geom_point, population, households
                        ) VALUES (
                            :lgd, :name, 'village', :admin_id,
                            ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
                            :pop, :hh
                        ) RETURNING id;
                    """),
                    {
                        "lgd": h["lgd_code"],
                        "name": h["name"],
                        "admin_id": admin_id,
                        "lon": h["lon"],
                        "lat": h["lat"],
                        "pop": h["population"],
                        "hh": h["households"],
                    },
                )
                hab_id = hab_res.scalar_one()
                total_habitations_seeded += 1

                # Vulnerability SoVI composite calculation
                v_demo = h["v_demo"]
                v_struct = h["v_struct"]
                v_access = h["v_access"]
                v_econ = h["v_econ"]
                v_index = round(0.25 * (v_demo + v_struct + v_access + v_econ), 4)

                v_meta = {
                    "source_dataset": "Census 2011 + High-Res Buildings",
                    "validation_status": "VALID",
                    "calculation_version": "sovi-v1.0",
                }
                conn.execute(
                    text("""
                        INSERT INTO vulnerability (
                            habitation_id, v_demographic, v_structural, v_access, v_economic, v_index, is_district_flat, metadata, pipeline_run_id
                        ) VALUES (
                            :hab_id, :v_demo, :v_struct, :v_access, :v_econ, :v_index, false, :meta, :pipeline_run_id
                        );
                    """),
                    {
                        "hab_id": hab_id,
                        "v_demo": v_demo,
                        "v_struct": v_struct,
                        "v_access": v_access,
                        "v_econ": v_econ,
                        "v_index": v_index,
                        "meta": json.dumps(v_meta),
                        "pipeline_run_id": pipeline_run_id,
                    },
                )

                # Seed Habitation Risk
                is_high_risk = h["name"] in ("Chooralmala", "Mundakkai", "Bhagamandala")
                hazard_intensity = 0.85 if is_high_risk else 0.45
                prz_overlap = float(h.get("prz_overlap_pct", 25.0))
                active_deform = bool(h.get("active_deformation", False))
                fatal_3 = bool(h.get("fatal_3_monsoons", False))
                decayed_loss = 1.0 if is_high_risk else 0.0

                ps = compute_priority_score(
                    hazard_intensity=hazard_intensity,
                    pop_fraction_in_prz=prz_overlap / 100.0,
                    vulnerability_index=v_index,
                    decayed_loss=decayed_loss,
                )
                caseload = round(ps * h["population"], 2)
                tier_val = classify_triage_tier(
                    has_prz_overlap=prz_overlap > 30.0,
                    active_deformation=active_deform,
                    fatal_event_last_3_monsoons=fatal_3,
                    pop_fraction_in_prz=prz_overlap / 100.0,
                    hazard_intensity=hazard_intensity,
                    priority_score=ps,
                )

                factors = [
                    {"factor": "PRZ Built-up Exposure", "weight": round(prz_overlap / 100.0, 2), "method": "heuristic"},
                    {"factor": "Structural Vulnerability", "weight": round(v_struct, 2), "method": "heuristic"},
                    {"factor": "Historical Loss Decay", "weight": round(decayed_loss, 2), "method": "heuristic"},
                ]

                conn.execute(
                    text("""
                        INSERT INTO habitation_risk (
                            habitation_id, admin_id, population, households, hazard_intensity,
                            prz_overlap_pct, decayed_loss, v_index, priority_score, caseload_score,
                            tier, triage_rationale, contributing_factors, dominant_hazard,
                            model_version, scoring_version, dataset_version, data_quality,
                            confidence, calculated_at, pipeline_run_id
                        ) VALUES (
                            :hab_id, :admin_id, :pop, :hh, :hazard_intensity,
                            :prz_overlap, :decayed_loss, :v_index, :ps, :caseload,
                            :tier, :rationale, :factors, 'landslide',
                            :model_version, 'priority-v1.0', :dataset_version, 'synthetic',
                            1.0, :now, :pipeline_run_id
                        );
                    """),
                    {
                        "hab_id": hab_id,
                        "admin_id": admin_id,
                        "pop": h["population"],
                        "hh": h["households"],
                        "hazard_intensity": hazard_intensity,
                        "prz_overlap": prz_overlap,
                        "decayed_loss": decayed_loss,
                        "v_index": v_index,
                        "ps": ps,
                        "caseload": caseload,
                        "tier": tier_val.value,
                        "rationale": f"Tier {tier_val.value} classified during pilot seed",
                        "factors": json.dumps(factors),
                        "model_version": MODEL_VERSION,
                        "dataset_version": DATASET_VERSION,
                        "now": now,
                        "pipeline_run_id": pipeline_run_id,
                    },
                )

            # Generate H3 Grid (Res 7 and Res 8)
            res7_cells = generate_h3_grid_for_bbox(min_lon, min_lat, max_lon, max_lat, resolution=7)
            res8_cells = generate_h3_grid_for_bbox(min_lon, min_lat, max_lon, max_lat, resolution=8)

            logger.info(f"Generated {len(res7_cells)} Res 7 cells and {len(res8_cells)} Res 8 cells for {name}.")

            # Deterministic built area assignment
            def get_built_area(cell_hex: str) -> float:
                h_int = h3_to_int(cell_hex)
                r = random.Random(h_int)
                # 35% of cells have settlements
                if r.random() < 0.35:
                    return round(r.uniform(2000.0, 45000.0), 2)
                return 0.0

            # Dasymetric population allocation
            res8_records = create_grid_cell_records(
                res8_cells,
                admin_id=admin_id,
                dataset_version=DATASET_VERSION,
                total_population=float(dist["population"]),
                built_area_generator=get_built_area,
            )

            res7_records = create_grid_cell_records(
                res7_cells,
                admin_id=admin_id,
                dataset_version=DATASET_VERSION,
                total_population=float(dist["population"]),
                built_area_generator=get_built_area,
            )

            district_grid_records = res8_records + res7_records

            # Batch prepare grid_cell, hazard_static, mhi_snapshot, and explanation
            grid_cell_rows = []
            hazard_static_rows = []
            mhi_snapshot_rows = []
            explanation_rows = []

            for cell_rec in district_grid_records:
                h_int = cell_rec["h3"]
                h_str = cell_rec["h3_str"]
                res_level = cell_rec["res"]
                lon, lat = h3_to_centroid(h_str)

                grid_cell_rows.append({
                    "h3": h_int,
                    "res": res_level,
                    "admin_id": admin_id,
                    "centroid": cell_rec["centroid"],
                    "geom": cell_rec["geom"],
                    "population": cell_rec["population"],
                    "built_area_m2": cell_rec["built_area_m2"],
                    "dataset_version": DATASET_VERSION,
                })

                # Deterministic synthetic terrain features based on cell location
                r_cell = random.Random(h_int)
                base_slope = 26.0 if (lon > 76.10 and lat < 11.65) else 14.0
                slope_deg = max(0.0, r_cell.gauss(base_slope, 8.0))
                elevation_m = r_cell.uniform(400.0, 1800.0)
                local_relief = r_cell.uniform(50.0, 450.0)
                dist_road = r_cell.uniform(50.0, 3000.0)
                hand = r_cell.uniform(1.0, 40.0)
                twi = r_cell.uniform(4.0, 14.0)

                eval_result = evaluator.evaluate_cell(
                    h3_int=h_int,
                    elevation_m=elevation_m,
                    slope_deg=slope_deg,
                    local_relief_m=local_relief,
                    dist_to_road_m=dist_road,
                    hand_m=hand,
                    twi=twi,
                    valid_at=now,
                )

                for hs in eval_result["hazard_statics"]:
                    hazard_static_rows.append({
                        "h3": hs["h3"],
                        "hazard_type": hs["hazard_type"],
                        "susceptibility": hs["susceptibility"],
                        "confidence": hs["confidence"],
                        "model_version": hs["model_version"],
                        "pipeline_run_id": pipeline_run_id,
                    })

                mhi_snap = eval_result["mhi_snapshot"]
                mhi_snapshot_rows.append({
                    "h3": mhi_snap["h3"],
                    "valid_at": mhi_snap["valid_at"],
                    "mhi_static": mhi_snap["mhi_static"],
                    "mhi_live": mhi_snap["mhi_live"],
                    "mhi_fcst": mhi_snap["mhi_fcst"],
                    "dominant_hazard": mhi_snap["dominant_hazard"],
                    "zone_class": mhi_snap["zone_class"],
                    "pipeline_run_id": pipeline_run_id,
                })

                expl = eval_result["explanation"]
                explanation_rows.append({
                    "h3": expl["h3"],
                    "model_version": expl["model_version"],
                    "factors": json.dumps(expl["factors"]),
                    "screening_grade": expl["screening_grade"],
                })

                total_cells_seeded += 1

            logger.info(f"Bulk inserting {len(grid_cell_rows)} cells for {name}...")

            # Chunked bulk insert
            def chunker(seq, size=1000):
                return (seq[pos:pos + size] for pos in range(0, len(seq), size))

            for chunk in chunker(grid_cell_rows):
                conn.execute(
                    text("""
                        INSERT INTO grid_cell (
                            h3, res, admin_id, centroid, geom, population, built_area_m2, dataset_version
                        ) VALUES (
                            :h3, :res, :admin_id,
                            ST_GeogFromText(:centroid),
                            ST_GeomFromText(:geom, 4326),
                            :population, :built_area_m2, :dataset_version
                        );
                    """),
                    chunk,
                )

            for chunk in chunker(hazard_static_rows):
                conn.execute(
                    text("""
                        INSERT INTO hazard_static (
                            h3, hazard_type, susceptibility, confidence, model_version, pipeline_run_id
                        ) VALUES (
                            :h3, :hazard_type, :susceptibility, :confidence, :model_version, :pipeline_run_id
                        );
                    """),
                    chunk,
                )

            for chunk in chunker(mhi_snapshot_rows):
                conn.execute(
                    text("""
                        INSERT INTO mhi_snapshot (
                            h3, valid_at, mhi_static, mhi_live, mhi_fcst, dominant_hazard, zone_class, pipeline_run_id
                        ) VALUES (
                            :h3, :valid_at, :mhi_static, :mhi_live, :mhi_fcst, :dominant_hazard, :zone_class, :pipeline_run_id
                        );
                    """),
                    chunk,
                )

            for chunk in chunker(explanation_rows):
                conn.execute(
                    text("""
                        INSERT INTO explanation (
                            h3, model_version, factors, screening_grade
                        ) VALUES (
                            :h3, :model_version, CAST(:factors AS jsonb), :screening_grade
                        );
                    """),
                    chunk,
                )

        # 4. Publish Dataset Version
        conn.execute(
            text("""
                INSERT INTO serving_version (dataset_name, pipeline_run_id, updated_at)
                VALUES ('default', :run_id, :now);
            """),
            {"run_id": pipeline_run_id, "now": now},
        )

    logger.info("Pilot data seeding completed successfully!")
    logger.info(f"Seeded: {len(PILOT_DISTRICTS)} districts, {total_habitations_seeded} habitations, {total_cells_seeded} H3 cells.")


if __name__ == "__main__":
    seed_database()
