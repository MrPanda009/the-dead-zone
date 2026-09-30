"""Database repository for Historical Disaster Losses and Statistics."""

from typing import Any, List, Optional
from sqlalchemy import text
from sqlalchemy.orm import Session


class StatsRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_available_states(self) -> List[str]:
        """Returns sorted list of distinct states present in disaster tables."""
        query = text("""
            SELECT DISTINCT state_name FROM historical_disaster_loss
            UNION
            SELECT DISTINCT state_name FROM ncrb_natural_hazard_casualty
            ORDER BY state_name ASC;
        """)
        rows = self.db.execute(query).fetchall()
        return [r[0] for r in rows if r[0]]

    def get_historical_losses(
        self, state_name: Optional[str] = None, from_year: int = 2014, to_year: int = 2024
    ) -> List[dict[str, Any]]:
        conditions = ["year_start >= :from_year", "year_end <= :to_year"]
        params: dict[str, Any] = {"from_year": from_year, "to_year": to_year}
        if state_name and state_name.lower() != "all":
            conditions.append("lower(state_name) = lower(:state_name)")
            params["state_name"] = state_name

        where_clause = " AND ".join(conditions)
        query = text(f"""
            SELECT
                year_label,
                year_start,
                year_end,
                lives_lost,
                cattle_lost,
                houses_damaged,
                crop_area_affected_ha,
                hazard_types_included,
                source_uuid,
                source_title,
                source_ministry,
                data_quality_notes
            FROM historical_disaster_loss
            WHERE {where_clause}
            ORDER BY year_start ASC, year_end ASC;
        """)
        return [dict(r) for r in self.db.execute(query, params).mappings().all()]

    def get_ncrb_casualties(
        self, state_name: Optional[str] = None, from_year: int = 2019, to_year: int = 2024
    ) -> List[dict[str, Any]]:
        conditions = ["calendar_year >= :from_year", "calendar_year <= :to_year"]
        params: dict[str, Any] = {"from_year": from_year, "to_year": to_year}
        if state_name and state_name.lower() != "all":
            conditions.append("lower(state_name) = lower(:state_name)")
            params["state_name"] = state_name

        where_clause = " AND ".join(conditions)
        query = text(f"""
            SELECT
                calendar_year,
                landslide_deaths,
                flash_flood_deaths,
                flood_deaths,
                cloudburst_deaths,
                cyclone_deaths,
                avalanche_deaths,
                lightning_deaths,
                cold_heat_wave_deaths,
                other_nature_deaths,
                total_deaths,
                source_uuid
            FROM ncrb_natural_hazard_casualty
            WHERE {where_clause}
            ORDER BY calendar_year ASC;
        """)
        return [dict(r) for r in self.db.execute(query, params).mappings().all()]

    def get_cwc_flood_damages(
        self, state_name: Optional[str] = None, from_year: int = 2014, to_year: int = 2024
    ) -> List[dict[str, Any]]:
        conditions = ["calendar_year >= :from_year", "calendar_year <= :to_year"]
        params: dict[str, Any] = {"from_year": from_year, "to_year": to_year}
        if state_name and state_name.lower() != "all":
            conditions.append("lower(state_name) = lower(:state_name)")
            params["state_name"] = state_name

        where_clause = " AND ".join(conditions)
        query = text(f"""
            SELECT
                calendar_year,
                area_affected_mha,
                population_affected_m,
                human_lives_lost,
                cattle_lost,
                houses_damaged_count,
                total_damage_crores,
                source_uuid
            FROM cwc_flood_damage_record
            WHERE {where_clause}
            ORDER BY calendar_year ASC;
        """)
        return [dict(r) for r in self.db.execute(query, params).mappings().all()]

    def get_highway_damage(self, state_name: Optional[str] = None) -> Optional[dict[str, Any]]:
        if not state_name or state_name.lower() == "all":
            return None
        query = text("""
            SELECT state_name, reporting_period, damaged_length_km, disaster_triggers, source_uuid
            FROM highway_disaster_damage
            WHERE lower(state_name) = lower(:state_name)
            LIMIT 1;
        """)
        row = self.db.execute(query, {"state_name": state_name}).mappings().first()
        return dict(row) if row else None

    def get_relief_allocations(
        self, state_name: Optional[str] = None, from_year: int = 2014, to_year: int = 2024
    ) -> List[dict[str, Any]]:
        conditions: list[str] = []
        params: dict[str, Any] = {}
        if state_name and state_name.lower() != "all":
            conditions.append("lower(state_name) = lower(:state_name)")
            params["state_name"] = state_name

        where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        query = text(f"""
            SELECT
                fiscal_year,
                sdrf_central_share_cr,
                sdrf_state_share_cr,
                ndrf_releases_cr,
                lives_saved_count,
                source_uuid
            FROM disaster_relief_allocation
            {where_clause}
            ORDER BY fiscal_year ASC;
        """)
        return [dict(r) for r in self.db.execute(query, params).mappings().all()]

    def get_case_studies(self, slug: Optional[str] = None) -> List[dict[str, Any]]:
        conditions: list[str] = []
        params: dict[str, Any] = {}
        if slug:
            conditions.append("slug = :slug")
            params["slug"] = slug

        where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        query = text(f"""
            SELECT
                slug,
                title,
                disaster_type,
                state_name,
                location_name,
                event_date,
                fatalities,
                injured,
                missing,
                compensation_cr,
                summary,
                geotechnical_context,
                response_actions,
                source_refs
            FROM disaster_case_study
            {where_clause}
            ORDER BY event_date DESC;
        """)
        rows = self.db.execute(query, params).mappings().all()
        result: list[dict[str, Any]] = []
        for r in rows:
            d = dict(r)
            d["event_date"] = str(d["event_date"])
            result.append(d)
        return result

    def get_state_loss_summary(self, state_name: str) -> dict[str, Any]:
        """Calculates aggregate disaster metrics and dominant hazard killer for a state."""
        loss_q = text("""
            SELECT
                COALESCE(SUM(lives_lost), 0) AS total_lives,
                COALESCE(SUM(houses_damaged), 0) AS total_houses,
                COALESCE(SUM(cattle_lost), 0) AS total_cattle,
                COALESCE(SUM(crop_area_affected_ha), 0.0) AS total_crop,
                COUNT(*) AS count_years
            FROM historical_disaster_loss
            WHERE lower(state_name) = lower(:state_name);
        """)
        lrow = self.db.execute(loss_q, {"state_name": state_name}).mappings().first()

        ncrb_q = text("""
            SELECT
                SUM(landslide_deaths) AS total_landslide,
                SUM(flood_deaths + flash_flood_deaths) AS total_flood,
                SUM(lightning_deaths) AS total_lightning,
                SUM(cyclone_deaths) AS total_cyclone
            FROM ncrb_natural_hazard_casualty
            WHERE lower(state_name) = lower(:state_name);
        """)
        nrow = self.db.execute(ncrb_q, {"state_name": state_name}).mappings().first()

        total_lives = int(lrow["total_lives"] or 0) if lrow else 0
        total_houses = int(lrow["total_houses"] or 0) if lrow else 0
        total_cattle = int(lrow["total_cattle"] or 0) if lrow else 0
        total_crop = float(lrow["total_crop"] or 0.0) if lrow else 0.0
        n_years = max(1, int(lrow["count_years"] or 1)) if lrow else 1

        dominant = "Flood / Heavy Rain"
        if nrow:
            landslides = int(nrow["total_landslide"] or 0)
            floods = int(nrow["total_flood"] or 0)
            lightning = int(nrow["total_lightning"] or 0)
            if landslides > floods and landslides > lightning:
                dominant = "Landslide / Debris Flow"
            elif lightning > floods and lightning > landslides:
                dominant = "Lightning Strikes"

        return {
            "state_name": state_name,
            "total_lives_lost": total_lives,
            "total_houses_damaged": total_houses,
            "total_cattle_lost": total_cattle,
            "total_crop_area_ha": total_crop,
            "dominant_hazard_killer": dominant,
            "avg_annual_deaths": round(total_lives / n_years, 1),
        }
