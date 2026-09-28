"""Unit tests for OverpassClient and query construction."""

from __future__ import annotations

import hashlib
import json
import pytest

from pipeline.capacity.overpass_client import (
    DEFAULT_OVERPASS_ENDPOINTS,
    OverpassClient,
    OverpassConfig,
    OverpassError,
)


def test_overpass_config_defaults():
    """Validates default Overpass mirror endpoints and timeouts."""
    cfg = OverpassConfig()
    assert len(cfg.endpoints) >= 2
    assert "https://overpass-api.de/api/interpreter" in cfg.endpoints
    assert cfg.timeout_seconds == 90.0
    assert cfg.max_retries_per_endpoint == 2


def test_build_district_query_formatting():
    """Overpass query generator must inject bounding box coordinates correctly into QL."""
    client = OverpassClient()
    bbox = (11.5, 75.8, 11.9, 76.3)
    ql = client.build_district_query(bbox)

    assert "[out:json][timeout:90];" in ql
    assert "11.500000,75.800000,11.900000,76.300000" in ql
    assert 'node["amenity"~"^(school|kindergarten|college|university)$"]' in ql
    assert 'node["amenity"~"^(hospital|clinic|doctors|pharmacy)$"]' in ql
    assert 'node["amenity"="drinking_water"]' in ql
    assert "out center tags;" in ql


def test_mock_query_provenance_and_integrity():
    """Mock query execution must compute deterministic SHA-256 hash for provenance."""
    client = OverpassClient()
    mock_payload = {
        "version": 0.6,
        "generator": "Overpass API mock",
        "elements": [
            {
                "type": "node",
                "id": 1001,
                "lat": 11.605,
                "lon": 76.125,
                "tags": {"amenity": "school", "name": "Govt High School Meppadi"},
            },
            {
                "type": "node",
                "id": 1002,
                "lat": 11.610,
                "lon": 76.130,
                "tags": {"amenity": "clinic", "name": "Meppadi Primary Health Centre"},
            },
        ],
    }

    data, sha256_hash, raw_bytes = client.query("mock_query", mock_response=mock_payload)

    assert data["version"] == 0.6
    assert len(data["elements"]) == 2
    expected_hash = hashlib.sha256(raw_bytes).hexdigest()
    assert sha256_hash == expected_hash
    assert len(sha256_hash) == 64
