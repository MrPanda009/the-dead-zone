"""Unit tests for pure flood validation metrics.

Tests mathematical correctness, edge cases (single-class, inverted scores, NaNs),
and guarantees that PR-AUC is always accompanied by class prevalence.
"""

from __future__ import annotations

import math
import numpy as np
import pandas as pd
import pytest

from pipeline.hazard.flood.validation.metrics import (
    compute_roc_auc,
    compute_pr_auc_with_prevalence,
    compute_spearman,
    compute_threshold_classification,
    compute_block_bootstrap_ci,
    compute_tercile_breakdown,
    compute_region_breakdown,
)


def test_roc_auc_perfect_model():
    """A perfect predictor must return exactly 1.0."""
    y_true = np.array([0, 0, 0, 1, 1, 1])
    y_score = np.array([0.1, 0.2, 0.3, 0.7, 0.8, 0.9])
    assert compute_roc_auc(y_true, y_score) == pytest.approx(1.0)


def test_roc_auc_inverted_model_guards_against_sign_flip():
    """An inverted score must return AUC < 0.5 (e.g. 0.0), NEVER silently flipped to >0.5."""
    y_true = np.array([0, 0, 0, 1, 1, 1])
    # Scores are exactly opposite of ground truth
    y_score = np.array([0.9, 0.8, 0.7, 0.3, 0.2, 0.1])
    auc = compute_roc_auc(y_true, y_score)
    assert auc == pytest.approx(0.0)
    assert auc < 0.5


def test_roc_auc_random_scores_near_half():
    """Random predictions on balanced classes must yield AUC near 0.5."""
    rng = np.random.default_rng(12345)
    y_true = np.concatenate([np.zeros(500, dtype=int), np.ones(500, dtype=int)])
    y_score = rng.uniform(0.0, 1.0, size=1000)
    auc = compute_roc_auc(y_true, y_score)
    assert 0.44 <= auc <= 0.56


def test_roc_auc_single_class_returns_nan_without_crashing():
    """Inputs with only one class (all 0s or all 1s) must return NaN safely."""
    # All zeros
    assert math.isnan(compute_roc_auc(np.array([0, 0, 0, 0]), np.array([0.1, 0.2, 0.3, 0.4])))
    # All ones
    assert math.isnan(compute_roc_auc(np.array([1, 1, 1, 1]), np.array([0.1, 0.2, 0.3, 0.4])))
    # Empty
    assert math.isnan(compute_roc_auc(np.array([]), np.array([])))


def test_roc_auc_handles_nan_values_in_scores():
    """NaNs in scores or labels must be cleanly dropped."""
    y_true = np.array([0, 0, 1, 1, np.nan])
    y_score = np.array([0.1, 0.2, 0.8, 0.9, 0.5])
    assert compute_roc_auc(y_true, y_score) == pytest.approx(1.0)


def test_pr_auc_always_reports_prevalence():
    """PR-AUC calculation must always return the true baseline prevalence."""
    y_true = np.array([0, 0, 0, 0, 1])  # 20% prevalence
    y_score = np.array([0.1, 0.2, 0.3, 0.4, 0.9])  # perfect ranking
    res = compute_pr_auc_with_prevalence(y_true, y_score)
    assert res["prevalence"] == pytest.approx(0.20)
    assert res["pr_auc"] == pytest.approx(1.0)

    # Low prevalence random test
    y_true_rare = np.array([0] * 90 + [1] * 10)  # 10% prevalence
    res_rare = compute_pr_auc_with_prevalence(y_true_rare, np.linspace(0.1, 0.9, 100))
    assert res_rare["prevalence"] == pytest.approx(0.10)


def test_pr_auc_single_class_returns_nan_and_prevalence():
    """Single class returns NaN for pr_auc but valid prevalence."""
    res_zeros = compute_pr_auc_with_prevalence(np.array([0, 0, 0]), np.array([0.1, 0.2, 0.3]))
    assert math.isnan(res_zeros["pr_auc"])
    assert res_zeros["prevalence"] == pytest.approx(0.0)

    res_ones = compute_pr_auc_with_prevalence(np.array([1, 1, 1]), np.array([0.1, 0.2, 0.3]))
    assert math.isnan(res_ones["pr_auc"])
    assert res_ones["prevalence"] == pytest.approx(1.0)


def test_spearman_continuous_correlation():
    """Spearman correlation behaves predictably for monotonic and inverted series."""
    y_ref = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
    y_score_pos = np.array([10.0, 20.0, 30.0, 40.0, 50.0])
    res_pos = compute_spearman(y_ref, y_score_pos)
    assert res_pos["rho"] == pytest.approx(1.0)
    assert res_pos["p_value"] < 0.01

    y_score_neg = np.array([50.0, 40.0, 30.0, 20.0, 10.0])
    res_neg = compute_spearman(y_ref, y_score_neg)
    assert res_neg["rho"] == pytest.approx(-1.0)

    # Constant array returns NaN
    res_const = compute_spearman(np.array([1.0, 1.0, 1.0]), np.array([0.1, 0.2, 0.3]))
    assert math.isnan(res_const["rho"])


