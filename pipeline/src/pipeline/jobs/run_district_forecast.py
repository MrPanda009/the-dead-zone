"""Unified Multi-District Live Forecast Pipeline (Route 1: Sparse Peak-Alert Architecture).

Runs live 72-hour ECMWF weather forecasts across any or all registered districts
(Wayanad, Kodagu, Barpeta, Rudraprayag, Srinagar, Dholpur, Morena):
  1. Dynamically generates spatial sample coordinates across the district boundary.
  2. Ingests ECMWF IFS HRES hourly precipitation in a single HTTP batch request.
  3. Maps H3 Res-8 cells to nearest forecast coordinates using in-memory KD-Tree.
  4. Calculates 72-hour rolling rainfall intensity and peak trigger envelopes in NumPy.
  5. Evaluates peak MHI against the district's active static hazard baseline.
  6. SPARSE NEON PROTECTION: Persists ONLY the peak danger cells (MHI_peak >= 0.45)
     as a single peak record per cell for the cycle (zero empty/dry weather rows).
  7. Atomic 1-cycle retention pruning ensures NeonDB table footprint stays < 5 MB.

Usage:
    uv run python -m pipeline.jobs.run_district_forecast --district wayanad
    uv run python -m pipeline.jobs.run_district_forecast --all
    uv run python -m pipeline.jobs.run_district_forecast --district barpeta --live
    uv run python -m pipeline.jobs.run_district_forecast --all --dry-run
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import math
import random
import sys
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional, Sequence

import httpx
import numpy as np
from scipy.spatial import cKDTree
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.orm import Session

from core.config import settings
from core.constants import BETA, FORECAST_HORIZON_HOURS, HAZARD_WEIGHTS
from core.enums import Hazard, ZoneClass
from pipeline.hazard.forecast_config import (
    FORECAST_DISTRICTS,
    DistrictForecastConfig,
    get_forecast_district,
)
from pipeline.ingestion.open_meteo_client import (
    OPEN_METEO_ECMWF_ENDPOINT,
    SOURCE_ID,
    SOURCE_MODEL,
    derive_provider_run_anchor,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("setu_pipeline.run_district_forecast")

REPO_ROOT = Path(__file__).resolve().parents[4]


@dataclass(frozen=True)
class DistrictForecastResult:
    district: str
    status: str  # 'SUCCESS', 'SKIPPED_LOCKED', 'NO_CELLS', 'DRY_WEATHER', 'FAILED'
    admin_id: int
    lgd_code: int
    target_hazard: str
    cells_total: int
    cells_above_threshold: int
    max_mhi_fcst: float
    pipeline_run_id: Optional[uuid.UUID]
    cycle_anchor: datetime
    error: Optional[str] = None


def fetch_open_meteo_batch(
    sample_points: list[tuple[float, float]],
    forecast_days: int = 4,
    timeout_s: float = 30.0,
    http_client: Optional[httpx.Client] = None,
    max_retries: int = 3,
) -> tuple[bytes, dict[str, Any]]:
    """Fetches ECMWF IFS HRES hourly precipitation for multiple points in a single HTTP GET with exponential backoff."""
    latitudes = [str(round(p[0], 4)) for p in sample_points]
    longitudes = [str(round(p[1], 4)) for p in sample_points]

    params = {
        "latitude": ",".join(latitudes),
        "longitude": ",".join(longitudes),
        "hourly": "precipitation",
        "timezone": "UTC",
        "forecast_days": forecast_days,
    }

    client = http_client or httpx.Client(timeout=timeout_s)
    should_close = http_client is None
    delays = [1.0, 2.5, 5.0]

    try:
        for attempt in range(max_retries):
            try:
                resp = client.get(OPEN_METEO_ECMWF_ENDPOINT, params=params)
                resp.raise_for_status()
                raw_bytes = resp.content
                data = resp.json()
                return raw_bytes, data
            except (httpx.TransportError, httpx.HTTPStatusError) as exc:
                if attempt == max_retries - 1:
                    logger.error("Open-Meteo batch fetch failed after %d attempts: %s", max_retries, exc)
                    raise
                sleep_s = delays[attempt] + random.uniform(0.1, 0.4)
                logger.warning(
                    "Open-Meteo batch fetch attempt %d/%d failed (%s). Retrying in %.2fs...",
                    attempt + 1, max_retries, exc, sleep_s
                )
                time.sleep(sleep_s)
        raise RuntimeError("Unreachable retry loop exit in fetch_open_meteo_batch")
    finally:
        if should_close:
            client.close()


def load_or_fetch_district_forecast(
    cfg: DistrictForecastConfig,
    sample_points: list[tuple[float, float]],
    live: bool = False,
    http_client: Optional[httpx.Client] = None,
) -> tuple[bytes, dict[str, Any]]:
    """Acquires raw forecast bytes: live network call or recorded demo snapshot."""
    raw_dir = REPO_ROOT / "data" / "raw" / "open_meteo"
    raw_dir.mkdir(parents=True, exist_ok=True)

    # Check for district-specific recorded file first
    recorded_file = raw_dir / f"ecmwf_{cfg.key}_reference.json"
    wayanad_ref = raw_dir / "ecmwf_wayanad_20260908T120000Z.json"

    if (settings.DEMO_MODE and not live) or (not live and recorded_file.exists()):
        candidate = recorded_file if recorded_file.exists() else wayanad_ref
        if candidate.exists():
            logger.info("Using recorded offline artifact for %s: %s", cfg.name, candidate.name)
            with open(candidate, "rb") as f:
                raw_bytes = f.read()
            return raw_bytes, json.loads(raw_bytes.decode("utf-8"))

    # Live query via Open-Meteo
    logger.info("Querying live Open-Meteo ECMWF for %s (%d coordinates)...", cfg.name, len(sample_points))
    raw_bytes, data = fetch_open_meteo_batch(sample_points, http_client=http_client)

    # Cache for reproducibility
    now_stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    save_path = raw_dir / f"ecmwf_{cfg.key}_{now_stamp}.json"
    with open(save_path, "wb") as f:
        f.write(raw_bytes)

    return raw_bytes, data


def run_district_forecast_cycle(
    cfg: DistrictForecastConfig,
    db: Session,
    live: bool = False,
    dry_run: bool = False,
    min_mhi_threshold: float = 0.45,
    http_client: Optional[httpx.Client] = None,
) -> DistrictForecastResult:
    """Executes the Route 1 sparse forecast cycle for a single district."""
    logger.info("--- Processing forecast for district: %s (LGD %d, Admin %d) ---", cfg.name, cfg.lgd_code, cfg.admin_id)

    # 1. Non-blocking Session Advisory Lock (PostgreSQL singleton guarantee)
    lock_query = text("SELECT pg_try_advisory_lock(:lock_id);")
    got_lock = db.execute(lock_query, {"lock_id": cfg.advisory_lock_id}).scalar()
    if got_lock is False:
        logger.warning("District %s forecast execution is locked by another worker. Skipping.", cfg.name)
        return DistrictForecastResult(
            district=cfg.name,
            status="SKIPPED_LOCKED",
            admin_id=cfg.admin_id,
            lgd_code=cfg.lgd_code,
            target_hazard=cfg.target_hazard,
            cells_total=0,
            cells_above_threshold=0,
            max_mhi_fcst=0.0,
            pipeline_run_id=None,
            cycle_anchor=datetime.now(timezone.utc),
        )

    pipeline_run_id = uuid.uuid4()
    now_utc = datetime.now(timezone.utc)
    cycle_anchor = derive_provider_run_anchor(now_utc)

    try:
        # 2. Query district cells and static susceptibilities
        cells_sql = text("""
            SELECT g.h3, ST_X(g.centroid::geometry) as lon, ST_Y(g.centroid::geometry) as lat,
                   COALESCE(hs.susceptibility, 0.0) as s_h
            FROM grid_cell g
            LEFT JOIN hazard_static hs ON g.h3 = hs.h3 AND hs.hazard_type = :hazard_type
            WHERE g.admin_id = :admin_id;
        """)
        cell_rows = db.execute(cells_sql, {"admin_id": cfg.admin_id, "hazard_type": cfg.target_hazard}).mappings().fetchall()

        if not cell_rows:
            logger.warning("No grid cells found in database for district %s (admin_id=%d).", cfg.name, cfg.admin_id)
            return DistrictForecastResult(
                district=cfg.name,
                status="NO_CELLS",
                admin_id=cfg.admin_id,
                lgd_code=cfg.lgd_code,
                target_hazard=cfg.target_hazard,
                cells_total=0,
                cells_above_threshold=0,
                max_mhi_fcst=0.0,
                pipeline_run_id=None,
                cycle_anchor=cycle_anchor,
            )

        cell_h3s = [r["h3"] for r in cell_rows]
        cell_coords = np.array([[r["lat"], r["lon"]] for r in cell_rows])  # (lat, lon)
        cell_sh = np.array([r["s_h"] for r in cell_rows], dtype=np.float32)

        # 3. Generate sample coordinates and fetch forecast
        sample_points = cfg.generate_sample_points()
        raw_bytes, payload = load_or_fetch_district_forecast(cfg, sample_points, live=live, http_client=http_client)

        raw_sha256 = hashlib.sha256(raw_bytes).hexdigest()
        source_snapshot_id = uuid.uuid4()

        # Normalize payload to list of stations
        stations = payload if isinstance(payload, list) else [payload]
        station_coords = np.array([[s.get("latitude", sample_points[i][0]), s.get("longitude", sample_points[i][1])] for i, s in enumerate(stations)])

        # 4. In-Memory Nearest-Neighbor Spatial Regrid via cKDTree
        tree = cKDTree(station_coords)
        _, nearest_station_indices = tree.query(cell_coords)  # array of length len(cell_rows)

        # Extract hourly precipitation matrix: shape = (num_stations, num_hours)
        time_strings = stations[0]["hourly"]["time"]
        timestamps = [datetime.fromisoformat(t).replace(tzinfo=timezone.utc) for t in time_strings]

        # Filter strictly to the next 72 forecast hours
        future_indices = [idx for idx, t in enumerate(timestamps) if t > cycle_anchor][:FORECAST_HORIZON_HOURS]
        if not future_indices:
            # Fallback if recorded artifact is in the past: take first 72 hours
            future_indices = list(range(min(FORECAST_HORIZON_HOURS, len(timestamps))))

        precip_matrix = np.array([
            [float(s["hourly"]["precipitation"][h_idx] or 0.0) for h_idx in future_indices]
            for s in stations
        ], dtype=np.float32)  # shape: (num_stations, horizon_hours)

        # Assign precipitation matrix to cells: shape = (num_cells, horizon_hours)
        cell_precip = precip_matrix[nearest_station_indices]

        # 5. Compute Rolling 3-Hour Accumulation & Peak Trigger Envelopes in NumPy
        # Accumulation over 3h window: A3(t) = P(t) + P(t-1) + P(t-2)
        # Pad 2 zeros at start
        padded_precip = np.pad(cell_precip, ((0, 0), (2, 0)), mode="constant", constant_values=0.0)
        a3 = padded_precip[:, 2:] + padded_precip[:, 1:-1] + padded_precip[:, :-2]
        i3 = a3 / 3.0  # mm/h

        # Piecewise heuristic trigger formula:
        # if i3 < 10.0: T = 0.0
        # elif 10.0 <= i3 < 29.0: T = ((i3 - 10.0) / 19.0) * 0.60
        # else: T = 0.60 + ((i3 - 29.0) / 29.0) * 1.0; cap at 3.0
        t_flood = np.zeros_like(i3)
        mask_mid = (i3 >= 10.0) & (i3 < 29.0)
        mask_high = i3 >= 29.0
        t_flood[mask_mid] = ((i3[mask_mid] - 10.0) / 19.0) * 0.60
        t_flood[mask_high] = np.minimum(0.60 + ((i3[mask_high] - 29.0) / 29.0) * 1.0, 3.0)

        # Peak trigger value and peak hour index per cell
        peak_t = np.max(t_flood, axis=1)  # (num_cells,)
        peak_hour_idx = np.argmax(t_flood, axis=1)  # (num_cells,)

        # Compute Peak Multi-Hazard Index:
        # H_peak = clamp(S_h * (1 + beta * peak_t), 0, 1)
        w_h = HAZARD_WEIGHTS.get(Hazard(cfg.target_hazard), 1.0)
        h_peak = np.clip(cell_sh * (1.0 + BETA * peak_t), 0.0, 1.0)
        mhi_peak = 1.0 - (1.0 - w_h * h_peak)

        max_mhi_overall = float(np.max(mhi_peak))

        # 6. ROUTE 1 SPARSE FILTER: Persist ONLY cells crossing threshold (MHI >= min_mhi_threshold)
        danger_indices = np.where((peak_t > 0.0) & (mhi_peak >= min_mhi_threshold))[0]
        num_danger_cells = len(danger_indices)

        logger.info(
            "%s Forecast Summary: %d total cells evaluated, peak district MHI=%.4f, %d cells crossing threshold >= %.2f.",
            cfg.name, len(cell_h3s), max_mhi_overall, num_danger_cells, min_mhi_threshold
        )

        if dry_run:
            logger.info("[DRY-RUN] Would persist %d peak danger cells for %s. Skipping database writes.", num_danger_cells, cfg.name)
            return DistrictForecastResult(
                district=cfg.name,
                status="SUCCESS",
                admin_id=cfg.admin_id,
                lgd_code=cfg.lgd_code,
                target_hazard=cfg.target_hazard,
                cells_total=len(cell_h3s),
                cells_above_threshold=num_danger_cells,
                max_mhi_fcst=max_mhi_overall,
                pipeline_run_id=pipeline_run_id,
                cycle_anchor=cycle_anchor,
            )

        # 7. Database Writes (Atomic Transaction)
        # Register source_snapshot & pipeline_run
        db.execute(text("""
            INSERT INTO source_snapshot (id, source_id, retrieved_at, valid_at, uri, sha256, metadata)
            VALUES (:id, :src, :retrieved_at, :valid_at, :uri, :sha, CAST(:meta AS jsonb));
        """), {
            "id": source_snapshot_id,
            "src": SOURCE_ID,
            "retrieved_at": now_utc,
            "valid_at": cycle_anchor,
            "uri": f"open_meteo_ecmwf://{cfg.key}/{cycle_anchor.strftime('%Y%m%dT%H%M%SZ')}",
            "sha": raw_sha256,
            "meta": json.dumps({
                "district": cfg.name,
                "lgd_code": cfg.lgd_code,
                "admin_id": cfg.admin_id,
                "cells_evaluated": len(cell_h3s),
                "danger_cells": num_danger_cells,
                "max_mhi_fcst": round(float(max_mhi_overall), 4),
                "weather_status": "CLEAR" if num_danger_cells == 0 else "HAZARD_ALERT",
                "cycle_anchor": cycle_anchor.isoformat(),
            }),
        })

        db.execute(text("""
            INSERT INTO pipeline_run (id, run_type, status, started_at, code_version, config_version, model_version, source_snapshot_id)
            VALUES (:id, 'forecast_pipeline', 'RUNNING', :now, 'route1-sparse-v1.0', :cfg_ver, :model, :ss_id);
        """), {
            "id": pipeline_run_id,
            "now": now_utc,
            "cfg_ver": f"{cfg.key}-sparse-peak",
            "model": SOURCE_MODEL,
            "ss_id": source_snapshot_id,
        })

        # Prune prior forecast records for this district first to preserve 1-cycle retention
        db.execute(text("""
            DELETE FROM hazard_dynamic
            WHERE forecast_cycle_at IS NOT NULL
              AND h3 = ANY(:h3_list);
        """), {"h3_list": cell_h3s})

        db.execute(text("""
            DELETE FROM mhi_snapshot
            WHERE mhi_fcst IS NOT NULL
              AND h3 = ANY(:h3_list)
              AND mhi_live = 0.0
              AND zone_class NOT IN ('permanent_red', 'active_alert', 'caution');
        """), {"h3_list": cell_h3s})

        # Insert sparse peak rows
        if num_danger_cells > 0:
            hd_values = []
            mhi_values = []

            for idx in danger_indices:
                h_int = int(cell_h3s[idx])
                pk_val = float(peak_t[idx])
                pk_mhi = float(mhi_peak[idx])
                s_base = float(cell_sh[idx])
                h_step = int(peak_hour_idx[idx])
                pk_time = timestamps[future_indices[h_step]]

                # Forecast threshold crossing creates a FORECAST_ALERT (FAZ), never an ACTIVE_ALERT (AAZ)
                zone_cls = "forecast_alert" if pk_mhi >= 0.75 else "caution"

                hd_values.append({
                    "h3": h_int,
                    "hazard_type": cfg.target_hazard,
                    "valid_at": pk_time,
                    "forecast_cycle_at": cycle_anchor,
                    "ingested_at": now_utc,
                    "trigger_value": pk_val,
                    "source": SOURCE_ID,
                    "pipeline_run_id": pipeline_run_id,
                })

                mhi_values.append({
                    "h3": h_int,
                    "valid_at": pk_time,
                    "mhi_static": s_base,
                    "mhi_live": 0.0,
                    "mhi_fcst": pk_mhi,
                    "dominant_hazard": cfg.target_hazard,
                    "zone_class": zone_cls,
                    "pipeline_run_id": pipeline_run_id,
                })

            # Bulk insert sparse records
            db.execute(text("""
                INSERT INTO hazard_dynamic (h3, hazard_type, valid_at, forecast_cycle_at, ingested_at, trigger_value, source, pipeline_run_id)
                VALUES (:h3, :hazard_type, :valid_at, :forecast_cycle_at, :ingested_at, :trigger_value, :source, :pipeline_run_id);
            """), hd_values)

            db.execute(text("""
                INSERT INTO mhi_snapshot (h3, valid_at, mhi_static, mhi_live, mhi_fcst, dominant_hazard, zone_class, pipeline_run_id)
                VALUES (:h3, :valid_at, :mhi_static, :mhi_live, :mhi_fcst, :dominant_hazard, :zone_class, :pipeline_run_id)
                ON CONFLICT (h3, valid_at) DO UPDATE SET
                    mhi_fcst = EXCLUDED.mhi_fcst,
                    zone_class = EXCLUDED.zone_class,
                    pipeline_run_id = EXCLUDED.pipeline_run_id;
            """), mhi_values)

        # Mark pipeline_run READY
        db.execute(text("""
            UPDATE pipeline_run
            SET status = 'READY', completed_at = :now
            WHERE id = :id;
        """), {"id": pipeline_run_id, "now": datetime.now(timezone.utc)})

        db.commit()
        logger.info("Successfully committed Route 1 forecast for %s (%d danger cells persisted into NeonDB).", cfg.name, num_danger_cells)

        return DistrictForecastResult(
            district=cfg.name,
            status="SUCCESS",
            admin_id=cfg.admin_id,
            lgd_code=cfg.lgd_code,
            target_hazard=cfg.target_hazard,
            cells_total=len(cell_h3s),
            cells_above_threshold=num_danger_cells,
            max_mhi_fcst=max_mhi_overall,
            pipeline_run_id=pipeline_run_id,
            cycle_anchor=cycle_anchor,
        )

    except Exception as exc:
        db.rollback()
        logger.exception("Error processing forecast for district %s: %s", cfg.name, exc)
        return DistrictForecastResult(
            district=cfg.name,
            status="FAILED",
            admin_id=cfg.admin_id,
            lgd_code=cfg.lgd_code,
            target_hazard=cfg.target_hazard,
            cells_total=0,
            cells_above_threshold=0,
            max_mhi_fcst=0.0,
            pipeline_run_id=pipeline_run_id,
            cycle_anchor=cycle_anchor,
            error=str(exc),
        )
    finally:
        # Unlock advisory lock
        try:
            db.execute(text("SELECT pg_advisory_unlock(:lock_id);"), {"lock_id": cfg.advisory_lock_id})
        except Exception:
            pass


def run_all_districts(
    district_keys: Optional[list[str]] = None,
    live: bool = False,
    dry_run: bool = False,
) -> list[DistrictForecastResult]:
    """Runs Route 1 forecast pipeline across all registered districts sequentially."""
    keys = district_keys or list(FORECAST_DISTRICTS.keys())
    engine = create_engine(
        settings.get_sqlalchemy_url(direct=True),
        pool_pre_ping=True,
        pool_recycle=300,
    )
    results: list[DistrictForecastResult] = []

    with httpx.Client(timeout=30.0) as http_client:
        with Session(engine) as session:
            # Pre-flight ping to wake sleeping Neon Serverless compute cleanly
            try:
                session.execute(text("SELECT 1;"))
            except Exception as e:
                logger.warning("Neon serverless pre-flight warmup failed (will retry): %s", e)

            for key in keys:
                try:
                    cfg = get_forecast_district(key)
                    res = run_district_forecast_cycle(
                        cfg=cfg,
                        db=session,
                        live=live,
                        dry_run=dry_run,
                        http_client=http_client,
                    )
                    results.append(res)
                except Exception as exc:
                    logger.error("District %s failed: %s", key, exc)

    return results


def main():
    parser = argparse.ArgumentParser(description="SETU-DRR Route 1 Sparse Forecast Pipeline Runner.")
    parser.add_argument("--district", help="Specific district slug to run (e.g. wayanad, barpeta, rudraprayag, srinagar, dholpur, morena, kodagu).")
    parser.add_argument("--all", action="store_true", help="Run forecast for all registered districts.")
    parser.add_argument("--live", action="store_true", help="Perform live HTTP call to Open-Meteo ECMWF API instead of demo fixtures.")
    parser.add_argument("--dry-run", action="store_true", help="Simulate computation and peak detection without writing to NeonDB.")
    args = parser.parse_args()

    if not args.district and not args.all:
        parser.print_help()
        sys.exit(1)

    targets = [args.district] if args.district else list(FORECAST_DISTRICTS.keys())
    results = run_all_districts(district_keys=targets, live=args.live, dry_run=args.dry_run)

    print("\n" + "=" * 80)
    print("ROUTE 1 SPARSE FORECAST EXECUTION SUMMARY")
    print("=" * 80)
    for r in results:
        status_str = f"[{r.status}]"
        print(f"{r.district:<14} {status_str:<12} Cells: {r.cells_total:<6} Danger: {r.cells_above_threshold:<6} Peak MHI: {r.max_mhi_fcst:.4f}")
    print("=" * 80)


if __name__ == "__main__":
    main()
