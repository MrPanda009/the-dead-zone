"""Unit tests for OSM element classification and spatial screening aggregation."""

from __future__ import annotations

import pytest

from core.constants import (
    OSM_DEFAULT_SEATS_PER_SCHOOL,
    OSM_DEFAULT_SPARE_HEALTH_POP,
    OSM_HEALTH_BUFFER_M,
    OSM_SCHOOL_BUFFER_M,
    OSM_WATER_BUFFER_M,
)
from core.enums import FacilityType, InfraScreeningStatus
from pipeline.capacity.osm_aggregator import (
    NormalizedFacility,
    classify_operator_type,
    classify_osm_element,
    compute_screening_summary_local,
    haversine_distance_m,
)


def test_classify_operator_type():
    """Operator type classification must recognize government vs private vs unknown."""
    assert classify_operator_type({"operator:type": "government"}) == "government"
    assert classify_operator_type({"name": "Govt Higher Secondary School"}) == "government"
    assert classify_operator_type({"name": "GLPS Meppadi"}) == "government"
    assert classify_operator_type({"name": "Primary Health Centre Vythiri"}) == "government"
    assert classify_operator_type({"name": "St. Joseph English Medium Private School"}) == "private"
    assert classify_operator_type({"name": "Unknown Village Hall"}) == "unknown"


def test_classify_osm_element_school():
    """Node and way schools must classify to FacilityType.SCHOOL."""
    node_el = {
        "type": "node",
        "id": 12345,
        "lat": 11.55,
        "lon": 76.10,
        "tags": {"amenity": "school", "name": "Govt High School"},
    }
    fac = classify_osm_element(node_el)
    assert fac is not None
    assert fac.osm_id == 12345
    assert fac.facility_type == FacilityType.SCHOOL.value
    assert fac.operator_type == "government"
    assert fac.lat == 11.55
    assert fac.lon == 76.10

    way_el = {
        "type": "way",
        "id": 67890,
        "center": {"lat": 11.56, "lon": 76.11},
        "tags": {"building": "school", "name": "Village Elementary"},
    }
    fac_way = classify_osm_element(way_el)
    assert fac_way is not None
    assert fac_way.osm_id == 67890
    assert fac_way.facility_type == FacilityType.SCHOOL.value
    assert fac_way.lat == 11.56


def test_classify_osm_element_health_and_water():
    """Health centres and potable water sources must classify accurately."""
    health_el = {
        "type": "node",
        "id": 333,
        "lat": 11.57,
        "lon": 76.12,
        "tags": {"healthcare": "centre", "name": "Community Health Centre"},
    }
    fac_health = classify_osm_element(health_el)
    assert fac_health is not None
    assert fac_health.facility_type == FacilityType.HEALTH.value

    water_el = {
        "type": "node",
        "id": 444,
        "lat": 11.58,
        "lon": 76.13,
        "tags": {"man_made": "water_well", "name": "Public Borewell"},
    }
    fac_water = classify_osm_element(water_el)
    assert fac_water is not None
    assert fac_water.facility_type == FacilityType.WATER.value


def test_haversine_distance_m():
    """Haversine distance between known coordinates must be physically accurate."""
    # ~1.11 km for 0.01 deg latitude
    dist = haversine_distance_m(76.10, 11.50, 76.10, 11.51)
    assert 1100 < dist < 1120


def test_compute_screening_summary_local():
    """In-memory spatial summary must compute counts, distances, and screening headroom."""
    site_centroid = (76.100, 11.500)

    # 1 school 1.5 km away (within 3km buffer)
    # 1 school 4.0 km away (outside 3km buffer)
    # 1 PHC 5.0 km away (within 8km buffer)
    # 1 water point 800 m away (within 1.5km buffer)
    facilities = [
        NormalizedFacility(
            osm_id=1, osm_type="node", facility_type="school",
            name="Nearby School", operator_type="government",
            lat=11.513, lon=76.100, tags={},
        ),
        NormalizedFacility(
            osm_id=2, osm_type="node", facility_type="school",
            name="Far School", operator_type="government",
            lat=11.536, lon=76.100, tags={},
        ),
        NormalizedFacility(
            osm_id=3, osm_type="node", facility_type="health",
            name="Nearby PHC", operator_type="government",
            lat=11.545, lon=76.100, tags={},
        ),
        NormalizedFacility(
            osm_id=4, osm_type="node", facility_type="water",
            name="Nearby Well", operator_type="community",
            lat=11.507, lon=76.100, tags={},
        ),
    ]

    summary = compute_screening_summary_local(site_centroid, facilities)

    assert summary["schools_count_3km"] == 1
    assert summary["nearest_school_dist_m"] is not None
    assert 1300 < summary["nearest_school_dist_m"] < 1600

    assert summary["health_centres_count_8km"] == 1
    assert summary["nearest_health_dist_m"] is not None
    assert 4800 < summary["nearest_health_dist_m"] < 5200

    assert summary["water_points_count_1km"] == 1
    assert summary["nearest_water_dist_m"] is not None
    assert 700 < summary["nearest_water_dist_m"] < 900

    # 1 school * 120 seats / 1.2 children/hh = 100 HH headroom
    assert summary["estimated_school_headroom_hh"] == 100

    # 1 PHC * 2500 spare / 4.5 persons/hh = 555 HH headroom
    assert summary["estimated_health_headroom_hh"] == 555

    assert summary["status"] == InfraScreeningStatus.SCREENED.value
    assert summary["source"] == "HOT / OpenStreetMap via Overpass API"
