"""Sentinel-1 RTC STAC catalog querying via Microsoft Planetary Computer.

Provides authenticated queries for radiometrically terrain corrected (RTC)
SAR scenes over specified bounding boxes and date intervals.
"""

from typing import Any
import os
import numpy as np
from dotenv import load_dotenv
from pystac_client import Client
import planetary_computer
from .aoi import require_bbox

load_dotenv()

PLANETARY_COMPUTER_STAC_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"
COLLECTION_SENTINEL1_RTC = "sentinel-1-rtc"


def get_stac_client() -> Client:
    """Open and return an authenticated STAC client using planetary_computer token modifier."""
    return Client.open(
        PLANETARY_COMPUTER_STAC_URL,
        modifier=planetary_computer.sign_inplace,
    )


def query_sentinel1_rtc(
    bbox: list[float] | None = None,
    datetime_range: str = "2023-06-01/2023-09-30",
    limit: int | None = None,
) -> list[Any]:
    """Query Sentinel-1 RTC items for the specified bounding box and date range.

    Args:
        bbox: Bounding box in [min_lon, min_lat, max_lon, max_lat] format.
              Required; resolve from a DistrictConfig.
        datetime_range: ISO8601 interval string (e.g. '2023-06-01/2023-09-30').
        limit: Optional maximum number of items to return.

    Returns:
        List of signed pystac.Item instances.
    """
    bbox = require_bbox(bbox)

    catalog = get_stac_client()
    search = catalog.search(
        collections=[COLLECTION_SENTINEL1_RTC],
        bbox=bbox,
        datetime=datetime_range,
        limit=limit,
    )

    items = list(search.items())
    if limit is not None:
        items = items[:limit]
    return items


def subsample_scenes_evenly(scenes: list[Any], target: int) -> list[Any]:
    """Sort scenes by acquisition time and keep `target` of them spread evenly
    across the window, so the frequency stack is not biased toward one part of
    the season."""
    ordered = sorted(scenes, key=lambda s: s.datetime)
    if len(ordered) <= target:
        return ordered
    idx = np.linspace(0, len(ordered) - 1, target).round().astype(int)
    return [ordered[i] for i in sorted(set(idx.tolist()))]


def extract_scene_metadata(item: Any) -> dict[str, Any]:
    """Extract key metadata fields and asset links from a STAC item."""
    assets = item.assets
    vv_href = assets["vv"].href if "vv" in assets else None
    vh_href = assets["vh"].href if "vh" in assets else None

    return {
        "id": item.id,
        "datetime": item.datetime.isoformat() if item.datetime else None,
        "bbox": item.bbox,
        "properties": item.properties,
        "vv_href": vv_href,
        "vh_href": vh_href,
    }
