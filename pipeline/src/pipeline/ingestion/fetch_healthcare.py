"""Automated ingestion and normalization for geocoded healthcare facilities in India.

Fetches the national health centres directory from local cache or companion repository:
https://github.com/aryanchettripkt-eng/dataset-terra
Filters and standardizes facilities for target pilot districts (Barpeta, Wayanad, Morena, Dholpur),
validates coordinates, and maps normative catchment capacities based on Indian Public Health Standards (IPHS).
"""

from __future__ import annotations

import csv
import hashlib
import logging
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

import h3
import requests

from core.config import DATA_DIR, REPO_ROOT
from core.h3_utils import h3_to_int

logger = logging.getLogger(__name__)

CANONICAL_HEALTHCARE_URL = (
    "https://raw.githubusercontent.com/aryanchettripkt-eng/dataset-terra/master/geocode_health_centre.csv"
)
DEFAULT_RAW_HEALTHCARE_DIR = DATA_DIR / "raw" / "healthcare"
DEFAULT_HEALTHCARE_CSV = DEFAULT_RAW_HEALTHCARE_DIR / "all_india_health_centres.csv"

# District alias mapping (standard slug -> dataset spelling)
DISTRICT_ALIASES: dict[str, str] = {
    "dholpur": "dhaulpur",
    "dhaulpur": "dhaulpur",
    "barpeta": "barpeta",
    "wayanad": "wayanad",
    "morena": "morena",
    "rudraprayag": "rudraprayag",
    "srinagar": "srinagar",
    "kodagu": "kodagu",
    "leh": "leh ladakh",
    "ladakh": "leh ladakh",
}

# Terrain classification for IPHS normative capacity
HILLY_TRIBAL_DISTRICTS = {"wayanad", "rudraprayag", "srinagar", "kodagu", "leh"}

# IPHS Normative Population Standards
# Primary Health Centres (PHC): 20k (hilly/tribal) / 30k (plains)
# Community Health Centres (CHC): 80k (hilly/tribal) / 120k (plains)
# Sub-Centres (sub_cen): 3k (hilly/tribal) / 5k (plains)
# Sub-District Hospital (s_t_h): 250k
# District Hospital (dis_h): 500k
IPHS_POPULATION_NORMS: dict[bool, dict[str, int]] = {
    # Plains (is_hilly = False)
    False: {
        "phc": 30000,
        "chc": 120000,
        "sub_cen": 5000,
        "s_t_h": 250000,
        "dis_h": 500000,
    },
    # Hilly / Tribal / Desert (is_hilly = True)
    True: {
        "phc": 20000,
        "chc": 80000,
        "sub_cen": 3000,
        "s_t_h": 250000,
        "dis_h": 500000,
    },
}


@dataclass(frozen=True)
class HealthFacilityRecord:
    """Normalized, validated healthcare facility ready for spatial ingestion."""
    name: str
    facility_type: str
    ownership_type: Optional[str]
    subdistrict: Optional[str]
    location_type: Optional[str]
    address: Optional[str]
    latitude: float
    longitude: float
    h3_res8: Optional[int]
    nin_n: Optional[str]
    is_active: bool
    is_physical: bool
    norm_population: int
    metadata: dict[str, Any]


