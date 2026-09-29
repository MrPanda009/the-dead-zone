"""Milestone E Runner: Step 10 End-to-End (H3 Aggregation & Database Load) for any registered district.

Moves flood susceptibility onto the platform's common H3 resolution 8 hexagonal grid:
  1. Polyfills the district reporting AOI at H3 Res 8 (bbox, or the census polygon
     with --clip-to-boundary).
  2. Computes exact fractional-coverage zonal statistics using exactextract across all rasters.
  3. Applies §10.3 quality control flagging for edge/low-coverage cells.
  4. Exports canonical GeoParquet artifact to data/processed/flood/<district>/.
  5. Copies final rasters and exports metadata.yaml and water_rule_scorecard.json.
  6. Upserts admin_boundary, grid_cell, hazard_static (with quality_flag) and
     hazard_static_flood rows into PostgreSQL as 'riverine_flood'.
  7. Validates round-trip query from PostgreSQL and renders 4-panel verification preview.

Usage:
    uv run python -m pipeline.hazard.flood.run_milestone_e <district> [--clip-to-boundary]
"""

import shutil
import json
import time
from pathlib import Path
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import geopandas as gpd
from shapely import wkt
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import rasterio
import psycopg
import yaml

from core.config import settings
from pipeline.hazard.flood.districts import DistrictConfig
from pipeline.hazard.flood.milestone_common import (
    MilestonePaths,
    build_parser,
    print_banner,
    require_inputs,
    resolve_district,
)
from pipeline.hazard.flood.hand_terrain import (
    DEFAULT_HARD_ZERO_HAND_THRESHOLD_M,
    DEFAULT_HARD_ZERO_SLOPE_THRESHOLD_DEG,
)
from pipeline.hazard.flood.susceptibility import DEFAULT_OBSERVATION_CEILING
from pipeline.hazard.flood.h3_zonal import (
    polyfill_reporting_aoi,
    h3_cells_to_geodataframe,
    compute_zonal_statistics,
    apply_quality_flags,
    export_parquet,
    DEFAULT_H3_RESOLUTION,
    DEFAULT_MIN_VALID_PIXEL_FRACTION,
    DEFAULT_MODEL_VERSION,
    DEFAULT_HAZARD_TYPE,
)

# Water-rule benchmark figures recorded for a district's pilot validation. They
# are not computed by this runner; a district without an entry is reported as
# NOT_BENCHMARKED rather than inheriting another district's numbers.
WATER_RULE_BENCHMARKS: dict[str, dict] = {
    "barpeta": {
        "scorecard_metrics": {
            "water_detection_precision_proxy": 0.942,
            "water_detection_recall_proxy": 0.918,
            "permanent_water_agreement_jrc_pct": 98.4,
            "hillshade_false_positive_rate_pct": 0.0,
        },
        "status": "PASSED_M7_BENCHMARK",
    },
}


def input_rasters(paths: MilestonePaths) -> dict[str, Path]:
    """Milestone B/C/D outputs aggregated per H3 cell (population only if present)."""
    rasters = {
        "susceptibility": paths.susceptibility("flood_susceptibility"),
        "confidence": paths.susceptibility("confidence"),
        "frequency": paths.frequency("inundation_frequency"),
        "hand": paths.hand("hand"),
        "slope": paths.hand("slope"),
        "cropland": paths.susceptibility("cropland_fraction"),
        "hard_zero": paths.hand("hard_zero_mask"),
    }
    if paths.population_raster.exists():
        rasters["population"] = paths.population_raster
    else:
        print(f"  [!] {paths.population_raster.name} not found; population -> 0. Produce it with: "
              f"uv run python -m pipeline.ingestion.fetch_worldpop --district {paths.district.key}")
    return rasters


def _nullable_float(value) -> float | None:
    """Converts a numpy scalar to a Python float, mapping NaN to SQL NULL.

    NaN must not reach a REAL column: it would read back as a number and be indistinguishable
    from a measured zero in the dossier.
    """
    if value is None:
        return None
    f = float(value)
    return None if np.isnan(f) else f


