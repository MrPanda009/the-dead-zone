"""Pure validation metrics calculation for flood susceptibility.

Provides robust, strictly evaluated metrics:
- ROC-AUC with single-class guards and sign-preservation for inverted scores.
- PR-AUC accompanied ALWAYS by baseline class prevalence.
- Classification metrics (precision, recall, F1) across decision thresholds.
- Continuous rank correlation (Spearman rho).
- Spatial block bootstrapping for confidence intervals.
- Stratified evaluation by confidence terciles and spatial regions.
"""

from __future__ import annotations

import math
from typing import Any, Callable, Sequence
import numpy as np
import pandas as pd
from scipy.stats import spearmanr
from sklearn.metrics import (
    average_precision_score,
    balanced_accuracy_score,
    f1_score,
    matthews_corrcoef,
    precision_score,
    recall_score,
    roc_auc_score,
)


def compute_roc_auc(
    y_true: np.ndarray | Sequence[int],
    y_score: np.ndarray | Sequence[float],
) -> float:
    """Compute Area Under the Receiver Operating Characteristic Curve (ROC-AUC).

    Guards:
    - If input contains fewer than 2 unique classes, returns NaN without raising.
    - Preserves true score ranking: inverted scores yield AUC < 0.5 (never flipped).

    Args:
        y_true: Binary ground truth labels (0 or 1).
        y_score: Continuous predicted susceptibility scores.

    Returns:
        ROC-AUC score in [0.0, 1.0], or math.nan if single class or degenerate.
    """
    y_t_raw = np.asarray(y_true, dtype=float)
    y_s_raw = np.asarray(y_score, dtype=float)

    if len(y_t_raw) != len(y_s_raw):
        raise ValueError(f"Length mismatch: len(y_true)={len(y_t_raw)} vs len(y_score)={len(y_s_raw)}")

    if len(y_t_raw) == 0:
        return math.nan

    # Drop NaNs if present
    valid_mask = ~(np.isnan(y_t_raw) | np.isnan(y_s_raw))
    if not np.any(valid_mask):
        return math.nan

    y_t = y_t_raw[valid_mask].astype(int)
    y_s = y_s_raw[valid_mask]

    unique_classes = np.unique(y_t)
    if len(unique_classes) < 2:
        return math.nan

    # roc_auc_score preserves the true order (inverted models score < 0.5)
    return float(roc_auc_score(y_t, y_s))


def compute_pr_auc_with_prevalence(
    y_true: np.ndarray | Sequence[int],
    y_score: np.ndarray | Sequence[float],
) -> dict[str, float]:
    """Compute Precision-Recall AUC (Average Precision) alongside class prevalence.

    PR-AUC without the baseline prevalence is uninterpretable because chance level
    for PR-AUC equals the positive class prevalence.

    Args:
        y_true: Binary ground truth labels (0 or 1).
        y_score: Continuous predicted susceptibility scores.

    Returns:
        Dict containing:
            - 'pr_auc': PR-AUC value or math.nan if degenerate.
            - 'prevalence': Positive class fraction sum(y_true) / len(y_true).
    """
    y_t_raw = np.asarray(y_true, dtype=float)
    y_s_raw = np.asarray(y_score, dtype=float)

    if len(y_t_raw) != len(y_s_raw):
        raise ValueError(f"Length mismatch: len(y_true)={len(y_t_raw)} vs len(y_score)={len(y_s_raw)}")

    if len(y_t_raw) == 0:
        return {"pr_auc": math.nan, "prevalence": math.nan}

    valid_mask = ~(np.isnan(y_t_raw) | np.isnan(y_s_raw))
    if not np.any(valid_mask):
        return {"pr_auc": math.nan, "prevalence": math.nan}

    y_t = y_t_raw[valid_mask].astype(int)
    y_s = y_s_raw[valid_mask]

    prevalence = float(np.mean(y_t))
    unique_classes = np.unique(y_t)

    if len(unique_classes) < 2:
        return {"pr_auc": math.nan, "prevalence": prevalence}

    pr_auc = float(average_precision_score(y_t, y_s))
    return {"pr_auc": pr_auc, "prevalence": prevalence}


