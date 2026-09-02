"""PostGIS Repository for Candidate Relocation Sites.

Section refs: docs/PRD1.md §6.8, §9.5, §9.6
"""

from __future__ import annotations

import json
from typing import Any, Optional, Sequence
from sqlalchemy import text
from sqlalchemy.orm import Session


class SitesRepository:
    """PostGIS data access for candidate relocation sites and spatial queries."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def check_habitation_exists(self, habitation_id: int) -> bool:
        """Verifies whether a source habitation exists."""
        stmt = text("SELECT 1 FROM habitation WHERE id = :id LIMIT 1;")
        res = self.db.execute(stmt, {"id": habitation_id}).scalar()
        return bool(res)

    def query_candidate_sites_for_habitation(
        self,
        habitation_id: int,
        radius_m: float = 15000.0,
        limit: int = 50,
        offset: int = 0,
        min_suitability: Optional[int] = None,
    ) -> tuple[list[dict[str, Any]], int]:
        """Queries candidate relocation sites within radius of a source habitation.
        
        Uses spatial indexing on geography centroid:
        ST_DWithin(h.geom_point::geography, cs.centroid::geography, :radius_m).
        Ranks by suitability DESC NULLS LAST, cc_final DESC, distance_km ASC, id ASC.
        """
        where_clauses = ["h.id = :habitation_id"]
        params: dict[str, Any] = {
            "habitation_id": habitation_id,
            "radius_m": float(radius_m),
            "limit": limit,
            "offset": offset,
        }

        if min_suitability is not None:
            where_clauses.append("cs.suitability >= :min_suitability")
            params["min_suitability"] = int(min_suitability)

        where_sql = " AND ".join(where_clauses)

        sql = f"""
            SELECT
                cs.id,
                cs.area_ha,
                cs.tenure,
                cs.slope_mean,
                cs.mhi_max,
                cs.cc_land,
                cs.cc_water,
                cs.cc_school,
                cs.cc_health,
                cs.cc_final,
                cs.binding_constraint,
                cs.augmented,
                cs.suitability,
                cs.metadata as metadata_info,
                ST_X(cs.centroid::geometry) as lon,
                ST_Y(cs.centroid::geometry) as lat,
                ST_Distance(h.geom_point::geography, cs.centroid::geography) / 1000.0 as distance_km,
                count(*) OVER() as full_count
            FROM habitation h
            JOIN candidate_site cs
              ON ST_DWithin(h.geom_point::geography, cs.centroid::geography, :radius_m)
            WHERE {where_sql}
            ORDER BY cs.suitability DESC NULLS LAST, cs.cc_final DESC, distance_km ASC, cs.id ASC
            LIMIT :limit OFFSET :offset;
        """

        rows = self.db.execute(text(sql), params).mappings().fetchall()
        if not rows:
            return [], 0

        total = rows[0]["full_count"]
        return [dict(r) for r in rows], int(total)

    def get_candidate_site_by_id(self, site_id: int) -> Optional[dict[str, Any]]:
        """Retrieves a single candidate site by ID with GeoJSON geometry and centroid."""
        sql = """
            SELECT
                cs.id,
                cs.area_ha,
                cs.tenure,
                cs.slope_mean,
                cs.mhi_max,
                cs.cc_land,
                cs.cc_water,
                cs.cc_school,
                cs.cc_health,
                cs.cc_final,
                cs.binding_constraint,
                cs.augmented,
                cs.suitability,
                cs.metadata as metadata_info,
                ST_X(cs.centroid::geometry) as lon,
                ST_Y(cs.centroid::geometry) as lat,
                ST_AsGeoJSON(cs.geom) as geojson_geom
            FROM candidate_site cs
            WHERE cs.id = :id
            LIMIT 1;
        """
        row = self.db.execute(text(sql), {"id": site_id}).mappings().first()
        if not row:
            return None
        return dict(row)

    def count_sites(self) -> int:
        """Counts total candidate sites stored in the database."""
        stmt = text("SELECT count(*) FROM candidate_site;")
        return int(self.db.execute(stmt).scalar() or 0)