def test_threshold_classification_metrics():
    """Precision, recall, and F1 calculations match exact expected manual values."""
    y_true = np.array([1, 1, 0, 0])
    y_score = np.array([0.8, 0.4, 0.6, 0.1])
    # At threshold 0.5:
    # y_pred = [1, 0, 1, 0]
    # TP=1, FP=1, FN=1, TN=1
    # Precision = 1/2 = 0.5, Recall = 1/2 = 0.5, F1 = 0.5
    res = compute_threshold_classification(y_true, y_score, thresholds=[0.5])
    assert "0.5" in res
    assert res["0.5"]["precision"] == pytest.approx(0.5)
    assert res["0.5"]["recall"] == pytest.approx(0.5)
    assert res["0.5"]["f1"] == pytest.approx(0.5)
    assert res["0.5"]["balanced_accuracy"] == pytest.approx(0.5)
    assert res["0.5"]["mcc"] == pytest.approx(0.0)
    assert res["0.5"]["n_flagged"] == 2
    assert res["0.5"]["flagged_pct"] == pytest.approx(0.5)
    assert "all_positive" in res
    assert res["all_positive"]["recall"] == pytest.approx(1.0)
    assert res["all_positive"]["precision"] == pytest.approx(0.5)
    assert res["all_positive"]["balanced_accuracy"] == pytest.approx(0.5)
    assert res["all_positive"]["mcc"] == pytest.approx(0.0)


def test_block_bootstrap_ci_contains_point_estimate():
    """Spatial block bootstrap CI must bracket the empirical point estimate."""
    rng = np.random.default_rng(42)
    # Generate 10 spatial blocks, each with 20 cells
    blocks = [f"block_{i}" for i in range(10) for _ in range(20)]
    y_true = rng.choice([0, 1], size=200, p=[0.4, 0.6])
    # Score has genuine predictive signal
    y_score = y_true * 0.4 + rng.uniform(0.1, 0.5, size=200)

    df = pd.DataFrame({
        "y": y_true,
        "score": y_score,
        "block": blocks,
    })

    ci_res = compute_block_bootstrap_ci(
        df=df,
        y_col="y",
        score_col="score",
        block_col="block",
        metric_name="roc_auc",
        n_bootstraps=100,
        ci=0.95,
        random_seed=42,
    )

    pt = ci_res["point_estimate"]
    low = ci_res["ci_low"]
    high = ci_res["ci_high"]

    assert low <= pt <= high
    assert ci_res["n_blocks"] == 10
    assert ci_res["ci_level"] == 0.95


def test_tercile_breakdown_reports_prevalence_per_stratum():
    """Tercile breakdown must report positive prevalence for each stratum."""
    df = pd.DataFrame({
        "confidence": np.linspace(0.1, 0.9, 90),
        "susceptibility": np.linspace(0.2, 0.8, 90),
        "target": [0] * 30 + [1] * 30 + [1] * 30,  # 0%, 100%, 100% in thirds
    })
    terciles = compute_tercile_breakdown(
        df, score_col="susceptibility", y_col="target", stratify_col="confidence", n_terciles=3
    )
    assert len(terciles) == 3
    assert terciles[0]["cell_count"] == 30
    assert terciles[0]["prevalence"] == pytest.approx(0.0)
    assert terciles[1]["prevalence"] == pytest.approx(1.0)
    assert terciles[2]["prevalence"] == pytest.approx(1.0)


def test_region_breakdown():
    """Regional breakdown calculates metrics per spatial subdivision."""
    df = pd.DataFrame({
        "region": ["north"] * 40 + ["south"] * 40,
        "score": np.linspace(0.1, 0.9, 80),
        "target": [0, 1] * 40,
    })
    res = compute_region_breakdown(df, score_col="score", y_col="target", region_col="region")
    assert len(res) == 2
    regions = {r["region"] for r in res}
    assert regions == {"north", "south"}
    for r in res:
        assert r["cell_count"] == 40
        assert r["prevalence"] == pytest.approx(0.5)


def _blocked_frame(n_blocks: int = 12, per_block: int = 20, seed: int = 0) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    n = n_blocks * per_block
    ref = rng.random(n)
    good = ref + rng.normal(0, 0.2, n)
    return pd.DataFrame({
        "block": np.repeat(np.arange(n_blocks), per_block),
        "ref": ref,
        "y": (ref > 0.5).astype(int),
        "good": good,
        "good_copy": good,
        "noise": rng.random(n),
    })


def test_imbalance_summary_flags_low_negative_count():
    from pipeline.hazard.flood.validation.metrics import compute_imbalance_summary

    y = np.array([1] * 950 + [0] * 50)
    out = compute_imbalance_summary(y, block_ids=np.repeat(np.arange(10), 100))

    assert out["n_pos"] == 950 and out["n_neg"] == 50
    assert out["prevalence"] == pytest.approx(0.95)
    assert out["n_blocks"] == 10
    assert out["low_negative_count_warning"] is True
    assert compute_imbalance_summary(np.array([1] * 100 + [0] * 100))["low_negative_count_warning"] is False


def test_paired_bootstrap_difference_spans_zero_for_identical_predictor():
    from pipeline.hazard.flood.validation.metrics import compute_paired_block_bootstrap

    df = _blocked_frame()
    out = compute_paired_block_bootstrap(
        df, "y", "ref", {"model": "good", "copy": "good_copy", "noise": "noise"}, "block",
        n_bootstraps=200, random_seed=1,
    )

    lo, hi = out["auc_diff"]["copy"]
    assert lo == pytest.approx(0.0) and hi == pytest.approx(0.0)
    assert out["auc_diff"]["noise"][0] > 0.0, "a strong model must beat noise in every resample"
    assert out["auc"]["model"][0] <= compute_roc_auc(df["y"], df["good"]) <= out["auc"]["model"][1]
    assert out["spearman"]["model"][0] > 0.5
    assert out["n_blocks"] == 12 and out["auc_diff_reference"] == "model"


def test_paired_bootstrap_without_enough_blocks_returns_no_interval():
    from pipeline.hazard.flood.validation.metrics import compute_paired_block_bootstrap

    df = _blocked_frame(n_blocks=1)
    out = compute_paired_block_bootstrap(df, "y", "ref", {"model": "good"}, "block", n_bootstraps=50)

    assert out["auc"]["model"] is None
    assert out["n_bootstraps"] == 0
