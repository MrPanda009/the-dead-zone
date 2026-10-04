"""Integration / validation tests for Barpeta historical flood agreement.

Tests against real local NDEM reference data and model artifacts.
Tagged with pytest marker `validation`. Skips cleanly if reference data is absent.
"""

from __future__ import annotations

from pathlib import Path
import pytest

from pipeline.hazard.flood.validation.config import get_validation_config
from pipeline.hazard.flood.validation.checks_ndem import run_ndem_validation
from pipeline.hazard.flood.validation.report import validate_metrics_payload


REPO_ROOT = Path(__file__).resolve().parents[2]
BARPETA_PARQUET = REPO_ROOT / "data/processed/flood/barpeta/flood_susceptibility_h3_res8.parquet"
NDEM_AGGREGATE = REPO_ROOT / "data/validation/ndem/NDEM_AS_Yearly_Aggregate_Flood_Innundation_1998_to_2013_2021.parquet"


@pytest.mark.validation
def test_barpeta_ndem_validation_pipeline(tmp_path: Path):
    """Execute end-to-end NDEM validation on Barpeta and verify output artifacts.

    Writes to a temporary directory: the published run in data/processed/flood_validation
    is what the API serves and must only change through the validation CLI.
    """
    if not BARPETA_PARQUET.exists():
        pytest.skip(f"Barpeta model parquet missing at {BARPETA_PARQUET}")
    if not NDEM_AGGREGATE.exists():
        pytest.skip(f"NDEM aggregate missing at {NDEM_AGGREGATE}")

    config = get_validation_config(
        district="barpeta",
        max_permanent_water_fraction=0.01,
        primary_flood_fraction_threshold=0.10,
        output_dir=str(tmp_path),
    )

    payload, eval_df = run_ndem_validation(config)

    # 1. Payload validation
    is_valid, errors = validate_metrics_payload(payload)
    assert is_valid is True, f"Validation payload failed contract: {errors}"

    # 2. Cell counts: headline is the floodplain regime after quality / permanent-water masks
    spatial = payload["spatial"]
    assert spatial["evaluation_domain"]["hazard_regimes"] == ["floodplain"]
    assert 2000 < spatial["n_cells"] < 2600, f"Unexpected evaluated cell count {spatial['n_cells']}"
    assert 100 <= spatial["n_excluded_permanent_water"] <= 200
    assert spatial["n_excluded_non_full"] >= 7
    assert set(eval_df["hazard_regime"]) == {"floodplain"}

    # 3. Imbalance is reported, not hidden
    imbalance = spatial["imbalance"]
    assert imbalance["n_pos"] + imbalance["n_neg"] == spatial["n_cells"]
    assert imbalance["low_negative_count_warning"] == (imbalance["n_neg"] < 100)

    # 4. Every predictor carries a CI; the model's CI brackets its point estimate
    ci = spatial["ci95"]["auc_model"]
    assert ci[0] <= spatial["auc"]["model"] <= ci[1]
    for key in ("hand_only", "frequency_only"):
        assert spatial["ci95"]["auc"][key] is not None
        assert spatial["ci95"]["auc_model_minus"][key] is not None

    # 5. Per-year table: real coverage counts, the stack year in-sample, 2021 a holdout
    roles = {row["year"]: row["role"] for row in spatial["per_year"]}
    assert roles[2020] == "in_sample"
    assert roles[2021] == "temporal_holdout"
    assert roles[1998] == "pre_sentinel1"
    coverage = payload["references"]["ndem"]["years_with_coverage"]
    assert coverage["2020"] < coverage["2021"], "2020 event layer must be footprint-limited"
    assert spatial["year_matched"]["in_sample"] is True

    # 6. Regime table: floodplain agreement is the headline; chars are kept, not dropped
    regimes = {row["regime"]: row for row in spatial["by_regime"]}
    assert regimes["floodplain"]["roc_auc"] == pytest.approx(spatial["auc"]["model"])
    assert regimes["char_belt"]["cell_count"] > 0 and not regimes["char_belt"]["in_headline"]

    # 7. Provenance
    audit = payload["reference_footprints"]["2020"]["gridcode_audit"]
    assert audit["gridcode_varies_within_event"] is False
    assert payload["gauges"]["status"] == "not_evaluated"

    md_text = (tmp_path / "report.md").read_text(encoding="utf-8")
    assert "Historical Flood Agreement Report: Barpeta" in md_text
    assert "Per-Year Agreement" in md_text
