"""Unit tests for the NDEM check helpers: year roles, per-year table, regime table."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from pipeline.hazard.flood.validation.checks_ndem import (
    _per_year_table,
    _regime_table,
    _resolve_hazard_regime,
    _year_role,
)
from pipeline.hazard.flood.validation.config import ValidationConfig


def test_year_role_relative_to_stack_year():
    assert _year_role(2005, 2020) == "pre_sentinel1"
    assert _year_role(2017, 2020) == "independent"
    assert _year_role(2020, 2020) == "in_sample"
    assert _year_role(2021, 2020) == "temporal_holdout"


def _eval_frame() -> pd.DataFrame:
    rng = np.random.default_rng(3)
    n = 120
    s = rng.random(n)
    return pd.DataFrame({
        "susceptibility": s,
        "baseline_hand": rng.random(n),
        "baseline_freq": rng.random(n),
        "parent_block": np.repeat(np.arange(6), 20),
        "ref_flood_fraction_2019": (s > 0.5).astype(float),
        "ref_flood_fraction_2020": (s > 0.3).astype(float),
        "cov_2020": np.arange(n) < 60,
    })


def test_per_year_table_respects_event_footprint_and_roles():
    cfg = ValidationConfig(district="barpeta", bootstrap_iterations=50, sar_stack_year=2020)
    rows = {r["year"]: r for r in _per_year_table(_eval_frame(), [2019, 2020], cfg)}

    assert rows[2019]["source"] == "annual_composite" and rows[2019]["n_cells"] == 120
    assert rows[2020]["source"] == "event_layer" and rows[2020]["n_cells"] == 60
    assert rows[2020]["role"] == "in_sample"
    assert rows[2019]["auc"]["model"] == pytest.approx(1.0)
    assert rows[2019]["n_pos"] + rows[2019]["n_neg"] == 120
    assert "anomalous_frequency_only" not in rows[2019]["auc"], "absent predictors are omitted, not zero"


def test_regime_table_separates_product_and_evaluated_counts():
    product = pd.DataFrame({
        "hazard_regime": ["floodplain"] * 4 + ["char_belt"] * 2 + ["channel"],
        "susceptibility": [0.2, 0.4, 0.6, 0.8, 0.5, 0.5, 0.9],
        "population": [10.0] * 7,
        "confidence": [0.5] * 7,
    })
    domain = product.iloc[:5].assign(
        y_true_binary=[0, 0, 1, 1, 0],
        ref_flood_frequency=[0.0, 0.1, 0.5, 0.9, 0.2],
    )

    rows = {r["regime"]: r for r in _regime_table(product, domain, ("floodplain",))}

    assert rows["floodplain"]["in_headline"] and rows["floodplain"]["roc_auc"] == pytest.approx(1.0)
    assert rows["char_belt"]["cell_count"] == 2 and rows["char_belt"]["eval_cell_count"] == 1
    assert rows["char_belt"]["roc_auc"] is None, "single-class regime has no AUC, not 0"
    assert rows["channel"]["eval_cell_count"] == 0 and rows["channel"]["ndem_prevalence"] is None
    assert rows["floodplain"]["population"] == 40


def test_resolve_hazard_regime_prefers_parquet_then_derives():
    with_col = pd.DataFrame({"hazard_regime": ["char_belt"]})
    assert list(_resolve_hazard_regime(with_col)) == ["char_belt"]

    derived = pd.DataFrame({"jrc_occurrence_mean": [0.8, 0.0], "mean_inundation_frequency": [0.0, 0.0]})
    assert list(_resolve_hazard_regime(derived)) == ["channel", "floodplain"]

    assert _resolve_hazard_regime(pd.DataFrame({"x": [1]})).isna().all()
