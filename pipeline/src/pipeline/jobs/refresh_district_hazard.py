"""Refresh a district's derived hazard tables after its static layer was replaced.

`hazard_static` feeds two derived tables that no ingest regenerates:

* `mhi_snapshot`  - static/live/forecast MHI, dominant hazard and zone class per (h3, valid_at).
* `explanation`   - per-cell feature attributions shown in the dossier.

`compute_and_persist_dynamic_snapshots` is unsuitable for this: on forecast rows its upsert keeps
the existing `mhi_live` / `dominant_hazard` and feeds the stale live value back into the
evaluator, so a re-scored district ends up half refreshed. This job recomputes every existing
snapshot row from the *current* `hazard_static` plus the persisted triggers, using the same
`DynamicHazardEvaluator`, and overwrites all derived columns. `pipeline_run_id` is left untouched.

Explanations are keyed by h3 only and record the model that produced them. Rows whose
`model_version` no longer matches any of the cell's `hazard_static` versions describe a score
that is gone, so `--clear-stale-explanations` deletes them rather than leaving values in the
dossier that were never measured. Nothing regenerates them; that needs the layer's own model.

Before any write the affected rows are dumped to CSV so the change can be rolled back.

Usage:
    uv run python -m pipeline.jobs.refresh_district_hazard --lgd 555 --dry-run
    uv run python -m pipeline.jobs.refresh_district_hazard --lgd 555 --clear-stale-explanations
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
from collections import Counter
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from core.config import settings
from core.constants import BETA, HAZARD_WEIGHTS
from core.enums import Hazard
from pipeline.hazard.dynamic_evaluator import DynamicHazardEvaluator

logger = logging.getLogger("setu_pipeline.refresh_district_hazard")

REPO_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_BACKUP_DIR = REPO_ROOT / "data" / "backups" / "district_hazard_refresh"

SNAPSHOT_COLUMNS = (
    "h3", "valid_at", "mhi_static", "mhi_live", "mhi_fcst",
    "dominant_hazard", "zone_class", "pipeline_run_id",
)


@dataclass
class RefreshSummary:
    lgd_code: int
    dry_run: bool
    cells: int = 0
    timestamps: int = 0
    rows_examined: int = 0
    rows_changed: int = 0
    zone_class_before: dict[str, int] = field(default_factory=dict)
    zone_class_after: dict[str, int] = field(default_factory=dict)
    stale_explanations: int = 0
    explanations_deleted: int = 0
    backups: list[str] = field(default_factory=list)


def _hazard_map(rows: list[dict[str, Any]], value_key: str) -> dict[int, dict[Hazard, float]]:
    """Groups (h3, hazard_type, value) rows into {h3: {Hazard: value}}, skipping unknown types."""
    out: dict[int, dict[Hazard, float]] = {}
    for r in rows:
        try:
            hz = Hazard(str(r["hazard_type"]).lower().strip())
        except ValueError:
            continue
        out.setdefault(int(r["h3"]), {}).setdefault(hz, float(r[value_key]))
    return out


def _district_cells(session: Session, lgd_code: int) -> list[int]:
    rows = session.execute(
        text("""
            SELECT gc.h3 FROM grid_cell gc
            LEFT JOIN admin_boundary ab ON gc.admin_id = ab.id
            WHERE gc.admin_id = :lgd OR ab.lgd_code = :lgd
        """),
        {"lgd": lgd_code},
    ).all()
    return [int(r[0]) for r in rows]


def _write_backup(path: Path, header: tuple[str, ...], rows: list[Any]) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(header)
        writer.writerows(rows)
    return str(path)


def _differs(old: dict[str, Any], new: dict[str, Any]) -> bool:
    for key in ("mhi_static", "mhi_live", "mhi_fcst"):
        a, b = old[key], new[key]
        if (a is None) != (b is None) or (a is not None and abs(float(a) - float(b)) > 1e-9):
            return True
    return old["dominant_hazard"] != new["dominant_hazard"] or old["zone_class"] != new["zone_class"]


def refresh_mhi_snapshot(
    session: Session,
    cells: list[int],
    summary: RefreshSummary,
    backup_dir: Path,
) -> None:
    evaluator = DynamicHazardEvaluator(beta=BETA, hazard_weights=HAZARD_WEIGHTS)

    static_by_h3 = _hazard_map(
        [dict(r) for r in session.execute(
            text("SELECT h3, hazard_type, susceptibility FROM hazard_static WHERE h3 = ANY(:c)"),
            {"c": cells},
        ).mappings()],
        "susceptibility",
    )

    # Unlike the incremental job, a failure here must not silently downgrade PRZ classification.
    fatal_cells = {
        int(r[0]) for r in session.execute(
            text("""
                SELECT DISTINCT gc.h3 FROM grid_cell gc
                JOIN disaster_event de ON ST_Intersects(gc.geom, de.geom)
                WHERE gc.h3 = ANY(:c) AND de.fatalities > 0
                  AND de.ts >= (CURRENT_DATE - INTERVAL '25 years')
            """),
            {"c": cells},
        ).all()
    }

    timestamps = [r[0] for r in session.execute(
        text("SELECT DISTINCT valid_at FROM mhi_snapshot WHERE h3 = ANY(:c) ORDER BY valid_at"),
        {"c": cells},
    ).all()]
    summary.timestamps = len(timestamps)

    if not summary.dry_run:
        backup_rows = session.execute(
            text(f"SELECT {', '.join(SNAPSHOT_COLUMNS)} FROM mhi_snapshot WHERE h3 = ANY(:c) ORDER BY valid_at, h3"),
            {"c": cells},
        ).all()
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        summary.backups.append(_write_backup(
            backup_dir / f"mhi_snapshot_lgd{summary.lgd_code}_{stamp}.csv", SNAPSHOT_COLUMNS, backup_rows,
        ))

    update_sql = text("""
        UPDATE mhi_snapshot m SET
            mhi_static = v.s, mhi_live = v.l, mhi_fcst = v.f,
            dominant_hazard = v.d, zone_class = v.z
        FROM unnest(
            CAST(:h3 AS bigint[]), CAST(:s AS double precision[]), CAST(:l AS double precision[]),
            CAST(:f AS double precision[]), CAST(:d AS text[]), CAST(:z AS text[])
        ) AS v(h3, s, l, f, d, z)
        WHERE m.h3 = v.h3 AND m.valid_at = :ts
    """)

    latest_before: dict[int, str] = {}
    latest_after: dict[int, str] = {}

    for ts in timestamps:
        existing = {int(r["h3"]): dict(r) for r in session.execute(
            text("""
                SELECT h3, mhi_static, mhi_live, mhi_fcst, dominant_hazard, zone_class
                FROM mhi_snapshot WHERE valid_at = :ts AND h3 = ANY(:c)
            """),
            {"ts": ts, "c": cells},
        ).mappings()}

        live_by_h3: dict[int, dict[Hazard, float]] = {}
        fcst_by_h3: dict[int, dict[Hazard, float]] = {}
        trigger_rows = session.execute(
            text("""
                SELECT h3, hazard_type, trigger_value, forecast_cycle_at
                FROM hazard_dynamic
                WHERE valid_at = :ts AND h3 = ANY(:c)
                ORDER BY h3, hazard_type, forecast_cycle_at DESC NULLS LAST, ingested_at DESC, id DESC
            """),
            {"ts": ts, "c": cells},
        ).mappings().all()
        for r in trigger_rows:
            target = fcst_by_h3 if r["forecast_cycle_at"] is not None else live_by_h3
            try:
                hz = Hazard(str(r["hazard_type"]).lower().strip())
            except ValueError:
                continue
            target.setdefault(int(r["h3"]), {}).setdefault(hz, float(r["trigger_value"]))

        changed: list[tuple[int, dict[str, Any]]] = []
        for h_int, old in existing.items():
            static = static_by_h3.get(h_int)
            if not static:
                continue
            ev = evaluator.evaluate_cell(
                h3=h_int,
                static_susceptibilities=static,
                live_triggers=live_by_h3.get(h_int),
                forecast_triggers=fcst_by_h3.get(h_int),
                has_fatal_event_25yr=h_int in fatal_cells,
            )
            new = {
                "mhi_static": round(ev.mhi_static, 4),
                "mhi_live": round(ev.mhi_live, 4),
                "mhi_fcst": round(ev.mhi_fcst, 4) if ev.mhi_fcst is not None else None,
                "dominant_hazard": ev.dominant_hazard.value,
                "zone_class": ev.zone_class.value,
            }
            summary.rows_examined += 1
            latest_before[h_int] = old["zone_class"]
            latest_after[h_int] = new["zone_class"]
            if _differs(old, new):
                changed.append((h_int, new))

        summary.rows_changed += len(changed)
        if changed and not summary.dry_run:
            session.execute(update_sql, {
                "ts": ts,
                "h3": [h for h, _ in changed],
                "s": [n["mhi_static"] for _, n in changed],
                "l": [n["mhi_live"] for _, n in changed],
                "f": [n["mhi_fcst"] for _, n in changed],
                "d": [n["dominant_hazard"] for _, n in changed],
                "z": [n["zone_class"] for _, n in changed],
            })
            session.commit()
        logger.info("valid_at=%s examined=%d changed=%d", ts.isoformat(), len(existing), len(changed))

    # Zone class of each cell's latest snapshot, i.e. what /zones serves.
    summary.zone_class_before = dict(Counter(latest_before.values()))
    summary.zone_class_after = dict(Counter(latest_after.values()))


def clear_stale_explanations(
    session: Session, cells: list[int], summary: RefreshSummary, backup_dir: Path,
) -> None:
    stale_sql = """
        FROM explanation e
        WHERE e.h3 = ANY(:c)
          AND NOT EXISTS (
              SELECT 1 FROM hazard_static h WHERE h.h3 = e.h3 AND h.model_version = e.model_version
          )
    """
    rows = session.execute(
        text(f"SELECT e.h3, e.model_version, e.factors, e.screening_grade {stale_sql}"), {"c": cells},
    ).all()
    summary.stale_explanations = len(rows)
    if summary.dry_run or not rows:
        return

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    summary.backups.append(_write_backup(
        backup_dir / f"explanation_lgd{summary.lgd_code}_{stamp}.csv",
        ("h3", "model_version", "factors", "screening_grade"),
        [(r[0], r[1], json.dumps(r[2]), r[3]) for r in rows],
    ))
    result = session.execute(
        text(f"""
            DELETE FROM explanation USING (
                SELECT e.h3 {stale_sql}
            ) s WHERE explanation.h3 = s.h3
        """),
        {"c": cells},
    )
    summary.explanations_deleted = result.rowcount or 0
    session.commit()


def refresh_district_hazard(
    lgd_code: int,
    *,
    dry_run: bool = False,
    clear_explanations: bool = False,
    backup_dir: Path = DEFAULT_BACKUP_DIR,
    session: Optional[Session] = None,
) -> RefreshSummary:
    owns_session = session is None
    if session is None:
        session = Session(create_engine(settings.get_sqlalchemy_url(direct=True), pool_pre_ping=True))
    try:
        cells = _district_cells(session, lgd_code)
        if not cells:
            raise SystemExit(f"No grid cells found for LGD {lgd_code}.")
        summary = RefreshSummary(lgd_code=lgd_code, dry_run=dry_run, cells=len(cells))
        refresh_mhi_snapshot(session, cells, summary, backup_dir)
        if clear_explanations:
            clear_stale_explanations(session, cells, summary, backup_dir)
        return summary
    finally:
        if owns_session:
            session.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--lgd", type=int, required=True, help="District LGD code (e.g. 555 for Wayanad).")
    parser.add_argument("--dry-run", action="store_true", help="Report what would change; write nothing.")
    parser.add_argument("--clear-stale-explanations", action="store_true",
                        help="Delete explanation rows whose model no longer matches hazard_static.")
    parser.add_argument("--backup-dir", type=Path, default=DEFAULT_BACKUP_DIR,
                        help="Where the pre-change CSV backups are written.")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    summary = refresh_district_hazard(
        args.lgd,
        dry_run=args.dry_run,
        clear_explanations=args.clear_stale_explanations,
        backup_dir=args.backup_dir,
    )
    print(json.dumps(asdict(summary), indent=2))


if __name__ == "__main__":
    main()