def compute_spearman(
    y_continuous: np.ndarray | Sequence[float],
    y_score: np.ndarray | Sequence[float],
) -> dict[str, float]:
    """Compute continuous Spearman rank correlation between reference and model.

    Args:
        y_continuous: Continuous reference values (e.g. historical flood frequency).
        y_score: Continuous predicted scores (e.g. susceptibility).

    Returns:
        Dict containing:
            - 'rho': Spearman correlation coefficient (-1.0 to 1.0).
            - 'p_value': Two-sided p-value.
    """
    y_c = np.asarray(y_continuous, dtype=float)
    y_s = np.asarray(y_score, dtype=float)

    if len(y_c) != len(y_s):
        raise ValueError(f"Length mismatch: len(y_c)={len(y_c)} vs len(y_s)={len(y_s)}")

    valid_mask = ~(np.isnan(y_c) | np.isnan(y_s))
    if not np.any(valid_mask):
        return {"rho": math.nan, "p_value": math.nan}

    y_c = y_c[valid_mask]
    y_s = y_s[valid_mask]

    if len(y_c) < 3 or np.all(y_c == y_c[0]) or np.all(y_s == y_s[0]):
        return {"rho": math.nan, "p_value": math.nan}

    res = spearmanr(y_c, y_s)
    return {
        "rho": float(res.statistic if hasattr(res, "statistic") else res.correlation),
        "p_value": float(res.pvalue),
    }


def compute_threshold_classification(
    y_true: np.ndarray | Sequence[int],
    y_score: np.ndarray | Sequence[float],
    thresholds: Sequence[float] = (0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8),
) -> dict[str, dict[str, float | int]]:
    """Compute classification performance across candidate decision thresholds.

    Includes Balanced Accuracy, Matthews Correlation Coefficient (MCC), and
    a naive 'all_positive' reference baseline.

    Args:
        y_true: Binary ground truth labels (0 or 1).
        y_score: Continuous predicted susceptibility scores.
        thresholds: Sequence of classification threshold cutoffs in [0.0, 1.0].

    Returns:
        Dict mapping string threshold (e.g. '0.3') or 'all_positive' to performance metrics.
    """
    y_t = np.asarray(y_true, dtype=int)
    y_s = np.asarray(y_score, dtype=float)

    if len(y_t) != len(y_s):
        raise ValueError(f"Length mismatch: len(y_true)={len(y_t)} vs len(y_score)={len(y_s)}")

    results: dict[str, dict[str, float | int]] = {}
    n_total = len(y_t)

    # Naive baseline: All-positive predictor
    if n_total > 0:
        y_all_pos = np.ones(n_total, dtype=int)
        prec_all = float(precision_score(y_t, y_all_pos, zero_division=0.0))
        rec_all = float(recall_score(y_t, y_all_pos, zero_division=0.0))
        f1_all = float(f1_score(y_t, y_all_pos, zero_division=0.0))
        ba_all = float(balanced_accuracy_score(y_t, y_all_pos))
        mcc_all = float(matthews_corrcoef(y_t, y_all_pos)) if len(np.unique(y_t)) > 1 else 0.0

        results["all_positive"] = {
            "precision": prec_all,
            "recall": rec_all,
            "f1": f1_all,
            "balanced_accuracy": ba_all,
            "mcc": mcc_all,
            "n_flagged": n_total,
            "flagged_pct": 1.0,
        }

    for thresh in thresholds:
        key = f"{thresh:.1f}"
        if n_total == 0:
            results[key] = {
                "precision": 0.0,
                "recall": 0.0,
                "f1": 0.0,
                "balanced_accuracy": 0.0,
                "mcc": 0.0,
                "n_flagged": 0,
                "flagged_pct": 0.0,
            }
            continue

        y_pred = (y_s >= thresh).astype(int)
        n_flagged = int(np.sum(y_pred))
        prec = float(precision_score(y_t, y_pred, zero_division=0.0))
        rec = float(recall_score(y_t, y_pred, zero_division=0.0))
        f1 = float(f1_score(y_t, y_pred, zero_division=0.0))
        ba = float(balanced_accuracy_score(y_t, y_pred)) if len(np.unique(y_t)) > 1 else 0.0
        mcc = float(matthews_corrcoef(y_t, y_pred)) if len(np.unique(y_t)) > 1 and len(np.unique(y_pred)) > 1 else 0.0

        results[key] = {
            "precision": prec,
            "recall": rec,
            "f1": f1,
            "balanced_accuracy": ba,
            "mcc": mcc,
            "n_flagged": n_flagged,
            "flagged_pct": float(n_flagged / n_total),
        }

    return results


