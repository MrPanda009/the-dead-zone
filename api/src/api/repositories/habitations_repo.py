"""Database repository for Habitations, Prioritized Queues, and Risk Dossiers."""

from typing import Optional, Any
from sqlalchemy import text
from sqlalchemy.orm import Session


class HabitationsRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def query_habitations(
        self,
        admin_id: Optional[int] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[dict[str, Any]], int]:
        """Queries habitations with demographics, admin details, and vulnerability."""
        conditions = ["1=1"]
        params: dict[str, Any] = {"limit": limit, "offset": offset}

        if admin_id is not None:
            conditions.append("(h.admin_id = :admin_id OR a.lgd_code = :admin_id)")
            params["admin_id"] = admin_id

        where_clause = " AND ".join(conditions)

        count_query = text(f"""
            SELECT count(*) 
            FROM habitation h
            LEFT JOIN admin_boundary a ON h.admin_id = a.id
            WHERE {where_clause};
        """)
        total = self.db.execute(count_query, params).scalar() or 0

        query = text(f"""
            SELECT 
                h.id,
                h.lgd_code,
                h.name,
                h.type,
                h.admin_id,
                a.name as admin_name,
                h.population,
                h.households,
                ST_X(h.geom_point::geometry) as lon,
                ST_Y(h.geom_point::geometry) as lat,
                v.v_demographic,
                v.v_structural,
                v.v_access,
                v.v_economic,
                v.v_index,
                v.is_district_flat
            FROM habitation h
            LEFT JOIN admin_boundary a ON h.admin_id = a.id
            LEFT JOIN vulnerability v ON h.id = v.habitation_id
            WHERE {where_clause}
            ORDER BY h.id ASC;
        """)

        results = self.db.execute(query, params).mappings().all()
        return [dict(r) for r in results], total

    def get_habitation_by_id(self, habitation_id: int) -> Optional[dict[str, Any]]:
        """Queries single habitation with vulnerability details."""
        query = text("""
            SELECT 
                h.id,
                h.lgd_code,
                h.name,
                h.type,
                h.admin_id,
                a.name as admin_name,
                h.population,
                h.households,
                ST_X(h.geom_point::geometry) as lon,
                ST_Y(h.geom_point::geometry) as lat,
                v.v_demographic,
                v.v_structural,
                v.v_access,
                v.v_economic,
                v.v_index,
                v.is_district_flat
            FROM habitation h
            LEFT JOIN admin_boundary a ON h.admin_id = a.id
            LEFT JOIN vulnerability v ON h.id = v.habitation_id
            WHERE h.id = :id;
        """)

        result = self.db.execute(query, {"id": habitation_id}).mappings().first()
        if not result:
            return None
        return dict(result)

    def get_nearby_disaster_events(self, lon: float, lat: float, radius_km: float = 15.0) -> list[dict[str, Any]]:
        """Queries historical disaster events within radius of habitation."""
        query = text("""
            SELECT 
                id,
                ts,
                hazard_type,
                fatalities,
                injured,
                houses_damaged,
                severity,
                source,
                source_ref,
                ST_Distance(
                    geom::geography,
                    ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography
                ) / 1000.0 as distance_km
            FROM disaster_event
            WHERE ST_DWithin(
                geom::geography,
                ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                :radius_m
            )
            ORDER BY ts DESC;
        """)

        results = self.db.execute(
            query,
            {"lon": lon, "lat": lat, "radius_m": radius_km * 1000.0},
        ).mappings().all()
        return [dict(r) for r in results]
