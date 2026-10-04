"""Centralized District Forecast Registry & Dynamic Spatial Sampling Configuration (Route 1).

Maps each registered district to its administrative identifiers, primary hazard layer,
geographic bounding box, and dynamic sampling grid for Open-Meteo ECMWF IFS HRES forecasts.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass(frozen=True)
class DistrictForecastConfig:
    key: str
    name: str
    state: str
    lgd_code: int
    admin_id: int
    target_hazard: str  # e.g., 'flash_flood', 'landslide', 'riverine_flood'
    bbox_wgs84: list[float]  # [min_lon, min_lat, max_lon, max_lat]
    sample_spacing_deg: float = 0.10  # ~11 km spacing matching ECMWF ~9 km resolution
    advisory_lock_id: int = field(init=False)

    def __post_init__(self) -> None:
        # Deterministic 32-bit positive signed integer for PostgreSQL advisory lock
        lock_id = (self.admin_id * 100000 + self.lgd_code) % (2**31 - 1)
        object.__setattr__(self, "advisory_lock_id", lock_id)

    def generate_sample_points(self) -> list[tuple[float, float]]:
        """Generates regular WGS84 (lat, lon) sample coordinates within the district bbox."""
        min_lon, min_lat, max_lon, max_lat = self.bbox_wgs84
        lat_step = self.sample_spacing_deg
        lon_step = self.sample_spacing_deg / max(math.cos(math.radians((min_lat + max_lat) / 2.0)), 0.1)

        points: list[tuple[float, float]] = []
        cur_lat = min_lat + (lat_step / 2.0)
        while cur_lat <= max_lat:
            cur_lon = min_lon + (lon_step / 2.0)
            while cur_lon <= max_lon:
                points.append((round(cur_lat, 4), round(cur_lon, 4)))
                cur_lon += lon_step
            cur_lat += lat_step

        if not points:
            # Fallback to centroid
            points.append((round((min_lat + max_lat) / 2.0, 4), round((min_lon + max_lon) / 2.0, 4)))
        return points


# Master registry of operational districts for Route 1 Live Forecasts
FORECAST_DISTRICTS: dict[str, DistrictForecastConfig] = {
    "wayanad": DistrictForecastConfig(
        key="wayanad",
        name="Wayanad",
        state="Kerala",
        lgd_code=555,
        admin_id=178,
        target_hazard="flash_flood",  # or landslide
        bbox_wgs84=[75.7772, 11.4492, 76.4436, 11.9769],
        sample_spacing_deg=0.10,
    ),
    "kodagu": DistrictForecastConfig(
        key="kodagu",
        name="Kodagu",
        state="Karnataka",
        lgd_code=540,
        admin_id=179,
        target_hazard="flash_flood",  # Kodagu has flash_flood and landslide
        bbox_wgs84=[75.4000, 11.9000, 76.1500, 12.8500],
        sample_spacing_deg=0.12,
    ),
    "barpeta": DistrictForecastConfig(
        key="barpeta",
        name="Barpeta",
        state="Assam",
        lgd_code=277,
        admin_id=191,
        target_hazard="riverine_flood",  # Primary static baseline
        bbox_wgs84=[90.7000, 26.0500, 91.4500, 26.7500],
        sample_spacing_deg=0.12,
    ),
    "rudraprayag": DistrictForecastConfig(
        key="rudraprayag",
        name="Rudraprayag",
        state="Uttarakhand",
        lgd_code=55,
        admin_id=192,
        target_hazard="riverine_flood",  # Primary static baseline loaded
        bbox_wgs84=[78.7500, 30.1500, 79.3500, 30.8500],
        sample_spacing_deg=0.10,
    ),
    "srinagar": DistrictForecastConfig(
        key="srinagar",
        name="Srinagar",
        state="Jammu & Kashmir",
        lgd_code=12,
        admin_id=193,
        target_hazard="riverine_flood",
        bbox_wgs84=[74.6000, 33.9500, 75.1000, 34.2500],
        sample_spacing_deg=0.08,
    ),
    "dholpur": DistrictForecastConfig(
        key="dholpur",
        name="Dholpur",
        state="Rajasthan",
        lgd_code=98,
        admin_id=180,
        target_hazard="riverine_flood",
        bbox_wgs84=[77.2272, 26.3569, 78.2708, 26.9513],
        sample_spacing_deg=0.12,
    ),
    "morena": DistrictForecastConfig(
        key="morena",
        name="Morena",
        state="Madhya Pradesh",
        lgd_code=417,
        admin_id=181,
        target_hazard="riverine_flood",
        bbox_wgs84=[77.1160, 25.9019, 78.5436, 26.8685],
        sample_spacing_deg=0.14,
    ),
}


def get_forecast_district(key: str) -> DistrictForecastConfig:
    """Retrieves forecast config by key (case-insensitive)."""
    norm = key.strip().lower()
    if norm not in FORECAST_DISTRICTS:
        available = ", ".join(sorted(FORECAST_DISTRICTS.keys()))
        raise KeyError(f"Unknown forecast district '{key}'. Available: {available}")
    return FORECAST_DISTRICTS[norm]