def compute_block_bootstrap_ci(
    df: pd.DataFrame,
    y_col: str,
    score_col: str,
    block_col: str,
    metric_name: str = "roc_auc",
    n_bootstraps: int = 500,
    ci: float = 0.95,
    random_seed: int = 42,
) -> dict[str, Any]:
    """Compute empirical confidence interval using spatial block bootstrapping.

    Resamples spatial blocks (e.g. H3 res-5 parents) with replacement to account
    for spatial autocorrelation across adjacent cells.

    Args:
        df: Input DataFrame containing evaluated cells.
        y_col: Binary target column name.
        score_col: Continuous score column name.
        block_col: Spatial block identifier column (e.g. 'parent_block').
        metric_name: 'roc_auc' or 'pr_auc' or 'spearman'.
        n_bootstraps: Number of bootstrap resamples (default 500).
        ci: Confidence interval coverage (default 0.95 for 95% CI).
        random_seed: Random seed for deterministic reproducibility.

    Returns:
        Dict with point_estimate, ci_low, ci_high, ci_level, n_bootstraps, n_blocks.
    """
    if df.empty:
        return {
            "point_estimate": math.nan,
            "ci_low": math.nan,
            "ci_high": math.nan,
            "ci_level": ci,
            "n_bootstraps": 0,
            "n_blocks": 0,
        }

    # Metric dispatcher
    def _eval_metric(y: np.ndarray, s: np.ndarray) -> float:
        if metric_name == "roc_auc":
            return compute_roc_auc(y, s)
        elif metric_name == "pr_auc":
            return compute_pr_auc_with_prevalence(y, s)["pr_auc"]
        elif metric_name == "spearman":
            return compute_spearman(y, s)["rho"]
        else:
            raise ValueError(f"Unsupported metric_name '{metric_name}'")

    y_arr = df[y_col].to_numpy()
    score_arr = df[score_col].to_numpy()
    point_est = _eval_metric(y_arr, score_arr)

    # Group row indices by block
    unique_blocks = df[block_col].unique()
    n_blocks = len(unique_blocks)

    if n_blocks < 2:
        return {
            "point_estimate": point_est,
            "ci_low": point_est,
            "ci_high": point_est,
            "ci_level": ci,
            "n_bootstraps": 0,
            "n_blocks": n_blocks,
        }

    block_to_indices = df.groupby(block_col).indices

    rng = np.random.default_rng(random_seed)
    boot_estimates: list[float] = []

    for _ in range(n_bootstraps):
        sampled_blocks = rng.choice(unique_blocks, size=n_blocks, replace=True)
        # Concatenate indices of sampled blocks
        boot_idx = np.concatenate([block_to_indices[b] for b in sampled_blocks])
        val = _eval_metric(y_arr[boot_idx], score_arr[boot_idx])
        if not math.isnan(val):
            boot_estimates.append(val)

    if len(boot_estimates) < 10:
        return {
            "point_estimate": point_est,
            "ci_low": math.nan,
            "ci_high": math.nan,
            "ci_level": ci,
            "n_bootstraps": len(boot_estimates),
            "n_blocks": n_blocks,
        }

    alpha = 1.0 - ci
    ci_low = float(np.percentile(boot_estimates, 100 * (alpha / 2.0)))
    ci_high = float(np.percentile(boot_estimates, 100 * (1.0 - alpha / 2.0)))

    return {
        "point_estimate": point_est,
        "ci_low": ci_low,
        "ci_high": ci_high,
        "ci_level": ci,
        "n_bootstraps": len(boot_estimates),
        "n_blocks": n_blocks,
    }


