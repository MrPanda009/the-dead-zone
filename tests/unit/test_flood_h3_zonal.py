from pathlib import Path
import numpy as np
import geopandas as gpd
import psycopg
import pytest

from core.config import settings
from pipeline.hazard.flood.districts import get_district
from pipeline.hazard.flood.h3_zonal import (
    polyfill_reporting_aoi,
    h3_cells_to_geodataframe,
    apply_quality_flags,
    DEFAULT_H3_RESOLUTION,
    DEFAULT_HAZARD_TYPE,
    DEFAULT_MODEL_VERSION,
)


BARPETA = get_district("barpeta")


def test_polyfill_reporting_aoi_count():
    """Verify Barpeta AOI polyfills to exactly 7,497 cells at H3 resolution 8."""
    cells = polyfill_reporting_aoi(BARPETA.bbox_wgs84, resolution=DEFAULT_H3_RESOLUTION)
    assert len(cells) == 7497
    assert len(set(cells)) == 7497  # uniqueness
    assert all(c.startswith("88") for c in cells)  # resolution 8 format


def test_h3_cells_to_geodataframe():
    """Verify conversion of H3 cell strings to GeoDataFrame with valid geometries."""
    cells = ["883ce00201fffff", "883ce00203fffff"]
    gdf = h3_cells_to_geodataframe(cells)
    assert len(gdf) == 2
    assert str(gdf.crs) == "EPSG:4326"
    assert "h3_hex" in gdf.columns
    assert "h3_int" in gdf.columns
    assert "centroid_lon" in gdf.columns
    assert "centroid_lat" in gdf.columns
    assert all(gdf.geometry.is_valid)


def test_apply_quality_flags():
    """Verify quality control flag assignment and confidence adjustment."""
    cells = ["883ce00201fffff", "883ce00203fffff", "883ce00205fffff"]
    gdf = h3_cells_to_geodataframe(cells)
    gdf["mean_flood_susceptibility"] = [0.8, 0.5, np.nan]
    gdf["mean_confidence"] = [0.9, 0.6, np.nan]
    gdf["valid_pixel_fraction"] = [0.95, 0.35, 0.0]

    qc_gdf = apply_quality_flags(gdf, min_valid_fraction=0.5)

    assert qc_gdf.loc[0, "quality_flag"] == "full"
    assert qc_gdf.loc[1, "quality_flag"] == "low_coverage"
    assert qc_gdf.loc[2, "quality_flag"] == "no_coverage"

    # Full coverage retains susceptibility and scaled confidence
    assert np.isclose(qc_gdf.loc[0, "susceptibility"], 0.8)
    assert np.isclose(qc_gdf.loc[0, "confidence"], 0.9 * 0.95)

    # Low coverage is capped at 0.3
    assert np.isclose(qc_gdf.loc[1, "susceptibility"], 0.5)
    assert qc_gdf.loc[1, "confidence"] <= 0.3

    # No coverage fills 0.0
    assert qc_gdf.loc[2, "susceptibility"] == 0.0
    assert qc_gdf.loc[2, "confidence"] == 0.0

    # Attributes
    assert (qc_gdf["hazard_type"] == DEFAULT_HAZARD_TYPE).all()
    assert (qc_gdf["model_version"] == DEFAULT_MODEL_VERSION).all()


def test_processed_artifacts_exist():
    """Verify all final processed artifacts exist per §10.5."""
    proc_dir = Path("data/processed/flood/barpeta")
    interim_dir = Path("data/interim/flood_districts/barpeta")
    assert proc_dir.exists()

    assert (proc_dir / "flood_susceptibility_h3_res8.parquet").exists()
    assert (proc_dir / "metadata.yaml").exists()

    expected_rasters = [
        "barpeta_flood_susceptibility.tif",
        "barpeta_confidence.tif",
        "barpeta_inundation_frequency.tif",
        "barpeta_hand.tif",
        "barpeta_slope.tif",
        "barpeta_cropland_fraction.tif",
    ]
    for fname in expected_rasters:
        p = interim_dir / fname
        if not p.exists():
            p = proc_dir / fname.replace("barpeta_", "")
        assert p.exists(), f"Missing expected raster artifact: {fname}"
        assert p.stat().st_size > 0, f"Empty artifact: {fname}"


