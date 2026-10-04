"""Regime-specific susceptibility (Phase 2b): floodplain, char belt and channel exclusion."""

import numpy as np
import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.services.regime_context import regime_context_for
from core.enums import HazardRegime
from pipeline.hazard.flood.h3_zonal import (
    CHANNEL_EXCLUDED_FLAG,
    apply_quality_flags,
    h3_cells_to_geodataframe,
)
from pipeline.hazard.flood.susceptibility import (
    normalize_inverse_distance,
    sar_instability_from_frequency,
)

CELLS = ["883ce00201fffff", "883ce00203fffff", "883ce00205fffff", "883ce00207fffff"]


def _frame(**overrides):
    gdf = h3_cells_to_geodataframe(CELLS)
    gdf["mean_flood_susceptibility"] = [0.5, 0.5, 0.5, 0.5]
    gdf["mean_confidence"] = [0.9, 0.9, 0.9, 0.9]
    gdf["valid_pixel_fraction"] = [1.0, 1.0, 1.0, 1.0]
    gdf["mean_inundation_frequency"] = [0.10, 0.50, 0.10, 0.90]
    gdf["jrc_occurrence_mean"] = [0.0, 0.45, 0.0, 0.90]
    gdf["mean_anomalous_frequency"] = [0.10, 0.05, 0.10, 0.0]
    gdf["mean_hand_normalized"] = [0.8, 0.8, 0.2, 0.9]
    gdf["hard_zero_fraction"] = [0.0, 0.0, 0.0, 0.0]
    for key, value in overrides.items():
        gdf[key] = value
    return gdf


def test_inverse_distance_is_one_at_bank_zero_at_scale_and_keeps_nan():
    out = normalize_inverse_distance(np.array([0.0, 2500.0, 5000.0, 9000.0, np.nan]), 5000.0)
    assert out[:4].tolist() == [1.0, 0.5, 0.0, 0.0]
    assert np.isnan(out[4])


def test_sar_instability_peaks_at_half_and_vanishes_at_extremes():
    out = sar_instability_from_frequency(np.array([0.0, 0.5, 1.0, np.nan]))
    assert out[0] == 0.0 and out[1] == 1.0 and out[2] == 0.0
    assert np.isnan(out[3])


def test_regimes_use_their_own_formula_and_channel_is_excluded():
    out = apply_quality_flags(_frame())
    assert list(out["hazard_regime"]) == ["floodplain", "char_belt", "floodplain", "channel"]

    # floodplain without distances: (0.35*H + 0.35*A) renormalised over the two available terms
    assert out.loc[0, "susceptibility"] == pytest.approx((0.35 * 0.8 + 0.35 * 0.10) / 0.70, abs=1e-4)
    assert out.loc[0, "susceptibility_basis"] == "floodplain_hand_anomalous"
    # near-drained terrain (high HAND-normalised value) outranks low terrain at equal frequency
    assert out.loc[0, "susceptibility"] > out.loc[2, "susceptibility"]

    # char belt: 4F(1-F)=1.0 at F=0.5 and JRC occurrence 0.45, renormalised over two terms
    assert out.loc[1, "susceptibility"] == pytest.approx((0.4 * 1.0 + 0.3 * 0.45) / 0.70, abs=1e-4)
    assert out.loc[1, "susceptibility_basis"] == "char_erosion_instability_baseline"

    assert out.loc[3, "quality_flag"] == CHANNEL_EXCLUDED_FLAG
    assert out.loc[3, "susceptibility"] == 0.0
    assert out.loc[3, "confidence"] == 0.0


def test_tributary_distance_raises_floodplain_score_near_a_river():
    near = apply_quality_flags(_frame(dist_tributary_m=[200.0, 0.0, 200.0, 0.0]))
    far = apply_quality_flags(_frame(dist_tributary_m=[8000.0, 0.0, 8000.0, 0.0]))
    assert near.loc[0, "susceptibility"] > far.loc[0, "susceptibility"]
    assert near.loc[0, "susceptibility_basis"] == "floodplain_hand_anomalous_tributary"


def test_hard_zero_share_scales_floodplain_score_down():
    full = apply_quality_flags(_frame())
    half = apply_quality_flags(_frame(hard_zero_fraction=[0.5, 0.0, 0.0, 0.0]))
    assert half.loc[0, "susceptibility"] == pytest.approx(full.loc[0, "susceptibility"] * 0.5, abs=1e-4)


def test_no_coverage_cell_is_never_rescored_or_flagged_as_channel():
    out = apply_quality_flags(_frame(valid_pixel_fraction=[1.0, 1.0, 1.0, 0.0]))
    assert out.loc[3, "quality_flag"] == "no_coverage"
    assert out.loc[3, "susceptibility_basis"] == "raster_v0.2"


def test_missing_regime_inputs_keep_the_raster_score():
    gdf = _frame().drop(columns=["mean_hand_normalized"])
    out = apply_quality_flags(gdf)
    assert out.loc[0, "susceptibility"] == pytest.approx(0.5)
    assert out.loc[0, "susceptibility_basis"] == "raster_v0.2"


def test_regime_context_differs_per_regime_and_ignores_unknown():
    char = regime_context_for("char_belt")
    plain = regime_context_for("floodplain")
    assert "erosion" in char.description.lower() and "erosion" not in plain.description.lower()
    assert char.key_drivers[0] == "sar_instability" and plain.key_drivers[0] == "mean_hand_m"
    assert regime_context_for("channel").regime == HazardRegime.CHANNEL
    assert regime_context_for(None) is None and regime_context_for("lava") is None


def test_unknown_regime_query_is_rejected_with_422():
    response = TestClient(app).get("/hazard/cells?regime=lava")
    assert response.status_code == 422


def test_dossier_sar_instability_mirrors_the_pipeline_proxy():
    from api.services.hazard_service import HazardService

    assert HazardService._sar_instability(0.5) == 1.0
    assert HazardService._sar_instability(0.0) == 0.0 and HazardService._sar_instability(1.0) == 0.0
    assert HazardService._sar_instability(None) is None
    pipeline = sar_instability_from_frequency(np.array([0.2, 0.9], dtype=np.float32))
    assert [HazardService._sar_instability(0.2), HazardService._sar_instability(0.9)] == pytest.approx(
        pipeline.tolist(), abs=1e-4
    )


def test_every_regime_key_driver_has_a_dto_field():
    from core.schemas.hazard import FloodDriverDTO

    for regime in HazardRegime:
        for key in regime_context_for(regime.value).key_drivers:
            assert key in FloodDriverDTO.model_fields, f"{regime}: {key}"
