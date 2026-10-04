"""Unit tests for flood validation reporting, schema validation, and markdown generation."""

from __future__ import annotations

import json
from pathlib import Path
import pytest

from pipeline.hazard.flood.validation.report import (
    validate_metrics_payload,
    generate_markdown_summary,
    save_validation_report,
)


def _make_valid_sample_payload() -> dict:
    """Fixture providing a complete, valid sample metrics dictionary."""
    return {
        "district": "barpeta",
        "model_version": "flood-susceptibility-v0.1",
        "generated_at": "2026-10-03T12:00:00Z",
        "references": {
            "ndem": {
                "years": [1998, 1999, 2000, 2021],
                "years_with_coverage": {"1998": 2800, "1999": 2800},
                "polygons": 197953,
                "licence": "Government Open Data License (GODL) / NRSC",
            }
        },
        "spatial": {
            "n_cells": 2820,
            "n_excluded_non_full": 8,
            "n_excluded_permanent_water": 120,
            "prevalence": 0.791,
            "spearman_frequency": {
                "model": 0.001,
                "hand_only": 0.331,
                "frequency_only": -0.025,
                "distance_to_river": 0.12,
            },
            "auc": {
                "model": 0.169,
                "hand_only": 0.470,
                "frequency_only": 0.164,
                "distance_to_river": 0.35,
                "random": 0.501,
            },
            "pr_auc": {
                "model": 0.75,
                "hand_only": 0.82,
                "frequency_only": 0.74,
                "distance_to_river": 0.78,
                "random": 0.79,
            },
            "ci95": {
                "auc_model": [0.14, 0.20],
            },
            "thresholds": {
                "0.3": {
                    "precision": 0.81,
                    "recall": 0.95,
                    "f1": 0.87,
                    "n_flagged": 2600,
                    "flagged_pct": 0.92,
                },
                "0.5": {
                    "precision": 0.85,
                    "recall": 0.70,
                    "f1": 0.77,
                    "n_flagged": 1800,
                    "flagged_pct": 0.64,
                },
            },
            "by_confidence_tercile": [
                {
                    "tier": "Tercile 1 (Low)",
                    "range": [0.0, 0.33],
                    "cell_count": 940,
                    "mean_stratify_value": 0.25,
                    "prevalence": 0.90,
                    "roc_auc": 0.19,
                    "pr_auc": 0.86,
                },
                {
                    "tier": "Tercile 2 (Mid)",
                    "range": [0.33, 0.66],
                    "cell_count": 940,
                    "mean_stratify_value": 0.50,
                    "prevalence": 0.70,
                    "roc_auc": 0.12,
                    "pr_auc": 0.51,
                },
                {
                    "tier": "Tercile 3 (High)",
                    "range": [0.66, 1.0],
                    "cell_count": 940,
                    "mean_stratify_value": 0.85,
                    "prevalence": 0.89,
                    "roc_auc": 0.48,
                    "pr_auc": 0.87,
                },
            ],
            "by_region_block": [
                {
                    "region": "north",
                    "cell_count": 1410,
                    "prevalence": 0.85,
                    "roc_auc": 0.22,
                    "pr_auc": 0.88,
                },
                {
                    "region": "south",
                    "cell_count": 1410,
                    "prevalence": 0.70,
                    "roc_auc": 0.12,
                    "pr_auc": 0.65,
                },
            ],
            "pre2015_subset": {"auc": 0.17},
            "year_matched": {"year": 2020, "auc": 0.18},
        },
        "gauges": {
            "status": "no_stations",
            "n_stations": 0,
            "spearman": None,
        },
        "losses_context": {
            "stack_year": 2020,
            "series_n": 7,
            "percentile": 65.0,
            "flag": "typical",
        },
    }


def test_validate_metrics_payload_passes_valid():
    """Valid metrics payload strictly complies with the schema."""
    payload = _make_valid_sample_payload()
    is_valid, errors = validate_metrics_payload(payload)
    assert is_valid is True
    assert len(errors) == 0


