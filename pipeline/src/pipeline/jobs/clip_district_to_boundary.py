"""Clip a district's H3 grid to its real boundary and re-weight population with WorldPop.

`seed_pilot_data` builds Wayanad and Kodagu from a hand-typed bounding box: the stored
`admin_boundary.geom` is a 5-point rectangle, the grid fills that rectangle, and about 30%
of the cells (and of the census population) land outside the district. This job:

1. replaces `admin_boundary.geom` / `bbox` with the Census 2011 polygon;
2. deletes grid cells whose centroid is outside the polygon, plus their `hazard_static`,
   `mhi_snapshot` (FK cascade) and `hazard_dynamic` (no FK, deleted explicitly) rows;
3. re-allocates the census district total over the remaining res-8 cells, weighted by the
   WorldPop constrained raster inside the polygon (an exact census anchor, FR-5.3);
4. sets each remaining coarser cell's population to the sum of its res-8 children.

Cells the rectangle never covered (real edge cells outside the current grid) are NOT created:
they have no hazard scores and this job does not invent any. Their WorldPop share is reported.

Everything runs in one transaction with assertions, after CSV backups of every row it will
delete or overwrite.

Usage:
    uv run python -m pipeline.jobs.clip_district_to_boundary --lgd 555 --shapefile-name Wayanad \\
        --worldpop /path/to/ind_ppp_2020_constrained.tif --dry-run
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping, Optional, Sequence

import geopandas as gpd
import h3
import numpy as np
import rasterio
import shapely
from rasterio.windows import from_bounds
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection

from core.config import REPO_ROOT, settings
from core.h3_utils import h3_to_int, h3_to_str
from pipeline.exposure.population import CENSUS_2011_DISTRICT_POPULATION

logger = logging.getLogger("setu_pipeline.clip_district_to_boundary")

BOUNDARIES_SHP = REPO_ROOT / "data" / "raw" / "boundaries" / "2011_Dist.shp"
DEFAULT_BACKUP_DIR = REPO_ROOT / "data" / "backups" / "district_boundary_clip"
POPULATION_DATASET_VERSION = "worldpop2020-census2011"
SOURCE_RES = 8


@dataclass
class ClipSummary:
    lgd_code: int
    admin_id: int
    dry_run: bool
    cells_before: dict[int, int] = field(default_factory=dict)
    cells_kept: dict[int, int] = field(default_factory=dict)
    cells_deleted: dict[int, int] = field(default_factory=dict)
    rows_deleted: dict[str, int] = field(default_factory=dict)
    census_total: float = 0.0
    population_before_kept_cells: float = 0.0
    worldpop_inside_polygon: float = 0.0
    worldpop_unallocated_share: float = 0.0
    kept_cells_with_population: int = 0
    res8_population_after: float = 0.0
    backups: list[str] = field(default_factory=list)


def allocate_population(
    weights: Mapping[int, float], cells: Sequence[int], total: float, decimals: int = 2,
) -> dict[int, float]:
    """Spreads `total` over `cells` proportionally to `weights`, summing exactly to `total`.

    Cells absent from `weights` (or with zero weight) get 0. Weight held by cells outside
    `cells` is ignored, so the district total is preserved rather than leaked. The rounding
    residual goes to the heaviest cell.
    """
    kept_weight = {c: max(float(weights.get(c, 0.0)), 0.0) for c in cells}
    denom = sum(kept_weight.values())
    if denom <= 0:
        raise ValueError("No positive weight on the cells being kept; cannot allocate population.")
    allocation = {c: round(total * w / denom, decimals) for c, w in kept_weight.items()}
    residual = round(total - sum(allocation.values()), decimals)
    if residual:
        heaviest = max(kept_weight, key=kept_weight.get)
        allocation[heaviest] = round(allocation[heaviest] + residual, decimals)
    return allocation


def aggregate_to_parent(child_population: Mapping[int, float], parent_res: int) -> dict[int, float]:
    """Sums res-8 cell populations up to their parent cells at `parent_res`."""
    out: dict[int, float] = defaultdict(float)
    for cell, pop in child_population.items():
        parent = h3_to_int(h3.cell_to_parent(h3_to_str(cell), parent_res))
        out[parent] += pop
    return {k: round(v, 2) for k, v in out.items()}


def load_district_polygon(shapefile_name: str):
    districts = gpd.read_file(BOUNDARIES_SHP)
    match = districts[districts["DISTRICT"].astype(str).str.lower() == shapefile_name.lower()]
    if match.empty:
        raise SystemExit(f"District '{shapefile_name}' not found in {BOUNDARIES_SHP.name}")
    return match.to_crs("EPSG:4326").geometry.union_all()


def worldpop_cell_weights(polygon, raster_path: Path, res: int = SOURCE_RES) -> dict[int, float]:
    """WorldPop people per H3 cell, counting only pixels whose centre is inside `polygon`."""
    minx, miny, maxx, maxy = polygon.bounds
    with rasterio.open(raster_path) as src:
        window = from_bounds(minx - 0.02, miny - 0.02, maxx + 0.02, maxy + 0.02, src.transform)
        window = window.round_offsets().round_lengths()
        data = src.read(1, window=window).astype("float64")
        transform = src.window_transform(window)
        nodata = src.nodata
    data[(data == nodata) | ~np.isfinite(data) | (data < 0)] = 0.0
    rows, cols = np.indices(data.shape)
    xs, ys = rasterio.transform.xy(transform, rows.ravel(), cols.ravel())
    xs, ys, pop = np.asarray(xs), np.asarray(ys), data.ravel()
    inside = shapely.contains_xy(polygon, xs, ys) & (pop > 0)
    weights: dict[int, float] = defaultdict(float)
    for x, y, p in zip(xs[inside], ys[inside], pop[inside]):
        weights[h3_to_int(h3.latlng_to_cell(float(y), float(x), res))] += float(p)
    return dict(weights)


def _dump(path: Path, header: Sequence[str], rows: Sequence[Sequence[Any]]) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(header)
        writer.writerows(rows)
    return str(path)


def _backup(conn: Connection, admin_id: int, outside: list[int], out_dir: Path) -> list[str]:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    files: list[str] = []

    def dump(name: str, sql: str, params: dict[str, Any]) -> None:
        result = conn.execute(text(sql), params)
        files.append(_dump(out_dir / f"{name}_{stamp}.csv", list(result.keys()), result.all()))

    dump("admin_boundary", "SELECT id, level, lgd_code, name, parent_id, ST_AsEWKT(geom) AS geom, "
         "ST_AsEWKT(bbox) AS bbox FROM admin_boundary WHERE id = :a", {"a": admin_id})
    dump("grid_cell", "SELECT h3, res, admin_id, habitation_id, ST_AsEWKT(centroid::geometry) AS centroid, "
         "ST_AsEWKT(geom) AS geom, population, built_area_m2, dataset_version FROM grid_cell "
         "WHERE admin_id = :a ORDER BY res, h3", {"a": admin_id})
    dump("hazard_static", "SELECT * FROM hazard_static WHERE h3 = ANY(:c)", {"c": outside})
    dump("mhi_snapshot", "SELECT * FROM mhi_snapshot WHERE h3 = ANY(:c)", {"c": outside})
    dump("hazard_dynamic", "SELECT * FROM hazard_dynamic WHERE h3 = ANY(:c)", {"c": outside})
    return files


def clip_district(
    lgd_code: int,
    shapefile_name: str,
    worldpop_path: Path,
    *,
    dry_run: bool = False,
    backup_dir: Path = DEFAULT_BACKUP_DIR,
) -> ClipSummary:
    polygon = load_district_polygon(shapefile_name)
    census_total = float(CENSUS_2011_DISTRICT_POPULATION[shapefile_name.lower()])
    weights = worldpop_cell_weights(polygon, worldpop_path)
    engine = create_engine(settings.get_sqlalchemy_url(direct=True), pool_pre_ping=True)

    with engine.begin() as conn:
        admin_id = conn.execute(
            text("SELECT id FROM admin_boundary WHERE lgd_code = :l"), {"l": lgd_code}
        ).scalar_one()
        summary = ClipSummary(lgd_code=lgd_code, admin_id=admin_id, dry_run=dry_run, census_total=census_total)

        cells = conn.execute(
            text("SELECT h3, res, population FROM grid_cell WHERE admin_id = :a"), {"a": admin_id}
        ).all()
        keep: dict[int, list[int]] = defaultdict(list)
        outside: list[int] = []
        before_by_res: dict[int, int] = defaultdict(int)
        for cell, res, _ in cells:
            before_by_res[res] += 1
            lat, lng = h3.cell_to_latlng(h3_to_str(int(cell)))
            if polygon.contains(shapely.Point(lng, lat)):
                keep[res].append(int(cell))
            else:
                outside.append(int(cell))
        summary.cells_before = dict(before_by_res)
        summary.cells_kept = {r: len(v) for r, v in keep.items()}
        summary.cells_deleted = {r: before_by_res[r] - len(keep.get(r, [])) for r in before_by_res}

        kept8 = keep.get(SOURCE_RES, [])
        allocation = allocate_population(weights, kept8, census_total)
        parent_pop = {
            res: aggregate_to_parent(allocation, res) for res in keep if res != SOURCE_RES
        }
        for res, cell_list in keep.items():
            if res != SOURCE_RES:
                parent_pop[res] = {c: parent_pop[res].get(c, 0.0) for c in cell_list}

        total_weight = sum(weights.values())
        summary.worldpop_inside_polygon = round(total_weight, 1)
        summary.worldpop_unallocated_share = round(
            1 - sum(weights.get(c, 0.0) for c in kept8) / total_weight, 4
        )
        kept8_set = set(kept8)
        summary.population_before_kept_cells = round(
            sum(float(p or 0) for c, r, p in cells if r == SOURCE_RES and int(c) in kept8_set), 1
        )
        summary.kept_cells_with_population = sum(1 for v in allocation.values() if v > 0)
        summary.res8_population_after = round(sum(allocation.values()), 2)

        for table in ("hazard_static", "mhi_snapshot", "hazard_dynamic"):
            summary.rows_deleted[table] = conn.execute(
                text(f"SELECT count(*) FROM {table} WHERE h3 = ANY(:c)"), {"c": outside}
            ).scalar_one()

        if dry_run:
            return summary

        summary.backups = _backup(conn, admin_id, outside, backup_dir)

        wkt = shapely.to_wkt(polygon, rounding_precision=8)
        conn.execute(
            text("""UPDATE admin_boundary
                    SET geom = ST_Multi(ST_SetSRID(ST_GeomFromText(:w), 4326)),
                        bbox = ST_Envelope(ST_SetSRID(ST_GeomFromText(:w), 4326))
                    WHERE id = :a"""),
            {"w": wkt, "a": admin_id},
        )
        conn.execute(text("DELETE FROM hazard_dynamic WHERE h3 = ANY(:c)"), {"c": outside})
        conn.execute(text("DELETE FROM grid_cell WHERE h3 = ANY(:c)"), {"c": outside})  # cascades

        update = text("""
            UPDATE grid_cell g SET population = v.p, dataset_version = :dv
            FROM unnest(CAST(:h AS bigint[]), CAST(:p AS real[])) AS v(h, p)
            WHERE g.h3 = v.h AND g.admin_id = :a
        """)
        for pop_map in (allocation, *parent_pop.values()):
            conn.execute(update, {"h": list(pop_map), "p": list(pop_map.values()),
                                  "dv": POPULATION_DATASET_VERSION, "a": admin_id})

        # Assertions: any failure raises and rolls the whole transaction back.
        stray = conn.execute(
            text("""SELECT count(*) FROM grid_cell g JOIN admin_boundary a ON a.id = g.admin_id
                    WHERE g.admin_id = :a AND NOT ST_Within(g.centroid::geometry, a.geom)"""),
            {"a": admin_id},
        ).scalar_one()
        assert stray == 0, f"{stray} cells still outside the boundary"
        remaining = dict(conn.execute(
            text("SELECT res, count(*) FROM grid_cell WHERE admin_id = :a GROUP BY res"), {"a": admin_id}
        ).all())
        assert remaining == summary.cells_kept, f"cell counts {remaining} != expected {summary.cells_kept}"
        pop_sum = conn.execute(
            text("SELECT sum(population) FROM grid_cell WHERE admin_id = :a AND res = :r"),
            {"a": admin_id, "r": SOURCE_RES},
        ).scalar_one()
        assert abs(float(pop_sum) - census_total) < 5.0, f"res-8 population {pop_sum} != census {census_total}"
        orphans = conn.execute(
            text("SELECT count(*) FROM hazard_dynamic d WHERE d.h3 = ANY(:c)"), {"c": outside}
        ).scalar_one()
        assert orphans == 0
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--lgd", type=int, required=True)
    parser.add_argument("--shapefile-name", required=True, help="DISTRICT value in 2011_Dist.shp (e.g. Wayanad).")
    parser.add_argument("--worldpop", type=Path, required=True, help="WorldPop constrained raster (India-wide OK).")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--backup-dir", type=Path, default=DEFAULT_BACKUP_DIR)
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    summary = clip_district(args.lgd, args.shapefile_name, args.worldpop,
                            dry_run=args.dry_run, backup_dir=args.backup_dir)
    print(json.dumps(asdict(summary), indent=2, default=str))


if __name__ == "__main__":
    main()
