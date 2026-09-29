"""Area of Interest (AOI) helpers for flood susceptibility modeling.

Derives bounding boxes, projected bounds and GeoJSON AOI footprints from a
registered `DistrictConfig` (see `districts.py`). Library functions that accept a
`bbox_wgs84` never fall back to a pilot district: callers must resolve the bbox
from a district config, so a missing argument fails loudly instead of silently
processing the wrong place.
"""

from typing import Any, Sequence
import json
from pathlib import Path
from pyproj import Transformer

from .districts import DistrictConfig


def require_bbox(bbox_wgs84: Sequence[float] | None) -> list[float]:
    """Return `bbox_wgs84` as a list, raising if the caller did not supply one."""
    if bbox_wgs84 is None:
        raise ValueError(
            "bbox_wgs84 is required; resolve it from a DistrictConfig "
            "(pipeline.hazard.flood.districts.get_district(<key>).bbox_wgs84)."
        )
    return list(bbox_wgs84)


def get_bbox_wgs84(district: DistrictConfig) -> list[float]:
    """Return the district bounding box in WGS84 [min_lon, min_lat, max_lon, max_lat]."""
    return list(district.bbox_wgs84)


def get_bounds_projected(
    district: DistrictConfig,
    target_crs: str | None = None,
) -> tuple[float, float, float, float]:
    """Convert the district WGS84 bbox to projected (minx, miny, maxx, maxy).

    `target_crs` defaults to the district's processing CRS.
    """
    transformer = Transformer.from_crs("EPSG:4326", target_crs or district.processing_crs, always_xy=True)
    min_lon, min_lat, max_lon, max_lat = district.bbox_wgs84
    minx, miny = transformer.transform(min_lon, min_lat)
    maxx, maxy = transformer.transform(max_lon, max_lat)
    return (minx, miny, maxx, maxy)


def get_geojson_polygon(district: DistrictConfig) -> dict[str, Any]:
    """Return a GeoJSON FeatureCollection holding the district bbox polygon."""
    min_lon, min_lat, max_lon, max_lat = district.bbox_wgs84
    coordinates = [
        [
            [min_lon, min_lat],
            [max_lon, min_lat],
            [max_lon, max_lat],
            [min_lon, max_lat],
            [min_lon, min_lat],
        ]
    ]
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "name": f"{district.name} Pilot AOI",
                    "district": district.name,
                    "state": district.state,
                    "lgd_code": district.lgd_code,
                    "basin": district.river_basin,
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": coordinates,
                },
            }
        ],
    }


def save_boundary(district: DistrictConfig, filepath: str | Path) -> Path:
    """Save the district AOI polygon to a GeoJSON file."""
    path = Path(filepath)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(get_geojson_polygon(district), f, indent=2)
    return path
