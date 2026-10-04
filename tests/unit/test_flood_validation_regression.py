"""Regression test gate for flood susceptibility validation metrics.

Enforces Phase 5 (§8) quality control:
Compares freshly generated or processed flood validation metrics against the
committed baselines (`baseline_barpeta_v0.1.json` and `baseline_barpeta_v0.2.json`).
Both versions are scored by the same validation code (v0.1 from the archived
``flood_susceptibility_h3_res8_v0.1.parquet`` into ``barpeta_v0.1/``), so the pair is a
like-for-like comparison. The fixtures pin current behaviour against drift; they are not
evidence of correctness on their own.
"""

from __future__ import annotations

import json
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
FIXTURES_DIR = REPO_ROOT / "tests" / "fixtures" / "flood_validation"
PROCESSED_DIR = REPO_ROOT / "data" / "processed" / "flood_validation"

TOLERANCE_AUC = 0.015
TOLERANCE_PREVALENCE = 0.005
TOLERANCE_PERCENTILE = 0.5


VERSION_CONFIGS = [
    (
        "v0.1",
        FIXTURES_DIR / "baseline_barpeta_v0.1.json",
        PROCESSED_DIR / "barpeta_v0.1" / "metrics.json",
    ),
    (
        "v0.2",
        FIXTURES_DIR / "baseline_barpeta_v0.2.json",
        PROCESSED_DIR / "barpeta" / "metrics.json",
    ),
]


@pytest.fixture(params=VERSION_CONFIGS, ids=["v0.1", "v0.2_active"])
def version_pair(request):
    version_tag, baseline_path, current_path = request.param
    assert baseline_path.exists(), f"Baseline fixture missing at {baseline_path}"
    if not current_path.exists():
        pytest.skip(f"Current metrics file not found at {current_path}")
    b_data = json.loads(baseline_path.read_text(encoding="utf-8"))
    c_data = json.loads(current_path.read_text(encoding="utf-8"))
    return version_tag, b_data, c_data


def test_barpeta_regression_cell_counts_invariance(version_pair):
    """Evaluated H3 cell count and exclusions must match exactly."""
    _, b_data, c_data = version_pair
    b_spatial = b_data["spatial"]
    c_spatial = c_data["spatial"]

    assert c_spatial["n_cells"] == b_spatial["n_cells"]
    assert c_spatial["n_excluded_non_full"] == b_spatial["n_excluded_non_full"]
    assert c_spatial["n_excluded_permanent_water"] == b_spatial["n_excluded_permanent_water"]
    assert c_spatial["imbalance"]["n_neg"] == b_spatial["imbalance"]["n_neg"]
    assert c_spatial["evaluation_domain"] == b_spatial["evaluation_domain"]


def test_barpeta_regression_prevalence_invariance(version_pair):
    """Historical ever-flooded prevalence must stay within tolerance."""
    _, b_data, c_data = version_pair
    b_prev = b_data["spatial"]["prevalence"]
    c_prev = c_data["spatial"]["prevalence"]
    assert abs(c_prev - b_prev) < TOLERANCE_PREVALENCE


def test_barpeta_regression_auc_metrics_invariance(version_pair):
    """ROC-AUC and PR-AUC for model and baselines must remain stable."""
    _, b_data, c_data = version_pair
    b_auc = b_data["spatial"]["auc"]
    c_auc = c_data["spatial"]["auc"]

    assert abs(c_auc["model"] - b_auc["model"]) < TOLERANCE_AUC
    assert abs(c_auc["hand_only"] - b_auc["hand_only"]) < TOLERANCE_AUC
    assert abs(c_auc["frequency_only"] - b_auc["frequency_only"]) < TOLERANCE_AUC

    b_sp = b_data["spatial"]["spearman_frequency"]["model"]
    c_sp = c_data["spatial"]["spearman_frequency"]["model"]
    assert abs(c_sp - b_sp) < TOLERANCE_AUC

    b_years = {r["year"]: r["auc"]["model"] for r in b_data["spatial"]["per_year"]}
    c_years = {r["year"]: r["auc"]["model"] for r in c_data["spatial"]["per_year"]}
    assert c_years.keys() == b_years.keys()
    for yr, b_val in b_years.items():
        if b_val is not None:
            assert abs(c_years[yr] - b_val) < TOLERANCE_AUC, f"per-year AUC drifted for {yr}"

    # Year matched 2020 AUC
    b_ym = b_data["spatial"].get("year_matched", {}).get("auc")
    c_ym = c_data["spatial"].get("year_matched", {}).get("auc")
    if b_ym is not None and c_ym is not None:
        assert abs(c_ym - b_ym) < TOLERANCE_AUC