def compute_tercile_breakdown(
    df: pd.DataFrame,
    score_col: str,
    y_col: str,
    stratify_col: str = "confidence",
    n_terciles: int = 3,
) -> list[dict[str, Any]]:
    """Compute performance breakdown stratified by a variable (e.g. confidence terciles).

    Reports AUC, PR-AUC, and crucially PREVALENCE for each tercile.

    Args:
        df: Input DataFrame.
        score_col: Model susceptibility column.
        y_col: Binary target column.
        stratify_col: Column to partition into terciles (default 'confidence').
        n_terciles: Number of quantile bins (default 3).

    Returns:
        List of dicts, each describing a tercile partition.
    """
    if df.empty or stratify_col not in df.columns:
        return []

    sub_df = df.copy()
    strat_vals = sub_df[stratify_col].to_numpy(dtype=float)

    # Use rank(method="first") to prevent tied values (e.g. 14/30 = 0.467) from collapsing bins
    sub_df["tercile_bin"] = pd.qcut(
        sub_df[stratify_col].rank(method="first"),
        q=n_terciles,
        labels=[f"Tercile {i+1}" for i in range(n_terciles)],
    )

    results: list[dict[str, Any]] = []

    for bin_label, group in sub_df.groupby("tercile_bin", observed=True):
        y_grp = group[y_col].to_numpy()
        s_grp = group[score_col].to_numpy()
        strat_grp = group[stratify_col].to_numpy(dtype=float)

        val_min = float(np.min(strat_grp))
        val_max = float(np.max(strat_grp))
        mean_strat = float(np.mean(strat_grp))

        prauc_res = compute_pr_auc_with_prevalence(y_grp, s_grp)
        auc_val = compute_roc_auc(y_grp, s_grp)

        results.append({
            "tier": str(bin_label),
            "range": [val_min, val_max],
            "cell_count": len(group),
            "mean_stratify_value": mean_strat,
            "prevalence": prauc_res["prevalence"],
            "roc_auc": None if math.isnan(auc_val) else auc_val,
            "pr_auc": None if math.isnan(prauc_res["pr_auc"]) else prauc_res["pr_auc"],
        })

    return results


def compute_region_breakdown(
    df: pd.DataFrame,
    score_col: str,
    y_col: str,
    region_col: str = "region_block",
) -> list[dict[str, Any]]:
    """Compute performance breakdown across spatial regions (e.g. North vs South).

    Args:
        df: Input DataFrame.
        score_col: Model susceptibility column.
        y_col: Binary target column.
        region_col: Regional identifier column.

    Returns:
        List of dicts with region-specific metrics.
    """
    if df.empty or region_col not in df.columns:
        return []

    results: list[dict[str, Any]] = []

    for region_name, group in df.groupby(region_col, observed=True):
        y_grp = group[y_col].to_numpy()
        s_grp = group[score_col].to_numpy()

        prauc_res = compute_pr_auc_with_prevalence(y_grp, s_grp)
        auc_val = compute_roc_auc(y_grp, s_grp)

        results.append({
            "region": str(region_name),
            "cell_count": len(group),
            "prevalence": prauc_res["prevalence"],
            "roc_auc": None if math.isnan(auc_val) else auc_val,
            "pr_auc": None if math.isnan(prauc_res["pr_auc"]) else prauc_res["pr_auc"],
        })

    return results


LOW_NEGATIVE_COUNT = 100