def copy_final_rasters(rasters: dict[str, Path], dest_dir: Path) -> dict[str, Path]:
    """Copies final interim rasters to processed destination."""
    dest_dir.mkdir(parents=True, exist_ok=True)
    filenames = {
        "susceptibility": "flood_susceptibility.tif",
        "confidence": "confidence.tif",
        "frequency": "inundation_frequency.tif",
        "hand": "hand.tif",
        "slope": "slope.tif",
        "cropland": "cropland_fraction.tif",
        "population": "population.tif",
    }
    mapping = {key: (filename, rasters[key]) for key, filename in filenames.items() if key in rasters}
    copied = {}
    for key, (filename, src_path) in mapping.items():
        dst_path = dest_dir / filename
        if src_path.exists():
            shutil.copy2(src_path, dst_path)
            copied[key] = dst_path
            print(f"  [+] Copied {src_path.name} -> {dst_path.name} ({dst_path.stat().st_size / 1e6:.1f} MB)")
        else:
            print(f"  [!] Warning: {src_path} not found")
    return copied


def load_database(
    cfg: DistrictConfig,
    stats_gdf: gpd.GeoDataFrame,
    admin_geom_wkt: str | None = None,
) -> dict:
    """Upserts admin_boundary, grid_cell, hazard_static and hazard_static_flood records into PostgreSQL.

    Args:
        cfg: District whose cells are being loaded.
        stats_gdf: Quality-flagged H3 zonal statistics from this run.
        admin_geom_wkt: Optional district polygon (WKT, EPSG:4326) stored on admin_boundary.

    Returns:
        Dictionary of database round-trip validation results for this run's cells.
    """
    min_lon, min_lat, max_lon, max_lat = cfg.bbox_wgs84
    h3_ids = [int(h) for h in stats_gdf["h3_int"]]
    conninfo = settings.get_direct_psycopg_conninfo()
    print(f"\n[5/7] Connecting to PostgreSQL at {conninfo.split('@')[-1]}...")

    with psycopg.connect(conninfo, autocommit=False) as conn:
        with conn.cursor() as cur:
            # 1. Ensure the district admin boundary exists
            if admin_geom_wkt:
                cur.execute("""
                    INSERT INTO admin_boundary (level, lgd_code, name, bbox, geom)
                    VALUES (
                        'district', %s, %s,
                        ST_MakeEnvelope(%s, %s, %s, %s, 4326),
                        ST_Multi(ST_GeomFromText(%s, 4326))
                    )
                    ON CONFLICT (lgd_code) DO UPDATE SET name = EXCLUDED.name, geom = EXCLUDED.geom
                    RETURNING id;
                """, (cfg.lgd_code, cfg.name, min_lon, min_lat, max_lon, max_lat, admin_geom_wkt))
            else:
                cur.execute("""
                    INSERT INTO admin_boundary (level, lgd_code, name, bbox)
                    VALUES (
                        'district', %s, %s,
                        ST_MakeEnvelope(%s, %s, %s, %s, 4326)
                    )
                    ON CONFLICT (lgd_code) DO UPDATE SET name = EXCLUDED.name
                    RETURNING id;
                """, (cfg.lgd_code, cfg.name, min_lon, min_lat, max_lon, max_lat))
            admin_id = cur.fetchone()[0]
            print(f"  [+] Admin boundary: {cfg.name} (id={admin_id}, lgd_code={cfg.lgd_code})")

            # 2. Register pipeline run
            cur.execute("""
                INSERT INTO pipeline_run (
                    run_type, status, code_version, config_version, model_version
                ) VALUES (
                    'HAZARD_STATIC', 'READY', 'step10-milestone-e', 'v1.0', %s
                ) RETURNING id;
            """, (DEFAULT_MODEL_VERSION,))
            pipeline_run_id = cur.fetchone()[0]
            print(f"  [+] Registered pipeline_run: {pipeline_run_id}")

            # 3. Upsert grid_cell records
            print(f"  [+] Upserting {len(stats_gdf)} cells into grid_cell...")
            grid_data = []
            for _, row in stats_gdf.iterrows():
                pop_val = float(row["population"]) if "population" in row and not np.isnan(row["population"]) else 0.0
                grid_data.append((
                    int(row["h3_int"]),
                    DEFAULT_H3_RESOLUTION,
                    admin_id,
                    float(row["centroid_lon"]),
                    float(row["centroid_lat"]),
                    row["geometry"].wkt,
                    pop_val,
                    0.0,
                    f"{cfg.key}-h3-res{DEFAULT_H3_RESOLUTION}-v1",
                ))

            cur.executemany("""
                INSERT INTO grid_cell (
                    h3, res, admin_id, centroid, geom, population, built_area_m2, dataset_version
                ) VALUES (
                    %s, %s, %s,
                    ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography,
                    ST_GeomFromText(%s, 4326),
                    %s, %s, %s
                )
                ON CONFLICT (h3) DO UPDATE SET
                    admin_id = COALESCE(grid_cell.admin_id, EXCLUDED.admin_id),
                    geom = EXCLUDED.geom,
                    centroid = EXCLUDED.centroid,
                    population = EXCLUDED.population;
            """, grid_data)

            # 4. Upsert hazard_static records
            # quality_flag travels with the score: a 'no_coverage' cell holds susceptibility
            # 0.0 because apply_quality_flags() filled NaN, not because it was measured as
            # safe. Dropping the flag here is what would let the map paint blind cells green.
            print(f"  [+] Upserting {len(stats_gdf)} rows into hazard_static (hazard_type='{DEFAULT_HAZARD_TYPE}')...")
            hazard_data = []
            for _, row in stats_gdf.iterrows():
                hazard_data.append((
                    int(row["h3_int"]),
                    DEFAULT_HAZARD_TYPE,
                    float(row["susceptibility"]),
                    float(row["confidence"]),
                    str(row["quality_flag"]),
                    DEFAULT_MODEL_VERSION,
                    pipeline_run_id,
                ))

            cur.executemany("""
                INSERT INTO hazard_static (
                    h3, hazard_type, susceptibility, confidence, quality_flag,
                    model_version, pipeline_run_id
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s
                )
                ON CONFLICT (h3, hazard_type) DO UPDATE SET
                    susceptibility = EXCLUDED.susceptibility,
                    confidence = EXCLUDED.confidence,
                    quality_flag = EXCLUDED.quality_flag,
                    model_version = EXCLUDED.model_version,
                    pipeline_run_id = EXCLUDED.pipeline_run_id;
            """, hazard_data)

            # 5. Upsert hazard_static_flood driver metrics
            # The GeoParquet carries 20 columns and hazard_static carries 5. These are the
            # physical drivers GET /hazard/cells/{h3} needs to explain a score.
            print(f"  [+] Upserting {len(stats_gdf)} rows into hazard_static_flood...")
            driver_data = []
            for _, row in stats_gdf.iterrows():
                driver_data.append((
                    int(row["h3_int"]),
                    _nullable_float(row["max_flood_susceptibility"]),
                    _nullable_float(row["valid_pixel_fraction"]),
                    _nullable_float(row["hard_zero_fraction"]),
                    _nullable_float(row["mean_inundation_frequency"]),
                    _nullable_float(row["mean_hand"]),
                    _nullable_float(row["min_hand"]),
                    _nullable_float(row["mean_slope"]),
                    _nullable_float(row["mean_cropland_fraction"]),
                    DEFAULT_OBSERVATION_CEILING,
                    DEFAULT_MODEL_VERSION,
                    pipeline_run_id,
                ))

            cur.executemany("""
                INSERT INTO hazard_static_flood (
                    h3, max_susceptibility, valid_pixel_fraction, hard_zero_fraction,
                    mean_inundation_frequency, mean_hand_m, min_hand_m, mean_slope_deg,
                    mean_cropland_fraction, observation_ceiling, model_version, pipeline_run_id
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                ON CONFLICT (h3) DO UPDATE SET
                    max_susceptibility = EXCLUDED.max_susceptibility,
                    valid_pixel_fraction = EXCLUDED.valid_pixel_fraction,
                    hard_zero_fraction = EXCLUDED.hard_zero_fraction,
                    mean_inundation_frequency = EXCLUDED.mean_inundation_frequency,
                    mean_hand_m = EXCLUDED.mean_hand_m,
                    min_hand_m = EXCLUDED.min_hand_m,
                    mean_slope_deg = EXCLUDED.mean_slope_deg,
                    mean_cropland_fraction = EXCLUDED.mean_cropland_fraction,
                    observation_ceiling = EXCLUDED.observation_ceiling,
                    model_version = EXCLUDED.model_version,
                    pipeline_run_id = EXCLUDED.pipeline_run_id;
            """, driver_data)

            conn.commit()

        # 5. Round-trip validation query from database
        print("\n[6/7] Validating round-trip query directly from PostgreSQL...")
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    COUNT(*) as total_rows,
                    MIN(susceptibility) as min_susc,
                    MAX(susceptibility) as max_susc,
                    AVG(susceptibility) as avg_susc,
                    MIN(confidence) as min_conf,
                    MAX(confidence) as max_conf,
                    AVG(confidence) as avg_conf,
                    COUNT(*) FILTER (WHERE susceptibility > 0.7) as high_risk_cells,
                    COUNT(*) FILTER (WHERE susceptibility = 0.0) as zero_risk_cells,
                    COUNT(*) FILTER (WHERE confidence < 0.3) as low_conf_cells
                FROM hazard_static
                WHERE hazard_type = %s AND h3 = ANY(%s);
            """, (DEFAULT_HAZARD_TYPE, h3_ids))
            row = cur.fetchone()
            db_stats = {
                "total_rows": row[0],
                "min_susc": float(row[1]),
                "max_susc": float(row[2]),
                "avg_susc": float(row[3]),
                "min_conf": float(row[4]),
                "max_conf": float(row[5]),
                "avg_conf": float(row[6]),
                "high_risk_cells": row[7],
                "zero_risk_cells": row[8],
                "low_conf_cells": row[9],
            }

            print(f"  [+] hazard_static Total Rows: {db_stats['total_rows']:,}")
            print(f"  [+] Susceptibility Range: [{db_stats['min_susc']:.4f}, {db_stats['max_susc']:.4f}], Mean: {db_stats['avg_susc']:.4f}")
            print(f"  [+] Confidence Range:     [{db_stats['min_conf']:.4f}, {db_stats['max_conf']:.4f}], Mean: {db_stats['avg_conf']:.4f}")
            print(f"  [+] High Risk Cells (>0.7): {db_stats['high_risk_cells']:,} ({db_stats['high_risk_cells']/db_stats['total_rows']*100:.1f}%)")
            print(f"  [+] Zero Risk Cells (=0.0): {db_stats['zero_risk_cells']:,} ({db_stats['zero_risk_cells']/db_stats['total_rows']*100:.1f}%)")

            # Fetch spatial geometries joined from Postgres for rendering
            cur.execute("""
                SELECT
                    h.h3,
                    h.susceptibility,
                    h.confidence,
                    ST_AsText(g.geom) as geom_wkt
                FROM hazard_static h
                JOIN grid_cell g ON h.h3 = g.h3
                WHERE h.hazard_type = %s AND h.h3 = ANY(%s);
            """, (DEFAULT_HAZARD_TYPE, h3_ids))
            db_records = cur.fetchall()

    return {
        "stats": db_stats,
        "db_records": db_records,
        "pipeline_run_id": str(pipeline_run_id),
    }


def render_verification_preview(
    cfg: DistrictConfig,
    stats_gdf: gpd.GeoDataFrame,
    db_records: list,
    output_paths: list[Path],
):
    """Renders 4-panel verification preview: renders directly from Postgres-queried records."""
    print(f"\n[7/7] Rendering 4-panel verification preview...")

    # Build GeoDataFrame from database records to prove rendering directly from Postgres
    db_h3 = [r[0] for r in db_records]
    db_susc = [r[1] for r in db_records]
    db_conf = [r[2] for r in db_records]
    db_geoms = [wkt.loads(r[3]) for r in db_records]

    db_gdf = gpd.GeoDataFrame(
        {"h3": db_h3, "susceptibility": db_susc, "confidence": db_conf, "geometry": db_geoms},
        crs="EPSG:4326",
    )

    # Merge auxiliary metrics from stats_gdf for panels 2 & 3
    merged_gdf = db_gdf.merge(
        stats_gdf[["h3_int", "mean_hand", "mean_cropland_fraction", "mean_inundation_frequency"]],
        left_on="h3",
        right_on="h3_int",
        how="left",
    )

    fig, axes = plt.subplots(2, 2, figsize=(18, 16), dpi=150)
    plt.subplots_adjust(wspace=0.15, hspace=0.22)

    # Colormaps
    cmap_susc = plt.cm.plasma
    cmap_hand = plt.cm.terrain_r
    cmap_crop = plt.cm.YlGn

    # Panel 1: Flood Susceptibility (From PostgreSQL)
    ax1 = axes[0, 0]
    ax1.set_facecolor("#1a1a2e")
    merged_gdf.plot(
        column="susceptibility",
        ax=ax1,
        cmap=cmap_susc,
        vmin=0.0,
        vmax=1.0,
        edgecolor="none",
        legend=True,
        legend_kwds={"label": "Mean Flood Susceptibility (0-1)", "shrink": 0.7, "pad": 0.02},
    )
    ax1.set_title(f"Panel 1: Flood Susceptibility (Queried from PostgreSQL)\n{cfg.name} Pilot (H3 Res {DEFAULT_H3_RESOLUTION}, {len(db_gdf):,} Hexagons)", fontsize=12, fontweight="bold", pad=8)
    ax1.set_xlabel("Longitude (°E)", fontsize=10)
    ax1.set_ylabel("Latitude (°N)", fontsize=10)
    ax1.grid(True, linestyle=":", alpha=0.3, color="white")

    # Panel 2: Mean HAND
    ax2 = axes[0, 1]
    ax2.set_facecolor("#1a1a2e")
    merged_gdf.plot(
        column="mean_hand",
        ax=ax2,
        cmap=cmap_hand,
        vmin=0.0,
        vmax=25.0,
        edgecolor="none",
        legend=True,
        legend_kwds={"label": "Mean HAND (m, capped at 25m)", "shrink": 0.7, "pad": 0.02},
    )
    ax2.set_title("Panel 2: Height Above Nearest Drainage (Mean HAND)\nDrainage Corridors & Low Floodplain Depressions", fontsize=12, fontweight="bold", pad=8)
    ax2.set_xlabel("Longitude (°E)", fontsize=10)
    ax2.set_ylabel("Latitude (°N)", fontsize=10)
    ax2.grid(True, linestyle=":", alpha=0.3, color="white")

    # Panel 3: Cropland Fraction
    ax3 = axes[1, 0]
    ax3.set_facecolor("#1a1a2e")
    merged_gdf.plot(
        column="mean_cropland_fraction",
        ax=ax3,
        cmap=cmap_crop,
        vmin=0.0,
        vmax=1.0,
        edgecolor="none",
        legend=True,
        legend_kwds={"label": "Mean Cropland Fraction (0-1)", "shrink": 0.7, "pad": 0.02},
    )
    ax3.set_title("Panel 3: Agricultural Exposure (ESA WorldCover 10m)\nMean Cropland Coverage per H3 Cell", fontsize=12, fontweight="bold", pad=8)
    ax3.set_xlabel("Longitude (°E)", fontsize=10)
    ax3.set_ylabel("Latitude (°N)", fontsize=10)
    ax3.grid(True, linestyle=":", alpha=0.3, color="white")

    # Panel 4: Susceptibility Distribution & Percentiles
    ax4 = axes[1, 1]
    ax4.set_facecolor("#f8f9fa")
    susc_vals = merged_gdf["susceptibility"].to_numpy()
    valid_susc = susc_vals[susc_vals > 0]  # non-zero distribution

    p50 = np.percentile(valid_susc, 50)
    p75 = np.percentile(valid_susc, 75)
    p90 = np.percentile(valid_susc, 90)

    n, bins, patches = ax4.hist(valid_susc, bins=50, density=True, color="#4361ee", alpha=0.75, edgecolor="#3a0ca3")
    ax4.axvline(p50, color="#2b9348", linestyle="--", linewidth=2, label=f"P50 (Median): {p50:.3f}")
    ax4.axvline(p75, color="#e85d04", linestyle="--", linewidth=2, label=f"P75: {p75:.3f}")
    ax4.axvline(p90, color="#d00000", linestyle="--", linewidth=2, label=f"P90: {p90:.3f}")

    ax4.set_title("Panel 4: Susceptibility Distribution (Non-Zero Cells)\nH3 Res-8 Frequency & Statistical Percentiles", fontsize=12, fontweight="bold", pad=8)
    ax4.set_xlabel("Susceptibility Value", fontsize=10)
    ax4.set_ylabel("Probability Density", fontsize=10)
    ax4.legend(loc="upper right", framealpha=0.9)
    ax4.grid(True, linestyle=":", alpha=0.6)

    # Statistical summary text box
    stats_text = (
        f"Database Row Count: {len(db_gdf):,}\n"
        f"Mean Susceptibility: {np.mean(susc_vals):.3f}\n"
        f"Std Dev: {np.std(susc_vals):.3f}\n"
        f"Zero-Risk Cells: {np.sum(susc_vals == 0):,} ({np.mean(susc_vals == 0)*100:.1f}%)\n"
        f"High-Risk Cells (>0.7): {np.sum(susc_vals > 0.7):,} ({np.mean(susc_vals > 0.7)*100:.1f}%)\n"
        f"Mean Cropland Frac: {merged_gdf['mean_cropland_fraction'].mean():.3f}"
    )
    ax4.text(
        0.04,
        0.95,
        stats_text,
        transform=ax4.transAxes,
        fontsize=9.5,
        verticalalignment="top",
        bbox=dict(boxstyle="round,pad=0.5", facecolor="white", alpha=0.9, edgecolor="#ccc"),
    )

    fig.suptitle(
        f"SETU-DRR Platform — Milestone E Verification (Step 10) — {cfg.name}\n"
        "H3 Resolution 8 Zonal Aggregation & Live PostgreSQL Rendering (hazard_type='riverine_flood')",
        fontsize=15,
        fontweight="bold",
        y=0.98,
    )

    for p in output_paths:
        p.parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(p, bbox_inches="tight", dpi=150)
        print(f"  [+] Saved preview figure: {p}")

    plt.close()


def main(argv: list[str] | None = None):
    parser = build_parser("Milestone E (Step 10): H3 aggregation, GeoParquet export and PostgreSQL load")
    parser.add_argument("--clip-to-boundary", action="store_true",
                        help="Keep only H3 cells whose centroid lies inside the Census 2011 district polygon "
                             "(recommended for districts whose bbox overlaps a neighbour's)")
    args = parser.parse_args(argv)
    cfg = resolve_district(args)
    paths = MilestonePaths(cfg)

    t_start = time.time()
    print_banner("Milestone E (Step 10)", cfg, task="H3 Res-8 Zonal Aggregation, Parquet Export & PostgreSQL Load")

    rasters = input_rasters(paths)
    require_inputs(rasters["susceptibility"], rasters["confidence"], produced_by="run_milestone_d", district=cfg)
    processed_dir = paths.processed_dir
    s1_record = paths.read_frequency_meta()

    # -----------------------------------------------------------------
    # 1. Polyfill Reporting AOI
    # -----------------------------------------------------------------
    print(f"\n[1/7] Polyfilling {cfg.name} reporting AOI at H3 Res {DEFAULT_H3_RESOLUTION}...")
    cells = polyfill_reporting_aoi(cfg.bbox_wgs84, resolution=DEFAULT_H3_RESOLUTION)
    print(f"  [+] Generated {len(cells):,} H3 Resolution {DEFAULT_H3_RESOLUTION} cells covering AOI bbox {cfg.bbox_wgs84}")

    # -----------------------------------------------------------------
    # 2. Convert to GeoDataFrame
    # -----------------------------------------------------------------
    print("\n[2/7] Converting H3 cells to GeoDataFrame (EPSG:4326)...")
    cells_gdf = h3_cells_to_geodataframe(cells)
    admin_geom_wkt = None
    if args.clip_to_boundary:
        from pipeline.hazard.flood.run_district_flood import load_district_geometry

        district_geom = load_district_geometry(cfg)
        centroids = gpd.GeoSeries(
            gpd.points_from_xy(cells_gdf["centroid_lon"], cells_gdf["centroid_lat"]),
            crs="EPSG:4326",
        )
        cells_gdf = cells_gdf.loc[centroids.within(district_geom).to_numpy()].reset_index(drop=True)
        admin_geom_wkt = district_geom.wkt
        print(f"  [+] Clipped to {len(cells_gdf):,} cells centred within the {cfg.name} census polygon")
    print(f"  [+] Created GeoDataFrame with {len(cells_gdf):,} hexagonal geometries")

    # -----------------------------------------------------------------
    # 3. Compute Zonal Statistics
    # -----------------------------------------------------------------
    print("\n[3/7] Computing fractional-coverage zonal statistics using exactextract...")
    t_zonal = time.time()
    # Reproject cells into the rasters' own CRS/pixel size (Milestone B/C master grid).
    stats_raw = compute_zonal_statistics(
        cells_gdf=cells_gdf,
        raster_paths=rasters,
    )
    print(f"  [+] Zonal statistics computed across {len(rasters)} rasters in {time.time() - t_zonal:.2f}s")

    # -----------------------------------------------------------------
    # 4. Apply Quality Control
    # -----------------------------------------------------------------
    print(f"\n[4/7] Applying §10.3 quality control (valid_pixel_fraction threshold={DEFAULT_MIN_VALID_PIXEL_FRACTION})...")
    stats_gdf = apply_quality_flags(
        stats_raw,
        min_valid_fraction=DEFAULT_MIN_VALID_PIXEL_FRACTION,
        model_version=DEFAULT_MODEL_VERSION,
        hazard_type=DEFAULT_HAZARD_TYPE,
    )

    q_counts = stats_gdf["quality_flag"].value_counts().to_dict()
    print(f"  [+] Quality Flags: {q_counts}")
    print(f"  [+] Susceptibility Range: [{stats_gdf['susceptibility'].min():.4f}, {stats_gdf['susceptibility'].max():.4f}], Mean: {stats_gdf['susceptibility'].mean():.4f}")
    print(f"  [+] Confidence Range:     [{stats_gdf['confidence'].min():.4f}, {stats_gdf['confidence'].max():.4f}], Mean: {stats_gdf['confidence'].mean():.4f}")
    print(f"  [+] Cropland Frac Mean:   {stats_gdf['mean_cropland_fraction'].mean():.4f}")
    if "population" in stats_gdf.columns:
        print(f"  [+] Total District Population Sum: {stats_gdf['population'].sum():,.0f} citizens")

    # -----------------------------------------------------------------
    # 5. Export GeoParquet & Copy Rasters
    # -----------------------------------------------------------------
    processed_dir.mkdir(parents=True, exist_ok=True)
    parquet_path = processed_dir / f"flood_susceptibility_h3_res{DEFAULT_H3_RESOLUTION}.parquet"
    export_parquet(stats_gdf, parquet_path)
    print(f"  [+] Exported GeoParquet: {parquet_path} ({parquet_path.stat().st_size / 1e6:.2f} MB, {len(stats_gdf)} rows)")

    copy_final_rasters(rasters, processed_dir)

    # Write water rule scorecard
    benchmark = WATER_RULE_BENCHMARKS.get(cfg.key, {})
    scorecard = {
        "rule_name": "VV dB amplitude threshold",
        "threshold_db": s1_record.get("threshold_db"),
        "polarization": "VV",
        "target_region": f"{cfg.name}, {cfg.state} ({cfg.river_basin})",
        "source_stack": (
            f"Sentinel-1 RTC ({s1_record['num_scenes']} scenes, {s1_record['observation_period']})"
            if s1_record else None
        ),
        "hard_zero_constraints": {
            "hand_threshold_m": DEFAULT_HARD_ZERO_HAND_THRESHOLD_M,
            "slope_threshold_deg": DEFAULT_HARD_ZERO_SLOPE_THRESHOLD_DEG,
            "rule": "FR-3.17 hard zero exclusion",
        },
        "scorecard_metrics": benchmark.get("scorecard_metrics"),
        "status": benchmark.get("status", "NOT_BENCHMARKED"),
    }
    scorecard_path = processed_dir / "water_rule_scorecard.json"
    with open(scorecard_path, "w", encoding="utf-8") as f:
        json.dump(scorecard, f, indent=2)
    print(f"  [+] Exported {scorecard_path.name} (status={scorecard['status']})")

    # -----------------------------------------------------------------
    # 6. Database Load & Validation
    # -----------------------------------------------------------------
    db_result = load_database(cfg, stats_gdf, admin_geom_wkt=admin_geom_wkt)

    # Export final metadata.yaml
    metadata = {
        "pipeline_step": "Step 10 (Milestone E - H3 Aggregation & Load)",
        "district": cfg.name,
        "district_key": cfg.key,
        "state": cfg.state,
        "lgd_code": cfg.lgd_code,
        "reporting_aoi": "census_polygon" if args.clip_to_boundary else "bbox",
        "h3_resolution": DEFAULT_H3_RESOLUTION,
        "total_cells": len(stats_gdf),
        "hazard_type": DEFAULT_HAZARD_TYPE,
        "model_version": DEFAULT_MODEL_VERSION,
        "pipeline_run_id": db_result["pipeline_run_id"],
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "quality_control": {
            "valid_pixel_fraction_threshold": DEFAULT_MIN_VALID_PIXEL_FRACTION,
            "flags": q_counts,
        },
        "statistics": {
            "mean_susceptibility": float(stats_gdf["susceptibility"].mean()),
            "max_susceptibility": float(stats_gdf["susceptibility"].max()),
            "min_susceptibility": float(stats_gdf["susceptibility"].min()),
            "mean_confidence": float(stats_gdf["confidence"].mean()),
            "mean_cropland_fraction": float(stats_gdf["mean_cropland_fraction"].mean()),
            "mean_hand_m": float(stats_gdf["mean_hand"].mean()),
            "mean_inundation_frequency": float(stats_gdf["mean_inundation_frequency"].mean()),
            "database_rows": db_result["stats"]["total_rows"],
        },
        "licences_and_attribution": [
            "Copernicus Sentinel-1 data, MSPC RTC (CC BY 4.0)",
            "ASF GLO-30 HAND (CC0 1.0, derived from Copernicus GLO-30)",
            "Copernicus DEM GLO-30 (Copernicus licence)",
            "JRC Global Surface Water (Copernicus, unrestricted)",
            "ESA WorldCover 10m 2021 (CC BY 4.0)",
        ],
    }
    meta_path = processed_dir / "metadata.yaml"
    with open(meta_path, "w", encoding="utf-8") as f:
        yaml.dump(metadata, f, sort_keys=False)
    print(f"  [+] Exported {meta_path.name}")

    # -----------------------------------------------------------------
    # 7. Render 4-Panel Verification Preview
    # -----------------------------------------------------------------
    preview_path = processed_dir / f"{cfg.file_prefix}_milestone_e_preview.png"
    render_verification_preview(
        cfg,
        stats_gdf,
        db_result["db_records"],
        [preview_path],
    )

    print("\n" + "=" * 75)
    print(f"MILESTONE E COMPLETED SUCCESSFULLY for {cfg.name} in {time.time() - t_start:.2f}s")
    print(f"Final Parquet: {parquet_path}")
    print(f"Postgres Rows: {db_result['stats']['total_rows']:,} (hazard_type='{DEFAULT_HAZARD_TYPE}')")
    print(f"Preview Image: {preview_path}")
    print("=" * 75)


if __name__ == "__main__":
    main()
