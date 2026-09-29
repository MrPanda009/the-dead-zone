"""The Milestone A–E flood runners resolve every district value from the registry."""

import functools
import json

import matplotlib

matplotlib.use("Agg")

import numpy as np
import pytest
import rasterio
import yaml
from types import SimpleNamespace

from pipeline.hazard.flood import run_milestone_d
from pipeline.hazard.flood.aoi import get_geojson_polygon, require_bbox, save_boundary
from pipeline.hazard.flood.districts import DISTRICTS, get_district
from pipeline.hazard.flood.frequency_stack import create_master_grid
from pipeline.hazard.flood.h3_zonal import (
    compute_zonal_statistics,
    h3_cells_to_geodataframe,
    polyfill_reporting_aoi,
)
from pipeline.hazard.flood.milestone_common import MilestonePaths, build_parser
from pipeline.hazard.flood.stac import query_sentinel1_rtc, subsample_scenes_evenly
from pipeline.hazard.flood.water_mask import save_raster_geotiff


def test_barpeta_is_a_registered_district_with_its_pilot_values():
    cfg = get_district("Barpeta")
    assert cfg.lgd_code == 277
    assert cfg.bbox_wgs84 == [90.70, 26.05, 91.45, 26.75]
    assert cfg.processing_crs == "EPSG:32645"
    assert cfg.s1_scene_target == 10


@pytest.mark.parametrize("key", sorted(DISTRICTS))
def test_every_registered_district_has_a_valid_aoi(key):
    cfg = DISTRICTS[key]
    min_lon, min_lat, max_lon, max_lat = cfg.bbox_wgs84
    assert min_lon < max_lon and min_lat < max_lat
    assert cfg.processing_crs.startswith("EPSG:326")  # northern-hemisphere UTM
    props = get_geojson_polygon(cfg)["features"][0]["properties"]
    assert props["district"] == cfg.name
    assert props["lgd_code"] == cfg.lgd_code


def test_save_boundary_writes_the_requested_district(tmp_path):
    cfg = get_district("morena")
    path = save_boundary(cfg, tmp_path / "morena.geojson")
    ring = json.loads(path.read_text())["features"][0]["geometry"]["coordinates"][0]
    assert ring[0] == cfg.bbox_wgs84[:2]


def test_library_functions_refuse_to_guess_a_district():
    with pytest.raises(ValueError, match="DistrictConfig"):
        require_bbox(None)
    with pytest.raises(ValueError):
        polyfill_reporting_aoi(None)
    with pytest.raises(ValueError):
        query_sentinel1_rtc(bbox=None)  # raises before any network call
    with pytest.raises(TypeError):
        create_master_grid()  # bbox and CRS are required


def test_milestone_paths_keep_legacy_barpeta_names_and_isolate_districts(tmp_path):
    barpeta = MilestonePaths(get_district("barpeta"), root=tmp_path)
    morena = MilestonePaths(get_district("morena"), root=tmp_path)

    assert barpeta.frequency("inundation_frequency") == (
        tmp_path / "data/interim/frequency/barpeta_inundation_frequency.tif"
    )
    assert barpeta.hand("hard_zero_mask") == tmp_path / "data/interim/hand/barpeta_hard_zero_mask.tif"
    assert barpeta.processed_dir == tmp_path / "data/processed/flood/barpeta"
    assert morena.frequency("inundation_frequency").name == "morena_inundation_frequency.tif"
    assert morena.processed_dir != barpeta.processed_dir


def test_milestone_cli_requires_a_registered_district():
    parser = build_parser("test")
    assert parser.parse_args(["Morena"]).district == "morena"
    with pytest.raises(SystemExit):
        parser.parse_args([])
    with pytest.raises(SystemExit):
        parser.parse_args(["atlantis"])


def test_subsample_scenes_evenly_spans_the_window():
    scenes = [SimpleNamespace(datetime=d) for d in [5, 1, 9, 3, 7, 2, 8, 4, 6, 0]]
    picked = subsample_scenes_evenly(scenes, 4)
    days = [s.datetime for s in picked]
    assert days == sorted(days)
    assert days[0] == 0 and days[-1] == 9 and len(days) == 4
    assert len(subsample_scenes_evenly(scenes, 50)) == 10


def _write_grid(path, data, cfg, nodata, dtype, resolution=100.0):
    transform, _, _ = create_master_grid(cfg.bbox_wgs84, cfg.processing_crs, resolution_m=resolution)
    save_raster_geotiff(path, data, transform, cfg.processing_crs, nodata=nodata, dtype=dtype)


