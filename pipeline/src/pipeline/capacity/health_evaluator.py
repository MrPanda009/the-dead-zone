"""Spatial Healthcare Carrying Capacity Evaluator for Candidate Relocation Sites.

Implements the WHO AccessMod / Tobler's Anisotropic Hiking Function for terrain velocity decay,
IPHS 2022 Guidelines ('Time to Care') for primary lifelines (Sub-Centres, PHCs, CHCs),
and NDMA / CWC Flood Resilience criteria to filter out facilities in active flood channels.

Assigns each candidate site to its nearest accessible qualifying primary health facility
under a 75% baseline utilization standard (25% spare capacity for relocated households).
Evaluates CC_health, recomputes CC_final via CapacityEngine argmin bottleneck logic,
and updates candidate_site records with honest assessment statuses.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from typing import Any, Optional

from sqlalchemy import text
from sqlalchemy.engine import Connection

from core.domain.capacity import CapacityEngine
from core.enums import AssessmentStatus, BindingConstraint

logger = logging.getLogger(__name__)


def tobler_velocity_kmh(slope_deg: float) -> float:
    """WHO AccessMod / Tobler's Hiking Function: v = 6 * exp(-3.5 * |tan(slope) + 0.05|).
    
    Models empirical human walking velocity decay over sloped terrain.
    Gradient S = tan(slope_deg * pi / 180).
    Offset 0.05 corresponds to maximum walking speed on a slight decline (~-2.86°).
    """
    rad = math.radians(max(0.0, slope_deg))
    s = math.tan(rad)
    v = 6.0 * math.exp(-3.5 * abs(s + 0.05))
    return max(0.5, v)


# Motorization transit multipliers matching IPHS accessibility modes:
SPEED_MULTIPLIERS: dict[str, float] = {
    "sub_cen": 1.0,   # Pedestrian / local non-motorized rickshaw
    "phc": 2.5,       # Feeder road transit / motorcycle / rural ambulance
    "chc": 3.5,       # Arterial bus / dedicated transport
}

# IPHS "Time to Care" maximum allowable travel ceilings:
IPHS_TIME_CEILINGS_HOURS: dict[str, float] = {
    "sub_cen": 0.75,  # 45 minutes
    "phc": 1.00,      # 60 minutes
    "chc": 1.50,      # 90 minutes
}


@dataclass(frozen=True)
class SiteHealthResult:
    """Carrying capacity evaluation result for an individual site."""
    site_id: int
    accessible_facility_count: int
    accessible_norm_population: int
    assigned_facility_id: Optional[int]
    assigned_facility_type: Optional[str]
    assigned_dist_km: Optional[float]
    travel_time_hours: Optional[float]
    cc_land: Optional[int]
    cc_health: int
    cc_final: Optional[int]
    binding_constraint: Optional[str]
    assessment_status: str


@dataclass
class HealthEvaluationReport:
    """Summary report for district health capacity evaluation."""
    district_name: str
    admin_id: int
    total_sites: int = 0
    updated_sites: int = 0
    facilities_in_district: int = 0
    binding_counts: dict[str, int] = field(default_factory=dict)
    mean_cc_health: float = 0.0
    min_cc_health: int = 0
    max_cc_health: int = 0
    sites_unserved_by_health: int = 0


class HealthCapacityEvaluator:
    """Evaluates healthcare carrying capacity for candidate relocation sites."""

    def __init__(
        self,
        capacity_engine: Optional[CapacityEngine] = None,
        search_radius_m: float = 12000.0,
        catchment_utilization_pct: float = 0.75,
    ) -> None:
        self.capacity_engine = capacity_engine or CapacityEngine()
        self.search_radius_m = search_radius_m
        self.catchment_utilization_pct = max(0.0, min(0.95, catchment_utilization_pct))

    def evaluate_district(
        self,
        conn: Connection,
        admin_id: int,
        district_name: str,
        dry_run: bool = False,
    ) -> HealthEvaluationReport:
        """Evaluates health capacity for all candidate sites in the given district."""
        fac_count = conn.execute(
            text("SELECT count(*) FROM health_facility WHERE admin_id = :admin_id"),
            {"admin_id": admin_id},
        ).scalar() or 0

        # Query candidate sites joined with up to 5 nearest qualifying primary facilities
        # Invariants applied in SQL:
        # 1. Exclude tertiary facilities ('s_t_h', 'dis_h') - only primary/secondary lifelines ('sub_cen', 'phc', 'chc')
        # 2. NDMA / CWC flood exclusion: subtract clinics in active floodways (mean_inundation_frequency < 0.25 AND mean_hand_m >= 1.0)
        # 3. Spatial bounding window: ST_DWithin(cs.geom::geography, hf.geom::geography, :radius_m)
        query = text("""
            SELECT 
                cs.id AS site_id,
                cs.cc_land,
                cs.cc_water,
                cs.cc_school,
                cs.assessment_status,
                COALESCE(cs.slope_mean, 0.0) AS site_slope,
                best_hf.facility_id,
                best_hf.facility_type,
                best_hf.norm_population,
                best_hf.dist_km,
                best_hf.facility_slope,
                best_hf.inundation_freq
            FROM candidate_site cs
            LEFT JOIN LATERAL (
                SELECT 
                    hf.id AS facility_id,
                    hf.facility_type,
                    hf.norm_population,
                    ST_Distance(cs.geom::geography, hf.geom::geography) / 1000.0 AS dist_km,
                    COALESCE(hsf.mean_slope_deg, cs.slope_mean, 0.0) AS facility_slope,
                    COALESCE(hsf.mean_inundation_frequency, 0.0) AS inundation_freq
                FROM health_facility hf
                LEFT JOIN hazard_static_flood hsf ON hf.h3_res8 = hsf.h3
                WHERE hf.admin_id = :admin_id
                  AND hf.is_active = TRUE 
                  AND hf.is_physical = TRUE
                  AND hf.facility_type IN ('sub_cen', 'phc', 'chc')
                  AND (hsf.mean_inundation_frequency IS NULL OR hsf.mean_inundation_frequency < 0.25)
                  AND (hsf.mean_hand_m IS NULL OR hsf.mean_hand_m >= 1.0)
                  AND ST_DWithin(cs.geom::geography, hf.geom::geography, :radius_m)
                ORDER BY ST_Distance(cs.geom::geography, hf.geom::geography) ASC
                LIMIT 5
            ) best_hf ON TRUE
            WHERE cs.admin_id = :admin_id
            ORDER BY cs.id, best_hf.dist_km ASC NULLS LAST;
        """)

        rows = conn.execute(
            query,
            {"admin_id": admin_id, "radius_m": self.search_radius_m},
        ).mappings().all()

        report = HealthEvaluationReport(
            district_name=district_name,
            admin_id=admin_id,
            facilities_in_district=fac_count,
        )

        if not rows:
            logger.info("No candidate sites found for district %s (admin_id: %d)", district_name, admin_id)
            return report

        # Group rows by site_id
        sites_data: dict[int, dict[str, Any]] = {}
        for r in rows:
            sid = int(r["site_id"])
            if sid not in sites_data:
                sites_data[sid] = {
                    "site_id": sid,
                    "cc_land": r["cc_land"],
                    "cc_water": r["cc_water"],
                    "cc_school": r["cc_school"],
                    "assessment_status": r["assessment_status"],
                    "site_slope": float(r["site_slope"] or 0.0),
                    "facilities": [],
                }
            if r["facility_id"] is not None:
                sites_data[sid]["facilities"].append({
                    "id": int(r["facility_id"]),
                    "facility_type": str(r["facility_type"]),
                    "norm_population": int(r["norm_population"]),
                    "dist_km": float(r["dist_km"]),
                    "facility_slope": float(r["facility_slope"] or 0.0),
                    "inundation_freq": float(r["inundation_freq"] or 0.0),
                })

        report.total_sites = len(sites_data)

        site_results: list[SiteHealthResult] = []
        cc_health_values: list[int] = []

        for site_id, sdata in sites_data.items():
            cc_land = sdata["cc_land"]
            cc_water = sdata["cc_water"]
            cc_school = sdata["cc_school"]
            current_status = sdata["assessment_status"]
            site_slope = sdata["site_slope"]
            fac_list = sdata["facilities"]

            chosen_fac: Optional[dict[str, Any]] = None
            chosen_travel_time: Optional[float] = None

            for fac in fac_list:
                ftype = fac["facility_type"]
                dist_km = fac["dist_km"]
                fac_slope = fac["facility_slope"]
                mean_slope = max(0.0, (site_slope + fac_slope) / 2.0)

                base_v = tobler_velocity_kmh(mean_slope)
                speed_mult = SPEED_MULTIPLIERS.get(ftype, 1.0)
                v_effective = base_v * speed_mult
                t_hours = dist_km / v_effective
                t_max = IPHS_TIME_CEILINGS_HOURS.get(ftype, 0.75)

                if t_hours <= t_max:
                    chosen_fac = fac
                    chosen_travel_time = round(t_hours, 3)
                    break

            if chosen_fac:
                norm_pop = chosen_fac["norm_population"]
                available_pop = norm_pop * (1.0 - self.catchment_utilization_pct)
                cc_health = math.floor(available_pop / self.capacity_engine.norms.persons_per_hh)
                assigned_id = chosen_fac["id"]
                assigned_type = chosen_fac["facility_type"]
                assigned_dist = round(chosen_fac["dist_km"], 2)
            else:
                norm_pop = 0
                cc_health = 0
                assigned_id = None
                assigned_type = None
                assigned_dist = None
                report.sites_unserved_by_health += 1

            cc_health_values.append(cc_health)

            # Re-evaluate final capacity and binding constraint via CapacityEngine
            cc_final, binding_enum, _ = self.capacity_engine.calculate_final_capacity(
                cc_land=cc_land,
                cc_water=cc_water,
                cc_school=cc_school,
                cc_health=cc_health,
                livelihood_multiplier=1.0,
            )

            binding_str = binding_enum.value if binding_enum else None
            if binding_str:
                report.binding_counts[binding_str] = report.binding_counts.get(binding_str, 0) + 1

            if cc_water is not None and cc_school is not None:
                new_status = AssessmentStatus.FULLY_ASSESSED.value
            else:
                new_status = AssessmentStatus.PARTIAL.value

            site_results.append(
                SiteHealthResult(
                    site_id=site_id,
                    accessible_facility_count=len(fac_list),
                    accessible_norm_population=norm_pop,
                    assigned_facility_id=assigned_id,
                    assigned_facility_type=assigned_type,
                    assigned_dist_km=assigned_dist,
                    travel_time_hours=chosen_travel_time,
                    cc_land=cc_land,
                    cc_health=cc_health,
                    cc_final=cc_final,
                    binding_constraint=binding_str,
                    assessment_status=new_status,
                )
            )

        report.updated_sites = len(site_results)
        if cc_health_values:
            report.mean_cc_health = round(sum(cc_health_values) / len(cc_health_values), 1)
            report.min_cc_health = min(cc_health_values)
            report.max_cc_health = max(cc_health_values)

        if not dry_run and site_results:
            update_stmt = text("""
                UPDATE candidate_site
                SET cc_health = :cc_health,
                    cc_final = :cc_final,
                    binding_constraint = :binding_constraint,
                    assessment_status = :assessment_status
                WHERE id = :id;
            """)
            conn.execute(
                update_stmt,
                [
                    {
                        "id": s.site_id,
                        "cc_health": s.cc_health,
                        "cc_final": s.cc_final,
                        "binding_constraint": s.binding_constraint,
                        "assessment_status": s.assessment_status,
                    }
                    for s in site_results
                ],
            )
            logger.info(
                "Updated %d candidate sites in %s (admin_id: %d) with CC_health",
                len(site_results),
                district_name,
                admin_id,
            )

        return report
