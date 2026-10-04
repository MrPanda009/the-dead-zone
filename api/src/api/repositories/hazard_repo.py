"""Database repository for static hazard layers served to the vector map.

Reads `hazard_static` (+ `hazard_static_flood`) directly rather than going through
`mhi_snapshot`, which the flood pipeline never populates.
"""

from typing import Optional, Any
from sqlalchemy import text
from sqlalchemy.orm import Session


class HazardRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def query_layer_cells(
        self,
        hazard_type: str,
        res: int,
        min_lon: Optional[float] = None,
        min_lat: Optional[float] = None,
        max_lon: Optional[float] = None,
        max_lat: Optional[float] = None,
        admin: Optional[int] = None,
        min_susceptibility: float = 0.0,
        regime: Optional[str] = None,
        limit: int = 20000,
    ) -> list[dict[str, Any]]:
        """Returns hazard cells for a viewport, ordered by descending susceptibility.

        Ordering matters: when `limit` clips the result set, the client keeps the most
        hazardous cells rather than an arbitrary spatial slice.
        """
        conditions = ["h.hazard_type = :hazard_type", "g.res = :res"]
        params: dict[str, Any] = {
            "hazard_type": hazard_type,
            "res": res,
            "limit": limit,
        }

        if None not in (min_lon, min_lat, max_lon, max_lat):
            conditions.append(
                "g.geom && ST_MakeEnvelope(:min_lon, :min_lat, :max_lon, :max_lat, 4326)"
            )
            params.update({
                "min_lon": min_lon,
                "min_lat": min_lat,
                "max_lon": max_lon,
                "max_lat": max_lat,
            })

        admin_join = ""
        if admin is not None:
            admin_join = "LEFT JOIN admin_boundary a ON g.admin_id = a.id"
            conditions.append("(g.admin_id = :admin OR a.lgd_code = :admin)")
            params["admin"] = admin

        if min_susceptibility > 0.0:
            # Hard-zero and no-coverage cells are semantically meaningful at 0.0, so the
            # filter only applies once the caller explicitly asks for a floor above zero.
            conditions.append("h.susceptibility >= :min_susceptibility")
            params["min_susceptibility"] = min_susceptibility

        if regime is not None:
            conditions.append("f.hazard_regime = :regime")
            params["regime"] = regime

        where_clause = " AND ".join(conditions)

        query = text(f"""
            SELECT
                g.h3,
                h.susceptibility,
                h.confidence,
                h.quality_flag,
                h.model_version,
                f.hard_zero_fraction,
                f.hazard_regime
            FROM hazard_static h
            JOIN grid_cell g ON g.h3 = h.h3
            {admin_join}
            LEFT JOIN hazard_static_flood f ON f.h3 = h.h3
            WHERE {where_clause}
            ORDER BY h.susceptibility DESC
            LIMIT :limit;
        """)

        return [dict(r) for r in self.db.execute(query, params).mappings().all()]

    def query_layer_statistics(
        self,
        hazard_type: str,
        res: int,
        min_lon: Optional[float] = None,
        min_lat: Optional[float] = None,
        max_lon: Optional[float] = None,
        max_lat: Optional[float] = None,
        admin: Optional[int] = None,
        regime: Optional[str] = None,
        quantiles: Optional[list[float]] = None,
    ) -> Optional[dict[str, Any]]:
        """Computes quantile class breaks and the confidence ceiling over the same population.

        `percentile_cont` runs in PostgreSQL so the breaks describe every matching cell,
        not just the page the client received.
        """
        if quantiles is None:
            quantiles = [0.25, 0.5, 0.75, 0.9, 0.95, 0.99]

        conditions = ["h.hazard_type = :hazard_type", "g.res = :res"]
        params: dict[str, Any] = {
            "hazard_type": hazard_type,
            "res": res,
            "quantiles": quantiles,
        }

        if None not in (min_lon, min_lat, max_lon, max_lat):
            conditions.append(
                "g.geom && ST_MakeEnvelope(:min_lon, :min_lat, :max_lon, :max_lat, 4326)"
            )
            params.update({
                "min_lon": min_lon,
                "min_lat": min_lat,
                "max_lon": max_lon,
                "max_lat": max_lat,
            })

        admin_join = ""
        if admin is not None:
            admin_join = "LEFT JOIN admin_boundary a ON g.admin_id = a.id"
            conditions.append("(g.admin_id = :admin OR a.lgd_code = :admin)")
            params["admin"] = admin

        regime_join = ""
        if regime is not None:
            regime_join = "LEFT JOIN hazard_static_flood f ON f.h3 = h.h3"
            conditions.append("f.hazard_regime = :regime")
            params["regime"] = regime
        if regime != "channel":
            # Channel cells carry a placeholder 0.0; they must not skew breaks, domain or the mean.
            conditions.append("h.quality_flag <> 'channel_excluded'")

        where_clause = " AND ".join(conditions)

        query = text(f"""
            SELECT
                COUNT(*) AS cell_count,
                MIN(h.susceptibility) AS min_susceptibility,
                MAX(h.susceptibility) AS max_susceptibility,
                AVG(h.susceptibility) AS mean_susceptibility,
                MAX(h.confidence) AS confidence_ceiling,
                MAX(h.model_version) AS model_version,
                COUNT(*) FILTER (WHERE h.quality_flag = 'full') AS full_count,
                COUNT(*) FILTER (WHERE h.quality_flag = 'low_coverage') AS low_coverage_count,
                COUNT(*) FILTER (WHERE h.quality_flag = 'no_coverage') AS no_coverage_count,
                COUNT(*) FILTER (WHERE h.quality_flag = 'channel_excluded') AS channel_excluded_count,
                percentile_cont(CAST(:quantiles AS double precision[]))
                    WITHIN GROUP (ORDER BY h.susceptibility) AS breaks
            FROM hazard_static h
            JOIN grid_cell g ON g.h3 = h.h3
            {admin_join}
            {regime_join}
            WHERE {where_clause};
        """)

        row = self.db.execute(query, params).mappings().first()
        if not row or not row["cell_count"]:
            return None
        return dict(row)

    def list_layers(self) -> list[dict[str, Any]]:
        """Enumerates every published static hazard layer with its headline statistics."""
        query = text("""
            SELECT
                h.hazard_type,
                g.res,
                COUNT(*) AS cell_count,
                MAX(h.model_version) AS model_version,
                MIN(h.susceptibility) AS min_susceptibility,
                MAX(h.susceptibility) AS max_susceptibility,
                AVG(h.susceptibility) AS mean_susceptibility,
                MAX(h.confidence) AS confidence_ceiling
            FROM hazard_static h
            JOIN grid_cell g ON g.h3 = h.h3
            GROUP BY h.hazard_type, g.res
            ORDER BY h.hazard_type, g.res;
        """)
        return [dict(r) for r in self.db.execute(query).mappings().all()]

    def get_cell_detail(self, h3_int: int, hazard_type: str) -> Optional[dict[str, Any]]:
        """Retrieves one cell with its flood driver metrics for the dossier panel."""
        query = text("""
            SELECT
                g.h3,
                g.res,
                g.population,
                ST_X(g.centroid::geometry) AS lon,
                ST_Y(g.centroid::geometry) AS lat,
                a.name AS admin_name,
                h.hazard_type,
                h.susceptibility,
                h.confidence,
                h.quality_flag,
                h.model_version,
                f.max_susceptibility,
                f.valid_pixel_fraction,
                f.hard_zero_fraction,
                f.mean_inundation_frequency,
                f.mean_hand_m,
                f.min_hand_m,
                f.mean_slope_deg,
                f.mean_cropland_fraction,
                f.mean_anomalous_frequency,
                f.jrc_occurrence_mean,
                f.baseline_water_fraction,
                f.hazard_regime,
                f.dist_tributary_m,
                f.dist_mainstem_m,
                f.observation_ceiling
            FROM hazard_static h
            JOIN grid_cell g ON g.h3 = h.h3
            LEFT JOIN admin_boundary a ON g.admin_id = a.id
            LEFT JOIN hazard_static_flood f ON f.h3 = h.h3
            WHERE h.h3 = :h3 AND h.hazard_type = :hazard_type;
        """)
        row = self.db.execute(query, {"h3": h3_int, "hazard_type": hazard_type}).mappings().first()
        return dict(row) if row else None

    def get_confidence_ceiling(self, hazard_type: str) -> float:
        """Returns the maximum confidence present in a layer, for client-side normalisation."""
        query = text("""
            SELECT MAX(confidence) AS ceiling
            FROM hazard_static
            WHERE hazard_type = :hazard_type;
        """)
        row = self.db.execute(query, {"hazard_type": hazard_type}).mappings().first()
        ceiling = row["ceiling"] if row else None
        return float(ceiling) if ceiling else 1.0

    def get_district_summary(
        self,
        admin_identifier: int,
        hazard_type: str = "riverine_flood",
    ) -> Optional[dict[str, Any]]:
        """Computes district-level rollup: band shares, habitations & population at risk, drivers."""
        admin_row = self.db.execute(
            text(
                "SELECT id, name, lgd_code FROM admin_boundary "
                "WHERE id = :admin OR lgd_code = :admin LIMIT 1;"
            ),
            {"admin": admin_identifier},
        ).mappings().first()

        if not admin_row:
            return None

        admin_id = int(admin_row["id"])
        admin_name = str(admin_row["name"])
        lgd_code = int(admin_row["lgd_code"]) if admin_row["lgd_code"] is not None else None

        # Check if cells exist for this hazard_type in this admin
        land = "h.quality_flag <> 'channel_excluded'"
        cell_stats_query = text(f"""
            SELECT
                COUNT(*) FILTER (WHERE {land}) AS total_cells,
                COUNT(*) FILTER (WHERE h.quality_flag = 'channel_excluded') AS channel_count,
                COUNT(*) FILTER (WHERE h.quality_flag = 'full') AS full_count,
                COUNT(*) FILTER (WHERE h.quality_flag = 'low_coverage') AS low_coverage_count,
                COUNT(*) FILTER (WHERE h.quality_flag = 'no_coverage') AS no_coverage_count,
                COUNT(*) FILTER (WHERE {land} AND h.susceptibility < 0.20) AS band_very_low,
                COUNT(*) FILTER (WHERE {land} AND h.susceptibility >= 0.20 AND h.susceptibility < 0.40) AS band_low,
                COUNT(*) FILTER (WHERE {land} AND h.susceptibility >= 0.40 AND h.susceptibility < 0.60) AS band_moderate,
                COUNT(*) FILTER (WHERE {land} AND h.susceptibility >= 0.60 AND h.susceptibility < 0.80) AS band_high,
                COUNT(*) FILTER (WHERE {land} AND h.susceptibility >= 0.80) AS band_very_high,
                AVG(h.susceptibility) FILTER (WHERE {land}) AS mean_susceptibility,
                MAX(h.susceptibility) FILTER (WHERE {land}) AS max_susceptibility,
                MAX(h.model_version) AS model_version
            FROM hazard_static h
            JOIN grid_cell g ON g.h3 = h.h3
            WHERE g.admin_id = :admin_id AND h.hazard_type = :hazard_type;
        """)
        cell_stats = (
            self.db.execute(
                cell_stats_query, {"admin_id": admin_id, "hazard_type": hazard_type}
            )
            .mappings()
            .first()
        )

        total_cells = int(cell_stats["total_cells"] or 0) if cell_stats else 0
        if total_cells == 0:
            return {
                "admin_id": admin_id,
                "admin_name": admin_name,
                "lgd_code": lgd_code,
                "hazard_type": hazard_type,
                "model_status": "not_computed",
                "model_version": None,
                "total_cells": 0,
                "coverage": {"full": 0, "low_coverage": 0, "no_coverage": 0, "channel_excluded": 0},
                "unmeasured_cells_count": 0,
                "band_distribution": {
                    "very_low": 0.0,
                    "low": 0.0,
                    "moderate": 0.0,
                    "high": 0.0,
                    "very_high": 0.0,
                },
                "mean_susceptibility": 0.0,
                "max_susceptibility": 0.0,
                "habitations_at_risk_count": 0,
                "population_at_risk_sum": 0,
                "drivers_summary": None,
                "regime_summary": [],
                "last_recorded_flood_loss": None,
            }

        # Query habitations at risk (cells with susceptibility >= 0.50)
        hab_query = text("""
            SELECT
                COUNT(DISTINCT hab.id) AS hab_count,
                COALESCE(SUM(hab.population), 0) AS pop_sum
            FROM habitation hab
            JOIN grid_cell g ON (g.habitation_id = hab.id OR ST_Contains(g.geom, hab.geom_point))
            JOIN hazard_static h ON h.h3 = g.h3 AND h.hazard_type = :hazard_type
            WHERE hab.admin_id = :admin_id AND h.susceptibility >= 0.50;
        """)
        hab_stats = (
            self.db.execute(hab_query, {"admin_id": admin_id, "hazard_type": hazard_type})
            .mappings()
            .first()
        )
        hab_at_risk = int(hab_stats["hab_count"] or 0) if hab_stats else 0
        pop_at_risk = int(hab_stats["pop_sum"] or 0) if hab_stats else 0

        # Query drivers summary if flood
        driver_stats = None
        if hazard_type == "riverine_flood":
            driver_query = text("""
                SELECT
                    AVG(f.mean_inundation_frequency) AS mean_inundation_frequency,
                    AVG(f.mean_hand_m) AS mean_hand_m,
                    MIN(f.min_hand_m) AS min_hand_m,
                    AVG(f.mean_slope_deg) AS mean_slope_deg,
                    AVG(f.mean_cropland_fraction) AS mean_cropland_fraction
                FROM hazard_static_flood f
                JOIN grid_cell g ON g.h3 = f.h3
                WHERE g.admin_id = :admin_id;
            """)
            drow = self.db.execute(driver_query, {"admin_id": admin_id}).mappings().first()
            if drow and drow["mean_hand_m"] is not None:
                driver_stats = {
                    "mean_inundation_frequency": round(
                        float(drow["mean_inundation_frequency"] or 0.0), 4
                    ),
                    "mean_hand_m": round(float(drow["mean_hand_m"] or 0.0), 2),
                    "min_hand_m": round(float(drow["min_hand_m"] or 0.0), 2),
                    "mean_slope_deg": round(float(drow["mean_slope_deg"] or 0.0), 2),
                    "mean_cropland_fraction": round(
                        float(drow["mean_cropland_fraction"] or 0.0), 4
                    ),
                }

        # Query last recorded flood loss for state
        state_mapping = {
            "barpeta": "Assam",
            "dholpur": "Rajasthan",
            "morena": "Madhya Pradesh",
            "wayanad": "Kerala",
            "kodagu": "Karnataka",
        }
        state_name = state_mapping.get(admin_name.lower(), admin_name)
        cwc_query = text("""
            SELECT calendar_year, human_lives_lost, houses_damaged_count, total_damage_crores
            FROM cwc_flood_damage_record
            WHERE lower(state_name) = lower(:state_name)
            ORDER BY calendar_year DESC LIMIT 1;
        """)
        cwc_row = self.db.execute(cwc_query, {"state_name": state_name}).mappings().first()
        last_loss = (
            {
                "calendar_year": int(cwc_row["calendar_year"]),
                "human_lives_lost": int(cwc_row["human_lives_lost"] or 0),
                "houses_damaged_count": int(cwc_row["houses_damaged_count"] or 0),
                "total_damage_crores": float(cwc_row["total_damage_crores"] or 0.0),
            }
            if cwc_row
            else None
        )

        model_version_str = str(cell_stats["model_version"] or "")
        is_modeled = "flood-susceptibility" in model_version_str

        return {
            "admin_id": admin_id,
            "admin_name": admin_name,
            "lgd_code": lgd_code,
            "hazard_type": hazard_type,
            "model_status": "computed" if is_modeled else "not_computed",
            "model_version": cell_stats["model_version"],
            "total_cells": total_cells,
            "coverage": {
                "full": int(cell_stats["full_count"] or 0),
                "low_coverage": int(cell_stats["low_coverage_count"] or 0),
                "no_coverage": int(cell_stats["no_coverage_count"] or 0),
                "channel_excluded": int(cell_stats["channel_count"] or 0),
            },
            "unmeasured_cells_count": int(cell_stats["no_coverage_count"] or 0),
            "band_distribution": {
                "very_low": round(float(cell_stats["band_very_low"] or 0) / total_cells, 4),
                "low": round(float(cell_stats["band_low"] or 0) / total_cells, 4),
                "moderate": round(float(cell_stats["band_moderate"] or 0) / total_cells, 4),
                "high": round(float(cell_stats["band_high"] or 0) / total_cells, 4),
                "very_high": round(float(cell_stats["band_very_high"] or 0) / total_cells, 4),
            },
            "mean_susceptibility": round(float(cell_stats["mean_susceptibility"] or 0.0), 4),
            "max_susceptibility": round(float(cell_stats["max_susceptibility"] or 0.0), 4),
            "habitations_at_risk_count": hab_at_risk,
            "population_at_risk_sum": pop_at_risk,
            "drivers_summary": driver_stats,
            "regime_summary": self._regime_summary(admin_id, hazard_type),
            "last_recorded_flood_loss": last_loss,
        }

    def _regime_summary(self, admin_id: int, hazard_type: str) -> list[dict[str, Any]]:
        """Cells, population and mean susceptibility per hazard regime (flood layers only)."""
        if hazard_type != "riverine_flood":
            return []
        rows = self.db.execute(
            text("""
                SELECT
                    f.hazard_regime AS regime,
                    COUNT(*) AS cell_count,
                    COALESCE(SUM(g.population), 0) AS population,
                    AVG(h.susceptibility) FILTER (WHERE h.quality_flag <> 'channel_excluded')
                        AS mean_susceptibility
                FROM hazard_static h
                JOIN grid_cell g ON g.h3 = h.h3
                JOIN hazard_static_flood f ON f.h3 = h.h3
                WHERE g.admin_id = :admin_id
                  AND h.hazard_type = :hazard_type
                  AND f.hazard_regime IS NOT NULL
                GROUP BY f.hazard_regime
                ORDER BY cell_count DESC;
            """),
            {"admin_id": admin_id, "hazard_type": hazard_type},
        ).mappings().all()
        return [
            {
                "regime": r["regime"],
                "cell_count": int(r["cell_count"]),
                "population": int(round(float(r["population"] or 0))),
                "mean_susceptibility": (
                    None if r["regime"] == "channel" or r["mean_susceptibility"] is None
                    else round(float(r["mean_susceptibility"]), 4)
                ),
            }
            for r in rows
        ]

    def get_admin_boundary(self, admin: int) -> Optional[dict[str, Any]]:
        """Resolves an admin boundary by id or lgd_code."""
        sql = text(
            """
            SELECT id, name, lgd_code, level
            FROM admin_boundary
            WHERE id = :admin OR lgd_code = :admin
            LIMIT 1
            """
        )
        row = self.db.execute(sql, {"admin": admin}).fetchone()
        if not row:
            return None
        return {
            "id": row[0],
            "name": row[1],
            "lgd_code": row[2],
            "level": row[3],
        }

