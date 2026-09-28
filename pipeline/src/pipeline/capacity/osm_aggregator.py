"""OSM Infrastructure Facility Normalizer and Candidate Site Spatial Aggregator.

Parses raw Overpass JSON elements, classifies them into domain facility types
(schools, healthcare, water points), persists point geometries to PostGIS,
and computes screening-grade infrastructure indicators for candidate relocation parcels.
"""

from __future__ import annotations

import json
import logging
import math
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Optional, Sequence
import uuid

from sqlalchemy import text
from sqlalchemy.orm import Session

from core.constants import (
    OSM_DEFAULT_SEATS_PER_SCHOOL,
    OSM_DEFAULT_SPARE_HEALTH_POP,
    OSM_HEALTH_BUFFER_M,
    OSM_SCHOOL_BUFFER_M,
    OSM_WATER_BUFFER_M,
)
from core.domain.capacity import CapacityNormsConfig
from core.enums import FacilityType, InfraScreeningStatus

logger = logging.getLogger("setu_pipeline.osm_aggregator")


@dataclass(frozen=True)
class NormalizedFacility:
    """Standardized representation of a public infrastructure facility extracted from OSM."""
    osm_id: int
    osm_type: str
    facility_type: str
    name: Optional[str]
    operator_type: str
    lat: float
    lon: float
    tags: dict[str, Any]


