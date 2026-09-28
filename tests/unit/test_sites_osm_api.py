"""Unit tests for Candidate Site OSM Infrastructure API and Capacity Simulation."""

from __future__ import annotations

import json
from unittest.mock import MagicMock
import pytest

from api.services.sites_service import SitesService
from core.domain.capacity import CapacityEngine
from core.enums import BindingConstraint
from core.schemas.sites import (
    CapacityBreakdownDTO,
    OsmFacilityItemDTO,
    ScreeningInfrastructureDTO,
    SiteCapacityOverrideRequest,
)


def test_capacity_breakdown_dto_with_screening_infra():
    """CapacityBreakdownDTO must cleanly serialize screening_infra payload."""
    dto = CapacityBreakdownDTO(
        cc_land=1500,
        land_screening_capacity=1500,
        cc_water=None,
        cc_school=None,
        cc_health=None,
        livelihood_multiplier=1.0,
        cc_final=None,
        binding_constraint=None,
        screening_infra=ScreeningInfrastructureDTO(
            schools_count_3km=2,
            nearest_school_dist_m=1250.0,
            health_centres_count_8km=1,
            nearest_health_dist_m=3400.0,
            water_points_count_1km=3,
            nearest_water_dist_m=450.0,
            estimated_school_headroom_hh=200,
            estimated_health_headroom_hh=555,
            status="screened",
        ),
    )

    dumped = json.loads(dto.model_dump_json())
    assert dumped["cc_final"] is None  # Honest NULL preserved
    assert dumped["screening_infra"] is not None
    assert dumped["screening_infra"]["schools_count_3km"] == 2
    assert dumped["screening_infra"]["nearest_school_dist_m"] == 1250.0
    assert dumped["screening_infra"]["estimated_school_headroom_hh"] == 200
    assert dumped["screening_infra"]["status"] == "screened"


def test_recompute_capacity_with_use_osm_screening():
    """When use_osm_screening=True, unmeasured lifelines must adopt OSM screening headroom."""
    mock_db = MagicMock()
    service = SitesService(mock_db, engine=CapacityEngine())

    screening_payload = {
        "schools_count_3km": 2,
        "nearest_school_dist_m": 1200.0,
        "health_centres_count_8km": 1,
        "nearest_health_dist_m": 3500.0,
        "water_points_count_1km": 2,
        "nearest_water_dist_m": 600.0,
        "estimated_school_headroom_hh": 150,
        "estimated_health_headroom_hh": 400,
        "status": "screened",
    }

    mock_row = {
        "id": 42,
        "area_ha": 5.0,
        "cc_land": 300,
        "cc_water": None,  # unmeasured baseline
        "cc_school": None,  # unmeasured baseline
        "cc_health": None,  # unmeasured baseline
        "cc_final": None,
        "binding_constraint": None,
        "screening_infra": json.dumps(screening_payload),
        "infra_screening_status": "screened",
        "metadata_info": {},
    }

    service.repo.get_candidate_site_by_id = MagicMock(return_value=mock_row)

    # 1. Without use_osm_screening: school and health stay None, final capacity stays None (Honest NULL)
    req_no_osm = SiteCapacityOverrideRequest(use_osm_screening=False)
    resp_no_osm = service.recompute_site_capacity(42, req_no_osm)
    assert resp_no_osm.scenario_capacity.cc_school is None
    assert resp_no_osm.scenario_capacity.cc_health is None
    assert resp_no_osm.scenario_capacity.cc_final is None

    # 2. With use_osm_screening=True: school = 150, health = 400, final capacity evaluates minimum
    req_osm = SiteCapacityOverrideRequest(use_osm_screening=True)
    resp_osm = service.recompute_site_capacity(42, req_osm)

    assert resp_osm.scenario_capacity.cc_school == 150
    assert resp_osm.scenario_capacity.cc_health == 400
    # min(land=396, water=250, school=150, health=400) = 150
    assert resp_osm.scenario_capacity.cc_final == 150
    assert resp_osm.scenario_capacity.binding_constraint == BindingConstraint.SCHOOL


def test_get_site_infrastructure_facilities():
    """Service must map repo facilities into OsmFacilityItemDTO list."""
    mock_db = MagicMock()
    service = SitesService(mock_db)

    service.repo.get_candidate_site_by_id = MagicMock(return_value={"id": 10})
    service.repo.get_site_infrastructure_facilities = MagicMock(
        return_value=[
            {
                "id": 1,
                "osm_id": 9999,
                "osm_type": "node",
                "facility_type": "school",
                "name": "Meppadi High School",
                "operator_type": "government",
                "tags": {"amenity": "school"},
                "lon": 76.12,
                "lat": 11.55,
                "distance_m": 845.2,
            }
        ]
    )

    facilities = service.get_site_infrastructure_facilities(10)
    assert len(facilities) == 1
    fac = facilities[0]
    assert fac.osm_id == 9999
    assert fac.facility_type == "school"
    assert fac.name == "Meppadi High School"
    assert fac.operator_type == "government"
    assert fac.distance_m == 845.2
    assert fac.coordinates == [76.12, 11.55]
