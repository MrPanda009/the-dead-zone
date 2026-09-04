"""PostGIS Repository for Active and Forecast Alert Zones (Day 6).

Section refs: docs/PRD1.md §6.3, §9.5, §9.6, FR-3.10, FR-3.12
"""

from __future__ import annotations

from typing import Any, Optional
from sqlalchemy import text
from sqlalchemy.orm import Session

from core.constants import ACTIVE_ALERT_MHI_LIVE, PRZ_MHI_STATIC


class AlertsRepository:
    """PostGIS data access for active trigger alerts and forecast threshold crossings."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def query_active_alerts(
        self,
        admin_id: Optional[int] = None,
        min_mhi: float = ACTIVE_ALERT_MHI_LIVE,
        dominant_hazard: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[dict[str, Any]], int, int]:
        """Queries H3 cells where dynamic live trigger causes MHI_live >= 0.75 and MHI_static < 0.75.
        
        Returns:
            (records, total_cells_count, total_exposed_population)
        """
        where_clauses = [
            "m.mhi_live >= :min_mhi",
            "m.mhi_static < :prz_threshold",
        ]
        params: dict[str, Any] = {
            "min_mhi": float(min_mhi),
            "prz_threshold": float(PRZ_MHI_STATIC),
            "limit": limit,
            "offset": offset,
        }

        if admin_id is not None:
            where_clauses.append("(g.admin_id = :admin_id OR a.lgd_code = :admin_id)")
            params["admin_id"] = int(admin_id)

        if dominant_hazard:
            where_clauses.append("m.dominant_hazard = :dominant_hazard")
            params["dominant_hazard"] = dominant_hazard.lower()

        where_sql = " AND ".join(where_clauses)

        sql = f"""
            WITH latest_snapshots AS (
                SELECT DISTINCT ON (h3)
                    h3, valid_at, mhi_static, mhi_live, mhi_fcst, dominant_hazard, zone_class
                FROM mhi_snapshot
                ORDER BY h3, valid_at DESC
            )
            SELECT
                g.h3,
                g.res,
                g.population,
                g.built_area_m2,
                ST_X(g.centroid::geometry) as lon,
                ST_Y(g.centroid::geometry) as lat,
                a.id as admin_id,
                a.name as admin_name,
                m.valid_at,
                m.mhi_static,
                m.mhi_live,
                m.mhi_fcst,
                m.dominant_hazard,
                m.zone_class,
                count(*) OVER() as full_count,
                sum(g.population) OVER() as full_exposed_pop
            FROM latest_snapshots m
            JOIN grid_cell g ON m.h3 = g.h3
            LEFT JOIN admin_boundary a ON g.admin_id = a.id
            WHERE {where_sql}
            ORDER BY m.mhi_live DESC, g.population DESC, g.h3 ASC
            LIMIT :limit OFFSET :offset;
        """

        rows = self.db.execute(text(sql), params).mappings().fetchall()
        if not rows:
            return [], 0, 0

        total_cells = int(rows[0]["full_count"])
        pop_raw = rows[0]["full_exposed_pop"]
        total_pop = int(round(float(pop_raw if pop_raw is not None else 0.0)))
        return [dict(r) for r in rows], total_cells, total_pop

    def query_forecast_alerts(
        self,
        admin_id: Optional[int] = None,
        min_mhi: float = ACTIVE_ALERT_MHI_LIVE,
        horizon_hours: int = 72,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[dict[str, Any]], int, int]:
        """Queries H3 cells predicted to cross MHI >= 0.75 within forecast horizon (max 72h).
        
        Returns:
            (records, total_forecast_cells, total_exposed_population)
        """
        where_clauses = [
            "m.mhi_fcst >= :min_mhi",
        ]
        params: dict[str, Any] = {
            "min_mhi": float(min_mhi),
            "limit": limit,
            "offset": offset,
        }

        if admin_id is not None:
            where_clauses.append("(g.admin_id = :admin_id OR a.lgd_code = :admin_id)")
            params["admin_id"] = int(admin_id)

        where_sql = " AND ".join(where_clauses)

        sql = f"""
            WITH latest_snapshots AS (
                SELECT DISTINCT ON (h3)
                    h3, valid_at, mhi_static, mhi_live, mhi_fcst, dominant_hazard, zone_class
                FROM mhi_snapshot
                ORDER BY h3, valid_at DESC
            )
            SELECT
                g.h3,
                g.res,
                g.population,
                g.built_area_m2,
                ST_X(g.centroid::geometry) as lon,
                ST_Y(g.centroid::geometry) as lat,
                a.id as admin_id,
                a.name as admin_name,
                m.valid_at,
                m.mhi_static,
                m.mhi_live,
                m.mhi_fcst,
                m.dominant_hazard,
                m.zone_class,
                count(*) OVER() as full_count,
                sum(g.population) OVER() as full_exposed_pop
            FROM latest_snapshots m
            JOIN grid_cell g ON m.h3 = g.h3
            LEFT JOIN admin_boundary a ON g.admin_id = a.id
            WHERE {where_sql}
            ORDER BY m.mhi_fcst DESC, g.population DESC, g.h3 ASC
            LIMIT :limit OFFSET :offset;
        """

        rows = self.db.execute(text(sql), params).mappings().fetchall()
        if not rows:
            return [], 0, 0

        total_cells = int(rows[0]["full_count"])
        pop_raw = rows[0]["full_exposed_pop"]
        total_pop = int(round(float(pop_raw if pop_raw is not None else 0.0)))
        return [dict(r) for r in rows], total_cells, total_pop