def test_barpeta_regression_gauge_checks_invariance(version_pair):
    """INDOFLOODS station count and temporal Mann-Whitney U statistic must remain stable."""
    _, b_data, c_data = version_pair
    b_gauges = b_data.get("gauges", {})
    c_gauges = c_data.get("gauges", {})

    assert c_gauges.get("n_stations") == b_gauges.get("n_stations")
    assert c_gauges.get("status") == b_gauges.get("status")

    b_temp = b_gauges.get("temporal_check")
    c_temp = c_gauges.get("temporal_check")
    if b_temp and c_temp:
        assert c_temp.get("n_in_event_scenes") == b_temp.get("n_in_event_scenes")
        assert c_temp.get("n_out_of_event_scenes") == b_temp.get("n_out_of_event_scenes")
        assert abs(c_temp["mann_whitney_u"] - b_temp["mann_whitney_u"]) < 1e-3


def test_barpeta_regression_losses_context_invariance(version_pair):
    """CWC/MHA loss percentile and climate flag must remain consistent."""
    _, b_data, c_data = version_pair
    b_losses = b_data.get("losses_context", {})
    c_losses = c_data.get("losses_context", {})

    assert c_losses.get("stack_year") == b_losses.get("stack_year")
    assert c_losses.get("series_n") == b_losses.get("series_n")
    assert c_losses.get("flag") == b_losses.get("flag")
    assert abs(c_losses["percentile"] - b_losses["percentile"]) < TOLERANCE_PERCENTILE


def test_barpeta_v02_regime_and_river_baselines(version_pair):
    """v0.2 active metrics must include by_regime disaggregation and multi-axis river baselines."""
    version_tag, _, c_data = version_pair
    if version_tag != "v0.2":
        pytest.skip("Regime and river baselines test only applies to v0.2")

    spatial = c_data["spatial"]
    assert "by_regime" in spatial
    regimes = {r["regime"] for r in spatial["by_regime"]}
    assert "floodplain" in regimes
    assert "char_belt" in regimes
    assert "channel" in regimes

    assert next(r for r in spatial["by_regime"] if r["regime"] == "floodplain")["in_headline"] is True
    assert spatial["ci95"]["auc_model_minus"].get("hand_only") is not None

    auc = spatial["auc"]
    assert auc.get("anomalous_frequency_only") is not None
    assert auc.get("dist_tributary") is not None
    assert auc.get("dist_mainstem") is not None
    assert auc.get("dist_any_river") is not None


def test_v02_is_a_different_model_from_v01():
    """Guard against relabelling: v0.2 must not reproduce v0.1 susceptibility."""
    v01 = json.loads((FIXTURES_DIR / "baseline_barpeta_v0.1.json").read_text(encoding="utf-8"))
    v02 = json.loads((FIXTURES_DIR / "baseline_barpeta_v0.2.json").read_text(encoding="utf-8"))
    assert v01["model_version"].endswith("v0.1") and v02["model_version"].endswith("v0.2")
    assert abs(v02["spatial"]["auc"]["model"] - v01["spatial"]["auc"]["model"]) > 0.01
