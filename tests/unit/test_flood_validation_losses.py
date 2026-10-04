"""Unit tests for Phase 4: CWC / MHA flood disaster loss context and percentiles."""

from __future__ import annotations

import json
from pathlib import Path
import pytest

from pipeline.hazard.flood.validation.config import ValidationConfig
from pipeline.hazard.flood.validation.reference_losses import (
    load_cwc_losses,
    load_mha_losses,
    calculate_series_percentile,
    evaluate_district_loss_context,
)
from pipeline.hazard.flood.validation.checks_losses import run_losses_validation


def test_load_cwc_losses_loads_valid_records():
    """CWC losses loader returns records with required state, year, and damage fields."""
    records = load_cwc_losses()
    assert len(records) >= 15
    states = {r["state_name"] for r in records}
    assert "Assam" in states
    assert "Rajasthan" in states
    assert "Madhya Pradesh" in states
    assert "Kerala" in states

    sample = next(r for r in records if r["state_name"] == "Assam" and r["calendar_year"] == 2020)
    assert sample["total_damage_crores"] > 0
    assert sample["human_lives_lost"] > 0


def test_load_mha_losses_loads_valid_records():
    """MHA losses loader returns records with required state, fiscal year, and loss fields."""
    records = load_mha_losses()
    assert len(records) >= 20
    states = {r["state_name"] for r in records}
    assert "Assam" in states
    assert "Rajasthan" in states
    assert "Kerala" in states

    sample = next(r for r in records if r["state_name"] == "Assam" and r["year_start"] == 2020)
    assert sample["lives_lost"] > 0
    assert sample["houses_damaged"] > 0


def test_calculate_series_percentile_empirical():
    """Empirical percentile correctly computes rank / count."""
    series = [10.0, 20.0, 30.0, 40.0, 50.0]
    assert calculate_series_percentile(series, 10.0) == 20.0  # 1/5
    assert calculate_series_percentile(series, 30.0) == 60.0  # 3/5
    assert calculate_series_percentile(series, 50.0) == 100.0  # 5/5
    assert calculate_series_percentile(series, 5.0) == 0.0  # 0/5
    assert calculate_series_percentile([], 10.0) == 0.0


def test_evaluate_district_loss_context_barpeta_in_series():
    """Barpeta stack year (2020) is in-series in CWC with n=5 and typical flag."""
    res = evaluate_district_loss_context("barpeta", stack_year=2020)
    assert res["state"] == "Assam"
    assert res["stack_year"] == 2020
    assert res["status"] == "in_series"
    assert res["series_n"] == 5
    assert res["percentile"] == 60.0
    assert res["flag"] == "typical"
    assert "total_damage_crores" in res["metric_evaluated"]
    assert "2020" in res["finding"]
    assert "typical" in res["finding"]


def test_evaluate_district_loss_context_outside_series():
    """2023 stack year for Dholpur/Wayanad is outside series and documents latest benchmark."""
    res_dholpur = evaluate_district_loss_context("dholpur", stack_year=2023)
    assert res_dholpur["state"] == "Rajasthan"
    assert res_dholpur["stack_year"] == 2023
    assert res_dholpur["status"] == "outside_series"
    assert "outside" in res_dholpur["flag"]
    assert res_dholpur["benchmark_year"] == 2022  # 2022-23 benchmark
    assert res_dholpur["series_n"] == 5

    res_wayanad = evaluate_district_loss_context("wayanad", stack_year=2023)
    assert res_wayanad["state"] == "Kerala"
    assert res_wayanad["stack_year"] == 2023
    assert res_wayanad["status"] == "outside_series"
    assert res_wayanad["benchmark_year"] == 2022


def test_flag_unrepresentative_outside_20_80():
    """Synthetic percentile outside 20–80% triggers unrepresentative flag."""
    # When percentile is < 20% or > 80%
    series = [100.0, 200.0, 300.0, 400.0, 500.0]
    p_extreme = calculate_series_percentile(series, 500.0)  # 100.0%
    p_mild = calculate_series_percentile(series, 50.0)  # 0.0%
    assert not (20.0 <= p_extreme <= 80.0)
    assert not (20.0 <= p_mild <= 80.0)


def test_run_losses_validation_runner_end_to_end(tmp_path: Path):
    """run_losses_validation produces losses_report.json and updates metrics.json."""
    # Setup mock metrics.json in tmp_path
    mock_metrics = {
        "district": "barpeta",
        "model_version": "flood-susceptibility-v0.1",
        "generated_at": "2026-10-03T12:00:00Z",
        "references": {"ndem": {"years": [2020]}},
        "spatial": {
            "n_cells": 100,
            "n_excluded_non_full": 0,
            "n_excluded_permanent_water": 0,
            "prevalence": 0.5,
            "auc": {"model": 0.6},
            "pr_auc": {"model": 0.6},
            "ci95": {"auc_model": [0.55, 0.65]},
            "thresholds": {"0.5": {"precision": 0.6, "recall": 0.6, "f1": 0.6}},
        },
        "gauges": {"status": "no_stations", "n_stations": 0},
        "losses_context": {"stack_year": 2020, "series_n": 0, "percentile": 0.0, "flag": "unknown"},
    }
    (tmp_path / "metrics.json").write_text(json.dumps(mock_metrics), encoding="utf-8")

    cfg = ValidationConfig(
        district="barpeta",
        output_dir=str(tmp_path),
    )

    result = run_losses_validation(cfg)
    assert result["stack_year"] == 2020
    assert result["percentile"] == 60.0
    assert result["flag"] == "typical"

    # Check files created
    assert (tmp_path / "losses_report.json").exists()
    assert (tmp_path / "report.md").exists()

    # Check updated metrics.json
    updated_metrics = json.loads((tmp_path / "metrics.json").read_text(encoding="utf-8"))
    assert updated_metrics["losses_context"]["percentile"] == 60.0
    assert updated_metrics["losses_context"]["series_n"] == 5
    assert updated_metrics["losses_context"]["flag"] == "typical"
