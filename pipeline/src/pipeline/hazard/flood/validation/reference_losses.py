"""Reference loader and climate context evaluator for CWC and MHA flood loss records.

Implements Phase 4 of FLOOD_VALIDATION_PLAN.md:
- Reads `cwc_flood_damage_record` and `historical_disaster_loss` from the live database
  (PostgreSQL/Neon) with automatic fallback to repo JSON fixtures.
- Calculates empirical loss percentiles with sample size (n) for the SAR observation stack year.
- Flags years outside the 20th–80th percentile as 'unrepresentative', and explicitly
  documents when a stack year falls outside the historical series (e.g. 2023).
- Strictly maintains non-claim boundaries: provides macro-hydrological climate context
  without deriving ungrounded 'accuracy' percentages against high-resolution susceptibility.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Optional, Sequence

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from core.config import settings
from ..districts import get_district

logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[6]
DEFAULT_FIXTURES_DIR = REPO_ROOT / "pipeline" / "data" / "fixtures" / "disaster_history"


def _get_db_session() -> Optional[Session]:
    """Create a temporary SQLAlchemy session using psycopg3 driver if available."""
    try:
        url = settings.get_sqlalchemy_url()
        engine = create_engine(url, connect_args={"connect_timeout": 5})
        return Session(engine)
    except Exception as exc:
        logger.debug("Database connection could not be established: %s", exc)
        return None


def load_cwc_losses(
    session: Optional[Session] = None,
    fixtures_dir: Optional[Path | str] = None,
) -> list[dict[str, Any]]:
    """Load Central Water Commission (CWC) flood damage records.

    Tries live database first; falls back to repo fixture `cwc_flood_damages.json`.

    Args:
        session: Optional active SQLAlchemy session.
        fixtures_dir: Directory containing fallback JSON fixtures.

    Returns:
        List of dicts containing CWC state-year flood loss records.
    """
    sess = session or _get_db_session()
    if sess is not None:
        try:
            query = text(
                """
                SELECT state_name, calendar_year, area_affected_mha, population_affected_m,
                       human_lives_lost, cattle_lost, houses_damaged_count, total_damage_crores,
                       source_uuid
                FROM cwc_flood_damage_record
                ORDER BY state_name, calendar_year
                """
            )
            rows = sess.execute(query).fetchall()
            if rows:
                return [
                    {
                        "state_name": r[0],
                        "calendar_year": int(r[1]),
                        "area_affected_mha": float(r[2] or 0.0),
                        "population_affected_m": float(r[3] or 0.0),
                        "human_lives_lost": int(r[4] or 0),
                        "cattle_lost": int(r[5] or 0),
                        "houses_damaged_count": int(r[6] or 0),
                        "total_damage_crores": float(r[7] or 0.0),
                        "source_uuid": str(r[8]),
                        "data_source": "neon_database",
                    }
                    for r in rows
                ]
        except Exception as exc:
            logger.warning("Failed to query cwc_flood_damage_record from DB: %s. Using fixture.", exc)
        finally:
            if session is None:
                sess.close()

    # Fallback to fixture
    fdir = Path(fixtures_dir) if fixtures_dir else DEFAULT_FIXTURES_DIR
    fixture_path = fdir / "cwc_flood_damages.json"
    if fixture_path.exists():
        data = json.loads(fixture_path.read_text(encoding="utf-8"))
        for d in data:
            d["data_source"] = "json_fixture"
        return data

    logger.warning("No CWC flood damage fixture found at %s", fixture_path)
    return []


def load_mha_losses(
    session: Optional[Session] = None,
    fixtures_dir: Optional[Path | str] = None,
) -> list[dict[str, Any]]:
    """Load Ministry of Home Affairs (MHA) disaster loss records.

    Tries live database first; falls back to repo fixture `mha_rajya_sabha_losses.json`.

    Args:
        session: Optional active SQLAlchemy session.
        fixtures_dir: Directory containing fallback JSON fixtures.

    Returns:
        List of dicts containing MHA state-year disaster loss records.
    """
    sess = session or _get_db_session()
    if sess is not None:
        try:
            query = text(
                """
                SELECT state_name, year_label, year_start, year_end, lives_lost,
                       cattle_lost, houses_damaged, crop_area_affected_ha,
                       hazard_types_included, source_uuid, source_title
                FROM historical_disaster_loss
                ORDER BY state_name, year_start
                """
            )
            rows = sess.execute(query).fetchall()
            if rows:
                return [
                    {
                        "state_name": r[0],
                        "year_label": r[1],
                        "year_start": int(r[2]),
                        "year_end": int(r[3]),
                        "lives_lost": int(r[4] or 0),
                        "cattle_lost": int(r[5] or 0),
                        "houses_damaged": int(r[6] or 0),
                        "crop_area_affected_ha": float(r[7] or 0.0),
                        "hazard_types_included": r[8],
                        "source_uuid": str(r[9]),
                        "source_title": r[10],
                        "data_source": "neon_database",
                    }
                    for r in rows
                ]
        except Exception as exc:
            logger.warning("Failed to query historical_disaster_loss from DB: %s. Using fixture.", exc)
        finally:
            if session is None:
                sess.close()

    # Fallback to fixture
    fdir = Path(fixtures_dir) if fixtures_dir else DEFAULT_FIXTURES_DIR
    fixture_path = fdir / "mha_rajya_sabha_losses.json"
    if fixture_path.exists():
        data = json.loads(fixture_path.read_text(encoding="utf-8"))
        for d in data:
            d["data_source"] = "json_fixture"
        return data

    logger.warning("No MHA disaster loss fixture found at %s", fixture_path)
    return []


def calculate_series_percentile(values: Sequence[float], target_value: float) -> float:
    """Compute empirical cumulative percentile of a target value within a series.

    Formula: (count(v <= target_value) / len(values)) * 100.0

    Args:
        values: Non-empty sequence of numerical values.
        target_value: Value whose percentile is being evaluated.

    Returns:
        Percentile in [0.0, 100.0].
    """
    if not values:
        return 0.0
    less_or_equal = sum(1 for v in values if v <= target_value)
    return float((less_or_equal / len(values)) * 100.0)


def evaluate_district_loss_context(
    district: str,
    stack_year: Optional[int] = None,
    session: Optional[Session] = None,
    fixtures_dir: Optional[Path | str] = None,
) -> dict[str, Any]:
    """Evaluate climatological flood loss context for a district's SAR stack year.

    Args:
        district: District slug (e.g. 'barpeta', 'dholpur', 'morena', 'wayanad').
        stack_year: Optional explicit observation year. If None, derived from DistrictConfig.
        session: Optional SQLAlchemy session.
        fixtures_dir: Optional fixtures directory path.

    Returns:
        Dictionary adhering to the §11 metrics JSON contract (`losses_context`).
    """
    dist_cfg = get_district(district)
    state = dist_cfg.state

    # Resolve SAR stack year from config
    if stack_year is None:
        # e.g. "2020-06-01/2020-12-31" -> 2020
        date_range = dist_cfg.s1_datetime_range
        stack_year = int(date_range.split("-")[0])

    cwc_all = load_cwc_losses(session=session, fixtures_dir=fixtures_dir)
    mha_all = load_mha_losses(session=session, fixtures_dir=fixtures_dir)

    # Filter to district's state
    state_cwc = [r for r in cwc_all if r["state_name"].strip().lower() == state.strip().lower()]
    state_mha = [r for r in mha_all if r["state_name"].strip().lower() == state.strip().lower()]

    state_cwc.sort(key=lambda r: r["calendar_year"])
    state_mha.sort(key=lambda r: r["year_start"])

    # 1. CWC Evaluation
    cwc_years = [r["calendar_year"] for r in state_cwc]
    cwc_stack_row = next((r for r in state_cwc if r["calendar_year"] == stack_year), None)

    # 2. MHA Evaluation
    mha_start_years = [r["year_start"] for r in state_mha]
    mha_stack_row = next((r for r in state_mha if r["year_start"] == stack_year), None)

    # Determine primary source and series
    if cwc_stack_row is not None:
        # Stack year is directly covered in CWC
        primary_source = "CWC"
        data_source_type = cwc_stack_row.get("data_source", "neon_database")
        series_n = len(state_cwc)
        metric_name = "total_damage_crores"
        series_values = [r["total_damage_crores"] for r in state_cwc]
        target_val = cwc_stack_row["total_damage_crores"]
        percentile = calculate_series_percentile(series_values, target_val)

        status = "in_series"
        # 20th–80th percentile rule (§9)
        flag = "typical" if (20.0 <= percentile <= 80.0) else "unrepresentative"
        finding_note = (
            f"SAR stack year {stack_year} is directly covered in the CWC flood damage series for {state} "
            f"(2016–2021, n={series_n} years). Total flood damage of ₹{target_val:,.1f} Cr ranks at the "
            f"{percentile:.1f}th percentile ({flag})."
        )
        benchmark_year = stack_year
        benchmark_value = target_val

    elif mha_stack_row is not None:
        # Stack year is covered in MHA (but not CWC)
        primary_source = "MHA"
        data_source_type = mha_stack_row.get("data_source", "neon_database")
        series_n = len(state_mha)
        metric_name = "lives_lost"
        series_values = [r["lives_lost"] for r in state_mha]
        target_val = mha_stack_row["lives_lost"]
        percentile = calculate_series_percentile(series_values, target_val)

        status = "in_series"
        flag = "typical" if (20.0 <= percentile <= 80.0) else "unrepresentative"
        finding_note = (
            f"SAR stack year {stack_year} is covered in the MHA disaster loss series for {state} "
            f"(n={series_n} years). Recorded {target_val} lives lost, ranking at the {percentile:.1f}th percentile ({flag})."
        )
        benchmark_year = stack_year
        benchmark_value = target_val

    else:
        # Stack year is outside both series (e.g. 2023 where CWC ends 2021 and MHA ends 2022-23)
        primary_source = "MHA"
        data_source_type = state_mha[-1].get("data_source", "neon_database") if state_mha else "none"
        status = "outside_series"
        flag = "unrepresentative_outside_series"

        if state_mha:
            latest_mha = state_mha[-1]
            series_n = len(state_mha)
            metric_name = "lives_lost"
            series_values = [r["lives_lost"] for r in state_mha]
            benchmark_year = latest_mha["year_start"]
            benchmark_label = latest_mha["year_label"]
            benchmark_value = latest_mha["lives_lost"]
            percentile = calculate_series_percentile(series_values, benchmark_value)
            finding_note = (
                f"SAR stack year {stack_year} falls outside the official historical series (CWC series ends 2021/2022, "
                f"MHA series ends {benchmark_label}). The latest available state benchmark ({benchmark_label}) "
                f"recorded {benchmark_value} lives lost and {latest_mha.get('houses_damaged', 0):,} houses damaged "
                f"({percentile:.1f}th percentile in the {series_n}-year series)."
            )
        elif state_cwc:
            latest_cwc = state_cwc[-1]
            series_n = len(state_cwc)
            metric_name = "total_damage_crores"
            series_values = [r["total_damage_crores"] for r in state_cwc]
            benchmark_year = latest_cwc["calendar_year"]
            benchmark_value = latest_cwc["total_damage_crores"]
            percentile = calculate_series_percentile(series_values, benchmark_value)
            finding_note = (
                f"SAR stack year {stack_year} falls outside the CWC series (ends {benchmark_year}). "
                f"Latest recorded damage was ₹{benchmark_value:,.1f} Cr ({percentile:.1f}th percentile, n={series_n})."
            )
        else:
            series_n = 0
            metric_name = "none"
            series_values = []
            benchmark_year = None
            benchmark_value = 0.0
            percentile = 0.0
            finding_note = f"No CWC or MHA loss records found for state '{state}'."

    payload = {
        "stack_year": stack_year,
        "state": state,
        "series_n": series_n,
        "percentile": round(percentile, 1),
        "flag": flag,
        "status": status,
        "primary_source": primary_source,
        "data_source_type": data_source_type,
        "metric_evaluated": metric_name,
        "benchmark_year": benchmark_year,
        "benchmark_value": benchmark_value,
        "finding": finding_note,
        "cwc_summary": {
            "n_years": len(state_cwc),
            "years_covered": cwc_years,
            "annual_damages_crores": {
                r["calendar_year"]: r["total_damage_crores"] for r in state_cwc
            },
            "annual_lives_lost": {
                r["calendar_year"]: r["human_lives_lost"] for r in state_cwc
            },
        },
        "mha_summary": {
            "n_years": len(state_mha),
            "years_covered": [r["year_label"] for r in state_mha],
            "annual_lives_lost": {
                r["year_label"]: r["lives_lost"] for r in state_mha
            },
            "annual_houses_damaged": {
                r["year_label"]: r["houses_damaged"] for r in state_mha
            },
        },
    }

    return payload