def test_parquet_schema_and_contents():
    """Verify the published Barpeta GeoParquet: one row per district H3 cell, model v0.2."""
    parquet_path = Path("data/processed/flood/barpeta/flood_susceptibility_h3_res8.parquet")
    gdf = gpd.read_parquet(parquet_path)
    assert len(gdf) == 2948  # H3 res-8 cells centred within the Barpeta district polygon
    assert (gdf["model_version"] == "flood-susceptibility-v0.2").all()
    assert set(gdf["hazard_regime"]) == {"floodplain", "char_belt", "channel"}
    assert gdf["mean_anomalous_frequency"].notna().any()
    covered = gdf.dropna(subset=["mean_anomalous_frequency", "mean_inundation_frequency"])
    assert (covered["mean_anomalous_frequency"] <= covered["mean_inundation_frequency"] + 1e-6).all()
    assert "mean_flood_susceptibility" in gdf.columns
    assert "mean_cropland_fraction" in gdf.columns
    assert "susceptibility" in gdf.columns
    assert "confidence" in gdf.columns
    assert "quality_flag" in gdf.columns
    assert (gdf["hazard_type"] == "riverine_flood").all()

    # Valid value ranges
    assert gdf["susceptibility"].min() >= 0.0
    assert gdf["susceptibility"].max() <= 1.0
    assert gdf["confidence"].min() >= 0.0
    assert gdf["confidence"].max() <= 1.0


@pytest.mark.db
def test_database_hazard_static_records():
    """`run_district_flood.load_database` round-trips the published v0.2 parquet, regimes included.

    Runs against the isolated, migrated test database (`db` marker); the upsert is idempotent.
    """
    from pipeline.hazard.flood.run_district_flood import load_database

    gdf = gpd.read_parquet("data/processed/flood/barpeta/flood_susceptibility_h3_res8.parquet")
    expected_regimes = gdf["hazard_regime"].value_counts().to_dict()
    load_database(BARPETA, gdf, model_version=gdf["model_version"].iloc[0])

    conninfo = settings.get_direct_psycopg_conninfo()
    with psycopg.connect(conninfo) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*), MIN(h.susceptibility), MAX(h.susceptibility), AVG(h.susceptibility),
                       COUNT(DISTINCT h.model_version), MAX(h.model_version)
                FROM hazard_static h
                JOIN grid_cell g ON g.h3 = h.h3
                JOIN admin_boundary a ON a.id = g.admin_id
                WHERE h.hazard_type = 'riverine_flood' AND a.lgd_code = %s;
            """, (BARPETA.lgd_code,))
            count, min_s, max_s, avg_s, n_versions, version = cur.fetchone()
            cur.execute("""
                SELECT f.hazard_regime, COUNT(*)
                FROM hazard_static_flood f
                JOIN grid_cell g ON g.h3 = f.h3
                JOIN admin_boundary a ON a.id = g.admin_id
                WHERE a.lgd_code = %s
                GROUP BY f.hazard_regime;
            """, (BARPETA.lgd_code,))
            db_regimes = dict(cur.fetchall())

    assert count == len(gdf)
    assert n_versions == 1 and version == gdf["model_version"].iloc[0]
    assert min_s == pytest.approx(gdf["susceptibility"].min(), abs=1e-4)
    assert max_s == pytest.approx(gdf["susceptibility"].max(), abs=1e-4)
    assert avg_s == pytest.approx(gdf["susceptibility"].mean(), abs=1e-4)
    assert db_regimes == expected_regimes