def compute_imbalance_summary(
    y_true: np.ndarray | Sequence[int],
    block_ids: np.ndarray | Sequence[Any] | None = None,
    low_negative_count: int = LOW_NEGATIVE_COUNT,
) -> dict[str, Any]:
    """Summarise class balance so readers can judge how fragile a ROC-AUC is.

    With very few negatives, ROC-AUC rests on a handful of cells; the flag makes that
    explicit instead of leaving it to be inferred from the prevalence.
    """
    y = np.asarray(y_true, dtype=int)
    n_pos = int(y.sum())
    n_neg = int(len(y) - n_pos)
    return {
        "n_cells": int(len(y)),
        "n_pos": n_pos,
        "n_neg": n_neg,
        "prevalence": float(n_pos / len(y)) if len(y) else math.nan,
        "n_blocks": int(len(np.unique(block_ids))) if block_ids is not None else None,
        "low_negative_count_warning": n_neg < low_negative_count,
    }


def compute_paired_block_bootstrap(
    df: pd.DataFrame,
    y_col: str,
    ref_col: str,
    score_cols: dict[str, str],
    block_col: str,
    reference_key: str = "model",
    n_bootstraps: int = 500,
    ci: float = 0.95,
    random_seed: int = 42,
) -> dict[str, Any]:
    """Block-bootstrap CIs for ROC-AUC and Spearman of several predictors at once.

    Every predictor is scored on the same resampled blocks, so the CI of the
    difference (reference minus each other predictor) is a paired interval — the
    honest way to ask whether the model beats a baseline given spatial autocorrelation.

    Args:
        df: Evaluated cells.
        y_col: Binary target column.
        ref_col: Continuous reference column for Spearman (e.g. NDEM flood frequency).
        score_cols: Mapping predictor name -> score column.
        block_col: Spatial block column (H3 parent).
        reference_key: Predictor that differences are taken against.
        n_bootstraps: Resample count.
        ci: Interval coverage.
        random_seed: RNG seed.

    Returns:
        {"auc": {name: [lo, hi]}, "spearman": {name: [lo, hi]},
         "auc_diff": {name: [lo, hi]} (reference AUC minus predictor AUC), "n_blocks": int, ...}
    """
    names = [n for n, c in score_cols.items() if c in df.columns and not df[c].isna().all()]
    y = df[y_col].to_numpy()
    ref = df[ref_col].to_numpy(dtype=float)
    scores = {n: df[score_cols[n]].to_numpy(dtype=float) for n in names}
    block_to_idx = df.groupby(block_col).indices
    blocks = np.array(list(block_to_idx.keys()), dtype=object)

    auc_boot: dict[str, list[float]] = {n: [] for n in names}
    sp_boot: dict[str, list[float]] = {n: [] for n in names}
    diff_boot: dict[str, list[float]] = {n: [] for n in names if n != reference_key}

    rng = np.random.default_rng(random_seed)
    if len(blocks) >= 2:
        for _ in range(n_bootstraps):
            idx = np.concatenate([block_to_idx[b] for b in rng.choice(blocks, size=len(blocks), replace=True)])
            y_b = y[idx]
            aucs = {n: compute_roc_auc(y_b, scores[n][idx]) for n in names}
            for n in names:
                if not math.isnan(aucs[n]):
                    auc_boot[n].append(aucs[n])
                rho = compute_spearman(ref[idx], scores[n][idx])["rho"]
                if not math.isnan(rho):
                    sp_boot[n].append(rho)
            if reference_key in aucs and not math.isnan(aucs[reference_key]):
                for n in diff_boot:
                    if not math.isnan(aucs[n]):
                        diff_boot[n].append(aucs[reference_key] - aucs[n])

    alpha = 1.0 - ci

    def _interval(vals: list[float]) -> list[float] | None:
        if len(vals) < 10:
            return None
        return [float(np.percentile(vals, 100 * alpha / 2.0)), float(np.percentile(vals, 100 * (1.0 - alpha / 2.0)))]

    return {
        "auc": {n: _interval(v) for n, v in auc_boot.items()},
        "spearman": {n: _interval(v) for n, v in sp_boot.items()},
        "auc_diff": {n: _interval(v) for n, v in diff_boot.items()},
        "auc_diff_reference": reference_key,
        "n_blocks": int(len(blocks)),
        "n_bootstraps": n_bootstraps if len(blocks) >= 2 else 0,
        "ci_level": ci,
    }