def compute_sha256(file_path: Path) -> str:
    """Computes SHA-256 checksum of a local file."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def download_healthcare_dataset(
    url: str = CANONICAL_HEALTHCARE_URL,
    dest_path: Path = DEFAULT_HEALTHCARE_CSV,
    force: bool = False,
    timeout: int = 60,
) -> Path:
    """Ensures national healthcare facilities CSV is present locally.

    Checks:
    1. Existing cached file in data/raw/healthcare/
    2. Optional HEALTHCARE_DATASET_PATH environment variable override
    3. Remote raw GitHub download fallback
    """
    dest_path.parent.mkdir(parents=True, exist_ok=True)

    if dest_path.exists() and not force:
        file_size = dest_path.stat().st_size
        if file_size > 15 * 1024 * 1024:
            logger.info("Using cached healthcare dataset at %s (%.2f MB)", dest_path, file_size / (1024 * 1024))
            return dest_path

    import os
    env_override = os.environ.get("HEALTHCARE_DATASET_PATH")
    if env_override:
        env_path = Path(env_override)
        if env_path.exists() and not force:
            env_size = env_path.stat().st_size
            if env_size > 15 * 1024 * 1024:
                logger.info("Copying dataset from HEALTHCARE_DATASET_PATH %s -> %s (%.2f MB)", env_path, dest_path, env_size / (1024 * 1024))
                shutil.copy2(env_path, dest_path)
                return dest_path

    logger.info("Downloading healthcare dataset from %s -> %s", url, dest_path)
    response = requests.get(url, stream=True, timeout=timeout)
    response.raise_for_status()

    with open(dest_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=1024 * 1024):
            if chunk:
                f.write(chunk)

    logger.info("Download complete: %s (%.2f MB)", dest_path, dest_path.stat().st_size / (1024 * 1024))
    return dest_path


def get_norm_population(facility_type: str, district_slug: str) -> int:
    """Determines IPHS normative population for a given facility type and district terrain."""
    norm_type = facility_type.strip().lower()
    is_hilly = district_slug.lower() in HILLY_TRIBAL_DISTRICTS
    tier_norms = IPHS_POPULATION_NORMS[is_hilly]
    return tier_norms.get(norm_type, 5000)


def _normalize_coord(val: Any, min_val: float, max_val: float, expected_prefix_len: int = 2) -> Optional[float]:
    """Validates and normalizes coordinates, repairing missing decimal points from legacy records."""
    try:
        f = float(str(val).strip())
    except (ValueError, TypeError):
        return None
    if min_val <= f <= max_val:
        return f
    s = str(val).strip().replace(".", "")
    if len(s) > expected_prefix_len:
        try:
            prefix = float(s[:expected_prefix_len])
            if min_val <= prefix <= max_val:
                candidate = float(s[:expected_prefix_len] + "." + s[expected_prefix_len:])
                if min_val <= candidate <= max_val:
                    return candidate
        except (ValueError, TypeError):
            pass
    return None


def parse_and_filter_facilities(
    csv_path: Path,
    district_slug: str,
    strict_public_only: bool = True,
    strict_active_only: bool = True,
) -> list[HealthFacilityRecord]:
    """Parses raw CSV and filters facilities strictly for the requested district."""
    clean_slug = district_slug.strip().lower()
    target_csv_name = DISTRICT_ALIASES.get(clean_slug, clean_slug)
    is_hilly = clean_slug in HILLY_TRIBAL_DISTRICTS

    facilities: list[HealthFacilityRecord] = []
    seen_nins: set[str] = set()

    with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            dist_raw = (row.get("District Name") or "").strip().lower()
            if dist_raw != target_csv_name:
                continue

            active_flag = (row.get("ActiveFlag_C") or "").strip().upper()
            is_active = active_flag == "Y"
            if strict_active_only and not is_active:
                continue

            ownership_type = (row.get("Type Of Facility") or "").strip() or None
            if strict_public_only and ownership_type not in ("Public", "NA", "", None):
                continue

            notional_raw = (row.get("NOTIONAL_PHYSICAL") or "").strip().lower()
            is_physical = notional_raw == "physical" or notional_raw == ""

            # Coordinates validation with legacy integer decimal recovery
            lat = _normalize_coord(row.get("Latitude"), 6.0, 38.0)
            lon = _normalize_coord(row.get("Longitude"), 68.0, 98.0)
            if lat is None or lon is None or lat == 0.0 or lon == 0.0:
                continue

            name = (row.get("Facility Name") or "").strip()
            if not name:
                continue

            raw_type = (row.get("Facility Type") or "sub_cen").strip().lower()
            subdistrict = (row.get("Subdistrict Name") or "").strip() or None
            location_type = (row.get("Location Type") or "").strip() or None
            address = (row.get("Facility Address") or "").strip()
            if address in ("NA", "", "None"):
                address = None

            raw_nin = (row.get("Nin_N") or "").strip()
            nin_n = raw_nin if raw_nin and raw_nin != "NA" else None

            if nin_n:
                if nin_n in seen_nins:
                    nin_n = None
                else:
                    seen_nins.add(nin_n)

            # Uber H3 resolution 8 index calculation
            try:
                h3_cell = h3.latlng_to_cell(lat, lon, 8)
                h3_res8 = h3_to_int(h3_cell)
            except Exception:
                h3_res8 = None

            norm_pop = get_norm_population(raw_type, clean_slug)

            record = HealthFacilityRecord(
                name=name,
                facility_type=raw_type,
                ownership_type=ownership_type,
                subdistrict=subdistrict,
                location_type=location_type,
                address=address,
                latitude=lat,
                longitude=lon,
                h3_res8=h3_res8,
                nin_n=nin_n,
                is_active=is_active,
                is_physical=is_physical,
                norm_population=norm_pop,
                metadata={
                    "source": "dataset-terra/geocode_health_centre.csv",
                    "raw_state": (row.get("State Name") or "").strip(),
                    "raw_facility_type": raw_type,
                    "location_type": location_type,
                    "is_hilly_terrain": is_hilly,
                },
            )
            facilities.append(record)

    logger.info(
        "District '%s' (CSV name: '%s'): Extracted %d valid facilities",
        district_slug,
        target_csv_name,
        len(facilities),
    )
    return facilities