def test_validate_metrics_payload_catches_missing_keys():
    """Missing mandatory top-level or spatial keys must fail validation."""
    payload = _make_valid_sample_payload()
    del payload["spatial"]["prevalence"]
    is_valid, errors = validate_metrics_payload(payload)
    assert is_valid is False
    assert any("prevalence" in e for e in errors)

    del payload["model_version"]
    is_valid2, errors2 = validate_metrics_payload(payload)
    assert is_valid2 is False
    assert any("model_version" in e for e in errors2)


def test_validate_metrics_payload_catches_inverted_ci():
    """Inverted CI bounds (lower > upper) must be caught."""
    payload = _make_valid_sample_payload()
    payload["spatial"]["ci95"]["auc_model"] = [0.80, 0.20]  # Inverted!
    is_valid, errors = validate_metrics_payload(payload)
    assert is_valid is False
    assert any("CI bounds inverted" in e for e in errors)


def test_validate_metrics_payload_catches_forbidden_claims():
    """Overclaim words (calibrated, cross-validation) in payload keys are rejected."""
    payload = _make_valid_sample_payload()
    payload["cross-validation-result"] = "verified"
    is_valid, errors = validate_metrics_payload(payload)
    assert is_valid is False
    assert any("Forbidden claim key" in e for e in errors)


def test_generate_markdown_summary_content():
    """Markdown summary contains truthful disclosures, prevalence, baselines, and disclaimers."""
    payload = _make_valid_sample_payload()
    md = generate_markdown_summary(payload)

    # Truthful disclaimers
    assert "Historical Flood Agreement Report" in md
    assert "Methodology & Claim Boundaries" in md
    assert "does **not** claim hydrodynamic" in md

    # Model vs Baselines comparison table
    assert "Full Model (`susceptibility`)" in md
    assert "Baseline: Terrain HAND Only" in md
    assert "Baseline: Inundation Frequency Only" in md
    assert "Chance (Prevalence)" in md

    # Exclusions
    assert "120" in md  # permanent water cells
    assert "8" in md  # non full cells

    # Decisions and strata
    assert "Decision Threshold" in md
    assert "Tercile 1 (Low)" in md
    assert "North" in md
    assert "South" in md

    # Non-circularity
    assert "Pre-2015 Non-Circular" in md
    assert "Year-Matched (2020)" in md


def test_save_validation_report(tmp_path: Path):
    """save_validation_report correctly serializes JSON and Markdown files to disk."""
    payload = _make_valid_sample_payload()
    json_path, md_path = save_validation_report(payload, output_dir=tmp_path)

    assert json_path.exists()
    assert md_path.exists()

    # Verify JSON content matches
    loaded_json = json.loads(json_path.read_text(encoding="utf-8"))
    assert loaded_json["district"] == "barpeta"
    assert loaded_json["spatial"]["n_cells"] == 2820

    # Verify Markdown content
    md_content = md_path.read_text(encoding="utf-8")
    assert "Historical Flood Agreement Report" in md_content


def test_markdown_renders_phase0_2_sections_with_missing_values():
    payload = _make_valid_sample_payload()
    spatial = payload["spatial"]
    spatial["imbalance"] = {"n_pos": 2200, "n_neg": 60, "n_blocks": 18, "low_negative_count_warning": True}
    spatial["evaluation_domain"] = {"hazard_regimes": ["floodplain"], "strict_baseline_water_filter": False}
    spatial["per_year"] = [
        {"year": 2021, "role": "temporal_holdout", "n_cells": 100, "n_pos": 40, "n_neg": 60,
         "auc": {"model": 0.61, "hand_only": None}, "auc_model_ci95": None},
    ]
    spatial["by_regime"] = [
        {"regime": "channel", "in_headline": False, "cell_count": 26, "share_pct": 0.9, "population": None,
         "mean_susceptibility": 0.5, "eval_cell_count": 0, "eval_n_neg": 0, "ndem_prevalence": None,
         "roc_auc": None, "spearman": None},
    ]

    md = generate_markdown_summary(payload)

    assert "Only **60 not-flooded cells**" in md
    assert "Temporal holdout (2021)" in md
    assert "Per-Year Agreement" in md
    assert "| Channel |" in md and "N/A%" not in md
    assert "Regional Disaggregation (median-latitude split; no training involved)" in md
    assert "SAR Observation Density" in md