def test_zonal_statistics_take_crs_and_pixel_size_from_the_raster(tmp_path):
    cfg = get_district("wayanad")  # UTM 43N: the old hardcoded 45N default would misplace every cell
    transform, shape, _ = create_master_grid(cfg.bbox_wgs84, cfg.processing_crs, resolution_m=500.0)
    susc = tmp_path / "susc.tif"
    save_raster_geotiff(susc, np.full(shape, 0.4, dtype="float32"), transform, cfg.processing_crs,
                        nodata=np.nan, dtype="float32")

    lon = (cfg.bbox_wgs84[0] + cfg.bbox_wgs84[2]) / 2
    lat = (cfg.bbox_wgs84[1] + cfg.bbox_wgs84[3]) / 2
    cells = polyfill_reporting_aoi([lon - 0.02, lat - 0.02, lon + 0.02, lat + 0.02])[:5]
    stats = compute_zonal_statistics(h3_cells_to_geodataframe(cells), {"susceptibility": susc})

    assert np.allclose(stats["mean_flood_susceptibility"], 0.4)
    assert (stats["valid_pixel_fraction"] > 0.9).all()


@pytest.fixture
def morena_milestone_d(tmp_path, monkeypatch):
    """Synthetic Milestone B/C outputs for Morena on a coarse grid, rooted in tmp_path."""
    cfg = get_district("morena")
    paths = MilestonePaths(cfg, root=tmp_path)
    _, shape, _ = create_master_grid(cfg.bbox_wgs84, cfg.processing_crs, resolution_m=100.0)
    rng = np.random.default_rng(0)

    _write_grid(paths.frequency("inundation_frequency"), rng.random(shape).astype("float32"), cfg, np.nan, "float32")
    _write_grid(paths.frequency("valid_observation_count"), np.full(shape, 12, dtype="uint16"), cfg, 0, "uint16")
    _write_grid(paths.frequency("cropland_fraction"), rng.random(shape).astype("float32"), cfg, np.nan, "float32")
    _write_grid(paths.hand("hand"), (rng.random(shape) * 40).astype("float32"), cfg, np.nan, "float32")
    hard_zero = (rng.random(shape) > 0.8).astype("uint8")
    _write_grid(paths.hand("hard_zero_mask"), hard_zero, cfg, 255, "uint8")
    paths.frequency_meta.write_text(json.dumps({
        "observation_period": cfg.s1_datetime_range,
        "num_scenes": 12,
        "threshold_db": -16.0,
        "occurrence_threshold_pct": 80.0,
    }))

    monkeypatch.setattr(run_milestone_d, "MilestonePaths", functools.partial(MilestonePaths, root=tmp_path))
    return cfg, paths


def test_milestone_d_runs_for_a_non_barpeta_district(morena_milestone_d):
    cfg, paths = morena_milestone_d
    run_milestone_d.main(["morena"])

    with rasterio.open(paths.susceptibility("flood_susceptibility")) as src:
        assert str(src.crs) == cfg.processing_crs
        assert np.nanmax(src.read(1)) <= 1.0

    meta = yaml.safe_load(paths.susceptibility("metadata", ".yaml").read_text())
    assert meta["pilot_aoi"] == "Morena, Madhya Pradesh"
    assert meta["lgd_code"] == cfg.lgd_code
    assert meta["pilot_aoi_bbox_wgs84"] == cfg.bbox_wgs84
    assert meta["master_grid"]["resolution_m"] == 100.0
    assert meta["sentinel1"]["num_scenes"] == 12
    assert paths.susceptibility("milestone_d_preview", ".png").exists()
    assert not list(paths.susceptibility_dir.glob("barpeta_*"))


def test_milestone_d_rejects_misaligned_b_and_c_grids(morena_milestone_d):
    cfg, paths = morena_milestone_d
    # Milestone C re-run at a different resolution than B
    _, shape, _ = create_master_grid(cfg.bbox_wgs84, cfg.processing_crs, resolution_m=200.0)
    _write_grid(paths.hand("hand"), np.ones(shape, dtype="float32"), cfg, np.nan, "float32", resolution=200.0)

    with pytest.raises(ValueError, match="same --resolution"):
        run_milestone_d.main(["morena"])


def test_milestone_d_names_the_missing_upstream_milestone(tmp_path, monkeypatch):
    monkeypatch.setattr(run_milestone_d, "MilestonePaths", functools.partial(MilestonePaths, root=tmp_path))
    with pytest.raises(FileNotFoundError, match="run_milestone_b dholpur"):
        run_milestone_d.main(["dholpur"])
