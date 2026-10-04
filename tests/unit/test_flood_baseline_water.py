"""Unit tests for Priority 1 JRC baseline water separation and anomalous frequency."""

from __future__ import annotations
import numpy as np
import pytest

from pipeline.hazard.flood.permanent_water import (
    DEFAULT_SEASONAL_WATER_THRESHOLD_PCT,
    calculate_anomalous_flood_frequency,
)
from pipeline.hazard.flood.validation.alignment import filter_baseline_water
import pandas as pd


def test_calculate_anomalous_flood_frequency_excess_mode():
    """Anomalous flood frequency measures excess over JRC baseline occurrence."""
    # frequency: 0.50, JRC occ: 30% -> excess = 0.50 - 0.30 = 0.20
    # frequency: 0.20, JRC occ: 40% -> excess = max(0, 0.20 - 0.40) = 0.00
    # frequency: 0.80, JRC occ: 0%  -> excess = 0.80
    freq = np.array([0.50, 0.20, 0.80], dtype=np.float32)
    jrc_occ = np.array([30, 40, 0], dtype=np.uint8)

    anom = calculate_anomalous_flood_frequency(freq, jrc_occ, mode="excess")

    assert anom[0] == pytest.approx(0.20, abs=1e-5)
    assert anom[1] == pytest.approx(0.00, abs=1e-5)
    assert anom[2] == pytest.approx(0.80, abs=1e-5)


def test_calculate_anomalous_flood_frequency_mask_mode():
    """Mask mode zeros out persistent water bodies above baseline threshold."""
    freq = np.array([0.60, 0.40, 0.10], dtype=np.float32)
    jrc_occ = np.array([50, 30, 10], dtype=np.uint8)

    # With 40% threshold: first pixel (50%) is masked to 0
    anom = calculate_anomalous_flood_frequency(
        freq, jrc_occ, baseline_threshold_pct=40.0, mode="mask"
    )

    assert anom[0] == pytest.approx(0.00)
    assert anom[1] == pytest.approx(0.40)
    assert anom[2] == pytest.approx(0.10)


def test_filter_baseline_water():
    """filter_baseline_water drops cells exceeding the maximum baseline water fraction."""
    df = pd.DataFrame({
        "h3_hex": ["c1", "c2", "c3"],
        "baseline_water_fraction": [0.00, 0.005, 0.05],
    })

    filtered, n_ex = filter_baseline_water(
        df, baseline_fraction_col="baseline_water_fraction", max_baseline_fraction=0.01
    )

    assert len(filtered) == 2
    assert n_ex == 1
    assert list(filtered["h3_hex"]) == ["c1", "c2"]


def test_classify_hazard_regime():
    from pipeline.hazard.flood.susceptibility import classify_hazard_regime

    occ = np.array([0.80, 0.50, 0.10, 0.05])
    sar = np.array([0.90, 0.30, 0.45, 0.10])

    regimes = classify_hazard_regime(occ, sar, channel_threshold=0.75, char_threshold=0.40)
    assert list(regimes) == ["channel", "char_belt", "char_belt", "floodplain"]


def test_anomalous_frequency_leaves_jrc_nodata_untouched():
    """JRC nodata (255) must not be read as 100 % water and zero the frequency."""
    freq = np.array([0.60, 0.60], dtype=np.float32)
    jrc_occ = np.array([255, 20], dtype=np.uint8)

    anom = calculate_anomalous_flood_frequency(freq, jrc_occ, mode="excess")

    assert anom[0] == pytest.approx(0.60)
    assert anom[1] == pytest.approx(0.40)


def test_classify_hazard_regime_uses_separate_sar_threshold():
    from pipeline.hazard.flood.susceptibility import classify_hazard_regime

    occ = np.array([0.10, 0.10])
    sar = np.array([0.45, 0.45])

    default = classify_hazard_regime(occ, sar)
    strict_sar = classify_hazard_regime(occ, sar, char_sar_threshold=0.50)

    assert list(default) == ["char_belt", "char_belt"]
    assert list(strict_sar) == ["floodplain", "floodplain"]


def _write(path, array, nodata):
    import rasterio
    from rasterio.transform import from_origin

    with rasterio.open(
        path, "w", driver="GTiff", height=array.shape[0], width=array.shape[1], count=1,
        dtype=array.dtype, crs="EPSG:32645", transform=from_origin(0, 20, 10, 10), nodata=nodata,
    ) as dst:
        dst.write(array, 1)


@pytest.mark.parametrize("variant", ["v0.1", "v0.2"])
def test_build_susceptibility_layers_wires_frequency_input_per_variant(tmp_path, monkeypatch, variant):
    """v0.2 must combine anomalous frequency with HAND; v0.1 keeps raw frequency."""
    import rasterio
    from pipeline.hazard.flood import run_district_flood as rdf
    from pipeline.hazard.flood.districts import get_district

    cfg = get_district("barpeta")
    monkeypatch.setattr(rdf, "_interim_dir", lambda _cfg: tmp_path)
    p = cfg.file_prefix
    freq = np.array([[0.8, 0.8], [0.2, 0.0]], dtype=np.float32)
    occ = np.array([[50, 0], [0, 0]], dtype=np.uint8)
    _write(tmp_path / f"{p}_inundation_frequency.tif", freq, np.nan)
    _write(tmp_path / f"{p}_valid_observation_count.tif", np.full((2, 2), 30, np.uint16), 0)
    _write(tmp_path / f"{p}_hand.tif", np.full((2, 2), 0.0, np.float32), np.nan)
    _write(tmp_path / f"{p}_hard_zero_mask.tif", np.zeros((2, 2), np.uint8), 255)
    _write(tmp_path / f"{p}_jrc_occurrence_pct.tif", occ, 255)

    summary = rdf.build_susceptibility_layers(cfg, variant)

    with rasterio.open(tmp_path / f"{p}_flood_susceptibility.tif") as src:
        susc = src.read(1)
    # HAND = 0 everywhere -> H_hand = 1, so S = 0.5 * F_input + 0.5
    expected_f = freq - occ / 100.0 if variant == "v0.2" else freq
    np.testing.assert_allclose(susc, 0.5 * np.clip(expected_f, 0, 1) + 0.5, atol=1e-6)
    assert summary["model_variant"] == variant
    assert (tmp_path / f"{p}_anomalous_frequency.tif").exists() == (variant == "v0.2")


def test_archive_previous_version_keeps_outgoing_model(tmp_path):
    from pipeline.hazard.flood.run_district_flood import _archive_previous_version

    current = tmp_path / "flood_susceptibility_h3_res8.parquet"
    pd.DataFrame({"model_version": ["flood-susceptibility-v0.1"]}).to_parquet(current)

    _archive_previous_version(current, "flood-susceptibility-v0.1")
    assert not (tmp_path / "flood_susceptibility_h3_res8_v0.1.parquet").exists()

    _archive_previous_version(current, "flood-susceptibility-v0.2")
    assert (tmp_path / "flood_susceptibility_h3_res8_v0.1.parquet").exists()
