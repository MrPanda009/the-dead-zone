"""Overpass API Client for Harvesting Humanitarian OpenStreetMap (HOT) Infrastructure.

Fetches civic infrastructure facilities (schools, healthcare centres, potable water points)
across district bounding boxes using batched Overpass QL queries with multi-mirror failover,
rate-limit resilience, and cryptographic SHA-256 provenance tracking.
"""

from __future__ import annotations

import hashlib
import json
import logging
import random
import time
from dataclasses import dataclass, field
from typing import Any, Optional, Sequence
import httpx

logger = logging.getLogger("setu_pipeline.overpass_client")

# Standard public Overpass API mirror endpoints
DEFAULT_OVERPASS_ENDPOINTS: list[str] = [
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]


class OverpassError(Exception):
    """Raised when an Overpass API query fails across all mirrors."""
    pass


@dataclass(frozen=True)
class OverpassConfig:
    """Configuration parameters for the Overpass API client."""
    endpoints: list[str] = field(default_factory=lambda: list(DEFAULT_OVERPASS_ENDPOINTS))
    timeout_seconds: float = 90.0
    max_retries_per_endpoint: int = 2
    backoff_base_seconds: float = 2.0
    user_agent: str = "SETU-DRR/0.1.0 (Disaster Risk Reduction Decision Support Platform; research)"


class OverpassClient:
    """Resilient HTTP client for querying OpenStreetMap data via Overpass QL."""

    def __init__(self, config: Optional[OverpassConfig] = None) -> None:
        self.config = config or OverpassConfig()

    @staticmethod
    def build_district_query(bbox: tuple[float, float, float, float]) -> str:
        """Constructs a consolidated Overpass QL query for all civic infrastructure in a bbox.

        Args:
            bbox: (min_lat, min_lon, max_lat, max_lon)

        Returns:
            Overpass QL query string with JSON output format.
        """
        min_lat, min_lon, max_lat, max_lon = bbox
        bbox_str = f"{min_lat:.6f},{min_lon:.6f},{max_lat:.6f},{max_lon:.6f}"

        return f"""[out:json][timeout:90];
(
  // Education: Schools, kindergartens, colleges
  node["amenity"~"^(school|kindergarten|college|university)$"]({bbox_str});
  way["amenity"~"^(school|kindergarten|college|university)$"]({bbox_str});
  node["building"="school"]({bbox_str});

  // Healthcare: Hospitals, clinics, doctors, PHCs, dispensaries
  node["amenity"~"^(hospital|clinic|doctors|pharmacy)$"]({bbox_str});
  way["amenity"~"^(hospital|clinic|doctors)$"]({bbox_str});
  node["healthcare"~"^(centre|hospital|clinic|dispensary)$"]({bbox_str});

  // Water: Drinking water points, wells, water towers, taps
  node["amenity"="drinking_water"]({bbox_str});
  node["man_made"~"^(water_well|water_tap|water_tower|storage_tank)$"]({bbox_str});
  node["waterway"="water_point"]({bbox_str});
);
out center tags;
"""

    def query(
        self,
        query_ql: str,
        mock_response: Optional[dict[str, Any]] = None,
    ) -> tuple[dict[str, Any], str, bytes]:
        """Executes an Overpass QL query with multi-mirror failover and retry backoff.

        Args:
            query_ql: Overpass QL query string.
            mock_response: Optional pre-loaded dict for deterministic unit testing.

        Returns:
            Tuple of (parsed_json_dict, sha256_hash, raw_bytes).
        """
        if mock_response is not None:
            raw_bytes = json.dumps(mock_response, sort_keys=True).encode("utf-8")
            sha256 = hashlib.sha256(raw_bytes).hexdigest()
            return mock_response, sha256, raw_bytes

        headers = {
            "User-Agent": self.config.user_agent,
            "Accept": "application/json",
        }

        last_error: Optional[Exception] = None

        for endpoint in self.config.endpoints:
            logger.info(f"Attempting Overpass query against endpoint: {endpoint}")
            for attempt in range(1, self.config.max_retries_per_endpoint + 1):
                try:
                    with httpx.Client(timeout=self.config.timeout_seconds) as client:
                        response = client.post(
                            endpoint,
                            data={"data": query_ql},
                            headers=headers,
                        )

                        if response.status_code == 200:
                            raw_bytes = response.content
                            sha256 = hashlib.sha256(raw_bytes).hexdigest()
                            data = response.json()
                            logger.info(
                                f"Overpass query successful from {endpoint}. "
                                f"Elements returned: {len(data.get('elements', []))}, SHA-256: {sha256[:12]}..."
                            )
                            return data, sha256, raw_bytes

                        # Rate limiting (429) or gateway timeout (504) -> retry with backoff
                        if response.status_code in (429, 502, 503, 504):
                            wait = self.config.backoff_base_seconds * (2 ** (attempt - 1)) + random.uniform(0.1, 0.5)
                            logger.warning(
                                f"Overpass endpoint {endpoint} returned HTTP {response.status_code}. "
                                f"Retrying in {wait:.2f}s (attempt {attempt}/{self.config.max_retries_per_endpoint})..."
                            )
                            time.sleep(wait)
                            continue

                        response.raise_for_status()

                except (httpx.RequestError, httpx.HTTPStatusError) as exc:
                    last_error = exc
                    wait = self.config.backoff_base_seconds * (2 ** (attempt - 1)) + random.uniform(0.1, 0.5)
                    logger.warning(
                        f"Request error against {endpoint}: {exc}. "
                        f"Retrying in {wait:.2f}s (attempt {attempt}/{self.config.max_retries_per_endpoint})..."
                    )
                    time.sleep(wait)

        raise OverpassError(
            f"All Overpass mirrors exhausted without success. Last error: {last_error}"
        ) from last_error

    def query_district_infrastructure(
        self,
        bbox: tuple[float, float, float, float],
        mock_response: Optional[dict[str, Any]] = None,
    ) -> tuple[dict[str, Any], str, bytes]:
        """Convenience method to build and execute a query for a district bounding box."""
        ql = self.build_district_query(bbox)
        return self.query(ql, mock_response=mock_response)