def haversine_distance_m(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Calculates geodesic distance in meters between two coordinates via Haversine formula."""
    r_earth = 6371000.0  # Earth's mean radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r_earth * c


def classify_operator_type(tags: dict[str, Any]) -> str:
    """Determines operator classification (government, private, community, unknown)."""
    op_type = str(tags.get("operator:type", "")).lower()
    if op_type in ("government", "public", "state", "municipal"):
        return "government"
    if op_type in ("private", "religious", "ngo"):
        return "private"
    if op_type in ("community", "cooperative"):
        return "community"

    name_lower = str(tags.get("name", "")).lower()
    operator_lower = str(tags.get("operator", "")).lower()
    combined = f"{name_lower} {operator_lower}"

    govt_indicators = (
        "govt", "government", "glps", "ghss", "gups", "gup", "gmlps", "gmup",
        "panchayat", "phc", "chc", "sub-centre", "sub centre", "district hospital",
        "taluk hospital", "aided", "zila", "gram", "primary health centre",
        "primary health center", "community health centre", "community health center",
    )
    if any(ind in combined for ind in govt_indicators):
        return "government"

    if any(p in combined for p in ("private", "pvt", "english medium", "trust", "mission")):
        return "private"

    return "unknown"


def classify_osm_element(element: dict[str, Any]) -> Optional[NormalizedFacility]:
    """Classifies a raw Overpass element into a NormalizedFacility."""
    tags = element.get("tags", {})
    osm_type = element.get("type", "node")
    osm_id = element.get("id")

    if not osm_id:
        return None

    # Resolve coordinates
    if osm_type == "node":
        lat = element.get("lat")
        lon = element.get("lon")
    else:
        center = element.get("center", {})
        lat = center.get("lat")
        lon = center.get("lon")

    if lat is None or lon is None:
        return None

    amenity = tags.get("amenity", "").lower()
    building = tags.get("building", "").lower()
    healthcare = tags.get("healthcare", "").lower()
    man_made = tags.get("man_made", "").lower()
    waterway = tags.get("waterway", "").lower()

    facility_type: Optional[str] = None

    # Education classification
    if amenity in ("school", "kindergarten", "college", "university") or building == "school":
        facility_type = FacilityType.SCHOOL.value
    # Healthcare classification
    elif amenity in ("hospital", "clinic", "doctors", "pharmacy") or healthcare in (
        "centre", "hospital", "clinic", "dispensary"
    ):
        facility_type = FacilityType.HEALTH.value
    # Potable Water classification
    elif amenity == "drinking_water" or man_made in (
        "water_well", "water_tap", "water_tower", "storage_tank"
    ) or waterway == "water_point":
        facility_type = FacilityType.WATER.value

    if facility_type is None:
        return None

    name = tags.get("name") or tags.get("name:en")
    operator = classify_operator_type(tags)

    return NormalizedFacility(
        osm_id=int(osm_id),
        osm_type=str(osm_type),
        facility_type=facility_type,
        name=name,
        operator_type=operator,
        lat=float(lat),
        lon=float(lon),
        tags=tags,
    )


def compute_screening_summary_local(
    site_centroid: tuple[float, float],
    facilities: Sequence[NormalizedFacility],
    norms: Optional[CapacityNormsConfig] = None,
    school_buffer_m: float = OSM_SCHOOL_BUFFER_M,
    health_buffer_m: float = OSM_HEALTH_BUFFER_M,
    water_buffer_m: float = OSM_WATER_BUFFER_M,
) -> dict[str, Any]:
    """Computes screening infrastructure counts and headroom in-memory from a facility list.

    Args:
        site_centroid: (longitude, latitude) of the candidate relocation site.
        facilities: Candidate facilities within regional search window.
        norms: Policy norms config for household conversion.
        school_buffer_m: Catchment distance in meters for schools.
        health_buffer_m: Catchment distance in meters for healthcare.
        water_buffer_m: Catchment distance in meters for water points.

    Returns:
        Structured dictionary matching ScreeningInfrastructureDTO schema.
    """
    site_lon, site_lat = site_centroid
    active_norms = norms or CapacityNormsConfig()

    schools_count = 0
    nearest_school_dist: Optional[float] = None

    health_count = 0
    nearest_health_dist: Optional[float] = None

    water_count = 0
    nearest_water_dist: Optional[float] = None

    for fac in facilities:
        dist = haversine_distance_m(site_lon, site_lat, fac.lon, fac.lat)

        if fac.facility_type == FacilityType.SCHOOL.value:
            if nearest_school_dist is None or dist < nearest_school_dist:
                nearest_school_dist = dist
            if dist <= school_buffer_m:
                schools_count += 1

        elif fac.facility_type == FacilityType.HEALTH.value:
            if nearest_health_dist is None or dist < nearest_health_dist:
                nearest_health_dist = dist
            if dist <= health_buffer_m:
                health_count += 1

        elif fac.facility_type == FacilityType.WATER.value:
            if nearest_water_dist is None or dist < nearest_water_dist:
                nearest_water_dist = dist
            if dist <= water_buffer_m:
                water_count += 1

    # Heuristic capacity headroom calculations
    school_headroom: Optional[int] = None
    if schools_count > 0:
        spare_seats = schools_count * OSM_DEFAULT_SEATS_PER_SCHOOL
        school_headroom = math.floor(spare_seats / active_norms.students_per_hh)

    health_headroom: Optional[int] = None
    if health_count > 0:
        spare_pop = health_count * OSM_DEFAULT_SPARE_HEALTH_POP
        health_headroom = math.floor(spare_pop / active_norms.persons_per_hh)

    status = (
        InfraScreeningStatus.SCREENED.value
        if (schools_count > 0 or health_count > 0 or water_count > 0)
        else InfraScreeningStatus.UNSCREENED.value
    )

    return {
        "schools_count_3km": schools_count,
        "nearest_school_dist_m": round(nearest_school_dist, 1) if nearest_school_dist is not None else None,
        "health_centres_count_8km": health_count,
        "nearest_health_dist_m": round(nearest_health_dist, 1) if nearest_health_dist is not None else None,
        "water_points_count_1km": water_count,
        "nearest_water_dist_m": round(nearest_water_dist, 1) if nearest_water_dist is not None else None,
        "estimated_school_headroom_hh": school_headroom,
        "estimated_health_headroom_hh": health_headroom,
        "harvested_at": datetime.now(timezone.utc).isoformat(),
        "source": "HOT / OpenStreetMap via Overpass API",
        "status": status,
    }


class OsmAggregator:
    """Manages database persistence of OSM facilities and spatial screening of candidate sites."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def ingest_overpass_elements(
        self,
        elements: list[dict[str, Any]],
        admin_id: Optional[int] = None,
        snapshot_id: Optional[uuid.UUID] = None,
    ) -> list[NormalizedFacility]:
        """Classifies and bulk-inserts normalized OSM elements into PostGIS."""
        facilities: list[NormalizedFacility] = []
        for el in elements:
            fac = classify_osm_element(el)
            if fac:
                facilities.append(fac)

        if not facilities:
            logger.warning("No qualifying infrastructure elements identified in Overpass payload.")
            return []

        logger.info(f"Persisting {len(facilities)} OSM facilities to osm_infrastructure_facility...")

        insert_sql = text("""
            INSERT INTO osm_infrastructure_facility (
                osm_id, osm_type, facility_type, name, operator_type,
                geom, tags, admin_id, source_snapshot_id
            ) VALUES (
                :osm_id, :osm_type, :facility_type, :name, :operator_type,
                ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
                CAST(:tags AS jsonb), :admin_id, :snapshot_id
            )
            ON CONFLICT (osm_id, osm_type)
            DO UPDATE SET
                facility_type = EXCLUDED.facility_type,
                name = EXCLUDED.name,
                operator_type = EXCLUDED.operator_type,
                geom = EXCLUDED.geom,
                tags = EXCLUDED.tags,
                admin_id = COALESCE(EXCLUDED.admin_id, osm_infrastructure_facility.admin_id),
                source_snapshot_id = EXCLUDED.source_snapshot_id;
        """)

        param_list = [
            {
                "osm_id": fac.osm_id,
                "osm_type": fac.osm_type,
                "facility_type": fac.facility_type,
                "name": fac.name,
                "operator_type": fac.operator_type,
                "lon": fac.lon,
                "lat": fac.lat,
                "tags": json.dumps(fac.tags),
                "admin_id": admin_id,
                "snapshot_id": snapshot_id,
            }
            for fac in facilities
        ]

        # Chunked batch insert to minimize WAN round trips and prevent connection drops
        chunk_size = 200
        for i in range(0, len(param_list), chunk_size):
            chunk = param_list[i : i + chunk_size]
            self.session.execute(insert_sql, chunk)
            self.session.commit()

        logger.info(f"Successfully persisted {len(facilities)} facilities.")
        return facilities

    def update_district_candidate_sites(self, admin_id: int) -> int:
        """Computes and writes screening_infra summary for all candidate sites in a district.

        Uses PostGIS ST_DWithin on spatial indexes for maximum query performance.
        Preserves authoritative cc_water, cc_school, cc_health NULLs.
        """
        # Spatial aggregation query grouping by site_id using PostGIS ST_DWithin and ST_Distance
        agg_sql = text("""
            WITH schools_agg AS (
                SELECT
                    cs.id AS site_id,
                    count(f.id) AS count,
                    min(ST_Distance(f.geom::geography, cs.centroid::geography)) AS min_dist
                FROM candidate_site cs
                LEFT JOIN osm_infrastructure_facility f
                  ON f.facility_type = 'school'
                 AND ST_DWithin(f.geom::geography, cs.centroid::geography, :school_buffer)
                WHERE cs.admin_id = :admin_id
                GROUP BY cs.id
            ),
            health_agg AS (
                SELECT
                    cs.id AS site_id,
                    count(f.id) AS count,
                    min(ST_Distance(f.geom::geography, cs.centroid::geography)) AS min_dist
                FROM candidate_site cs
                LEFT JOIN osm_infrastructure_facility f
                  ON f.facility_type = 'health'
                 AND ST_DWithin(f.geom::geography, cs.centroid::geography, :health_buffer)
                WHERE cs.admin_id = :admin_id
                GROUP BY cs.id
            ),
            water_agg AS (
                SELECT
                    cs.id AS site_id,
                    count(f.id) AS count,
                    min(ST_Distance(f.geom::geography, cs.centroid::geography)) AS min_dist
                FROM candidate_site cs
                LEFT JOIN osm_infrastructure_facility f
                  ON f.facility_type = 'water'
                 AND ST_DWithin(f.geom::geography, cs.centroid::geography, :water_buffer)
                WHERE cs.admin_id = :admin_id
                GROUP BY cs.id
            )
            SELECT
                cs.id AS site_id,
                COALESCE(sa.count, 0) AS schools_count,
                sa.min_dist AS school_min_dist,
                COALESCE(ha.count, 0) AS health_count,
                ha.min_dist AS health_min_dist,
                COALESCE(wa.count, 0) AS water_count,
                wa.min_dist AS water_min_dist
            FROM candidate_site cs
            LEFT JOIN schools_agg sa ON sa.site_id = cs.id
            LEFT JOIN health_agg ha ON ha.site_id = cs.id
            LEFT JOIN water_agg wa ON wa.site_id = cs.id
            WHERE cs.admin_id = :admin_id;
        """)

        sites_metrics = self.session.execute(
            agg_sql,
            {
                "admin_id": admin_id,
                "school_buffer": OSM_SCHOOL_BUFFER_M,
                "health_buffer": OSM_HEALTH_BUFFER_M,
                "water_buffer": OSM_WATER_BUFFER_M,
            },
        ).mappings().all()

        if not sites_metrics:
            logger.info(f"No candidate sites found for admin_id {admin_id}.")
            return 0

        logger.info(
            f"Updating screening infrastructure for {len(sites_metrics)} candidate sites in admin_id {admin_id}..."
        )

        update_sql = text("""
            UPDATE candidate_site
            SET
                screening_infra = CAST(:screening_infra AS jsonb),
                infra_screening_status = :status
            WHERE id = :site_id;
        """)

        norms = CapacityNormsConfig()
        now_str = datetime.now(timezone.utc).isoformat()
        update_params = []

        for agg in sites_metrics:
            site_id = agg["site_id"]
            schools_count = int(agg["schools_count"] or 0)
            school_min_dist = float(agg["school_min_dist"]) if agg["school_min_dist"] is not None else None
            health_count = int(agg["health_count"] or 0)
            health_min_dist = float(agg["health_min_dist"]) if agg["health_min_dist"] is not None else None
            water_count = int(agg["water_count"] or 0)
            water_min_dist = float(agg["water_min_dist"]) if agg["water_min_dist"] is not None else None

            # Compute screening headroom
            school_headroom = (
                math.floor((schools_count * OSM_DEFAULT_SEATS_PER_SCHOOL) / norms.students_per_hh)
                if schools_count > 0 else None
            )
            health_headroom = (
                math.floor((health_count * OSM_DEFAULT_SPARE_HEALTH_POP) / norms.persons_per_hh)
                if health_count > 0 else None
            )

            status = (
                InfraScreeningStatus.SCREENED.value
                if (schools_count > 0 or health_count > 0 or water_count > 0)
                else InfraScreeningStatus.UNSCREENED.value
            )

            screening_payload = {
                "schools_count_3km": schools_count,
                "nearest_school_dist_m": round(school_min_dist, 1) if school_min_dist is not None else None,
                "health_centres_count_8km": health_count,
                "nearest_health_dist_m": round(health_min_dist, 1) if health_min_dist is not None else None,
                "water_points_count_1km": water_count,
                "nearest_water_dist_m": round(water_min_dist, 1) if water_min_dist is not None else None,
                "estimated_school_headroom_hh": school_headroom,
                "estimated_health_headroom_hh": health_headroom,
                "harvested_at": now_str,
                "source": "HOT / OpenStreetMap via Overpass API",
                "status": status,
            }

            update_params.append({
                "site_id": site_id,
                "screening_infra": json.dumps(screening_payload),
                "status": status,
            })

        chunk_size = 100
        for i in range(0, len(update_params), chunk_size):
            chunk = update_params[i : i + chunk_size]
            self.session.execute(update_sql, chunk)
            self.session.commit()

        logger.info(f"Successfully updated screening infrastructure for {len(update_params)} candidate sites.")
        return len(update_params)
