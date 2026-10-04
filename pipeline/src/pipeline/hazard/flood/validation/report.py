"""Validation reporting, JSON schema validation, and truthful Markdown export.

Generates the standardized metrics.json payload (matching §11 of FLOOD_VALIDATION_PLAN.md)
and human-readable Markdown summaries adhering strictly to the honesty and
non-circularity guidelines (§1.1, §4).
"""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Tuple


REQUIRED_TOP_LEVEL_KEYS = {
    "district",
    "model_version",
    "generated_at",
    "references",
    "spatial",
    "gauges",
    "losses_context",
}

REQUIRED_SPATIAL_KEYS = {
    "n_cells",
    "prevalence",
    "auc",
    "pr_auc",
    "ci95",
    "thresholds",
}

FORBIDDEN_CLAIM_WORDS = {
    "calibrated",
    "cross-validation",
    "ground truth",
    "hydrodynamic",
    "accuracy 84",
    "verified accuracy",
}


def validate_metrics_payload(payload: dict[str, Any]) -> Tuple[bool, list[str]]:
    """Validate that a validation metrics payload complies with the §11 contract.

    Args:
        payload: Dict containing validation metrics.

    Returns:
        Tuple of (is_valid, list_of_error_messages).
    """
    errors: list[str] = []

    # Check top-level keys
    missing_top = REQUIRED_TOP_LEVEL_KEYS - set(payload.keys())
    if missing_top:
        errors.append(f"Missing required top-level keys: {sorted(missing_top)}")

    spatial = payload.get("spatial", {})
    if not isinstance(spatial, dict):
        errors.append("'spatial' must be a dictionary")
    else:
        missing_spatial = REQUIRED_SPATIAL_KEYS - set(spatial.keys())
        if missing_spatial:
            errors.append(f"Missing required 'spatial' keys: {sorted(missing_spatial)}")

        # Check prevalence
        if "prevalence" in spatial:
            prev = spatial["prevalence"]
            if prev is not None and not (0.0 <= prev <= 1.0):
                errors.append(f"Prevalence must be in [0.0, 1.0], got {prev}")

        # Check CI structure
        ci95 = spatial.get("ci95", {})
        if isinstance(ci95, dict) and "auc_model" in ci95:
            bounds = ci95["auc_model"]
            if (
                isinstance(bounds, (list, tuple))
                and len(bounds) == 2
                and bounds[0] is not None
                and bounds[1] is not None
                and not math.isnan(bounds[0])
                and not math.isnan(bounds[1])
            ):
                if bounds[0] > bounds[1]:
                    errors.append(f"CI bounds inverted: lower ({bounds[0]}) > upper ({bounds[1]})")

    # Guard against deceptive claim fields
    for k in payload.keys():
        k_lower = str(k).lower()
        for forbidden in FORBIDDEN_CLAIM_WORDS:
            if forbidden in k_lower:
                errors.append(f"Forbidden claim key detected: '{k}'")

    return len(errors) == 0, errors


def _f(value: Any, spec: str = ".3f", na: str = "N/A") -> str:
    """Format a number, rendering None / NaN as ``na`` instead of crashing or printing 0."""
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return na
    return format(value, spec)


def _ci(bounds: Any) -> str:
    if not bounds or len(bounds) != 2 or bounds[0] is None or bounds[1] is None:
        return "--"
    return f"[{bounds[0]:.3f}, {bounds[1]:.3f}]"


BASELINE_ROWS = [
    ("Baseline: Terrain HAND Only", "hand_only"),
    ("Baseline: Inundation Frequency Only", "frequency_only"),
    ("Baseline: Anomalous Frequency Only (v0.2 input)", "anomalous_frequency_only"),
    ("Baseline: Distance to Mainstem (Brahmaputra)", "dist_mainstem"),
    ("Baseline: Distance to Tributaries (Named/Major)", "dist_tributary"),
    ("Baseline: Distance to Any River (OSM)", "dist_any_river"),
    ("Diagnostic: Distance to JRC Permanent Water (circular)", "distance_to_river"),
    ("Baseline: Random", "random"),
]


def generate_markdown_summary(payload: dict[str, Any]) -> str:
    """Generate a truthful, comprehensive Markdown report from validation metrics.

    Follows the reporting standards of FLOOD_VALIDATION_PLAN.md (§1.1, §4):
    - Explicitly describes results as historical agreement, NOT operational accuracy.
    - Leads with rank agreement and the in-footprint / holdout years, then the
      aggregate AUC together with its negative count and CI.
    - Compares the model with every baseline, with paired CIs for the difference.
    - Discloses exclusion counts and the evaluation domain.

    Args:
        payload: Validated metrics dictionary.

    Returns:
        Formatted Markdown string.
    """
    district = payload.get("district", "Unknown").capitalize()
    model_version = payload.get("model_version", "unknown")
    gen_time = payload.get("generated_at", datetime.now(timezone.utc).isoformat())

    spatial = payload.get("spatial", {})
    n_cells = spatial.get("n_cells", 0)
    n_non_full = spatial.get("n_excluded_non_full", 0)
    n_pw = spatial.get("n_excluded_permanent_water", 0)
    n_outside = spatial.get("n_excluded_outside_domain", 0)
    prevalence = spatial.get("prevalence") or 0.0
    imbalance = spatial.get("imbalance", {})
    domain = spatial.get("evaluation_domain", {})
    regimes_in_domain = domain.get("hazard_regimes")

    auc = spatial.get("auc", {})
    pr_auc = spatial.get("pr_auc", {})
    spearman = spatial.get("spearman_frequency", {})
    ci95 = spatial.get("ci95", {})
    auc_ci = ci95.get("auc", {}) or {"model": ci95.get("auc_model")}
    sp_ci = ci95.get("spearman", {})
    diff_ci = ci95.get("auc_model_minus", {})
    per_year = spatial.get("per_year", [])

    lines: list[str] = [
        f"# Historical Flood Agreement Report: {district}",
        "",
        f"- **Model Version**: `{model_version}`",
        f"- **Generated At**: {gen_time}",
        f"- **Evaluation Domain**: hazard regime(s) {', '.join(regimes_in_domain) if regimes_in_domain else 'all'}"
        + (" + strict baseline-water filter" if domain.get("strict_baseline_water_filter") else ""),
        f"- **Evaluated H3 Cells**: {n_cells:,} (quality_flag = full)"
        + (f" — {imbalance.get('n_pos', 0):,} flooded / {imbalance.get('n_neg', 0):,} not flooded" if imbalance else ""),
        f"- **Excluded River / Permanent Water Cells**: {n_pw:,}",
        f"- **Excluded Low / No Coverage Cells**: {n_non_full:,}",
        f"- **Cells Outside Evaluation Regimes (reported in §4)**: {n_outside:,}",
        f"- **Historical Ever-Flooded Prevalence**: {prevalence * 100:.1f}%",
        "",
        "> [!IMPORTANT]",
        "> **Methodology & Claim Boundaries**:",
        "> This report evaluates spatial agreement between model susceptibility scores and",
        "> independent historical flood extents (ISRO NDEM). It does **not** claim hydrodynamic",
        "> depth prediction, operational calibration, or ground-truth cross-validation.",
    ]
    if imbalance.get("low_negative_count_warning"):
        lines.extend([
            "",
            "> [!WARNING]",
            f"> Only **{imbalance.get('n_neg')} not-flooded cells** across {imbalance.get('n_blocks')} spatial blocks.",
            "> ROC-AUC rests on very few negatives; read every AUC with its block-bootstrap CI.",
        ])

    # Headline: rank agreement and year-specific agreement first
    holdouts = [r for r in per_year if r.get("role") == "temporal_holdout"]
    ym = spatial.get("year_matched", {})
    lines.extend(["", "## Headline Agreement", ""])
    lines.append(
        f"- **Spearman vs NDEM flood frequency**: {_f(spearman.get('model'), '+.3f')} "
        f"(95% CI {_ci(sp_ci.get('model'))})"
    )
    if ym:
        lines.append(
            f"- **Year-Matched (2020) inside observation footprint**: ROC-AUC {_f(ym.get('auc'))} "
            f"(95% CI {_ci(ym.get('auc_ci95'))}, {ym.get('cells_in_footprint', 0):,} cells)"
            + (" — *in-sample: the model is built from the 2020 Sentinel-1 stack*" if ym.get("in_sample") else "")
        )
    for r in holdouts:
        lines.append(
            f"- **Temporal holdout ({r['year']})**: ROC-AUC {_f(r['auc'].get('model'))} "
            f"(95% CI {_ci(r.get('auc_model_ci95'))}, n_neg = {r.get('n_neg', 0)})"
        )
    lines.append(
        f"- **17-year aggregate ROC-AUC**: {_f(auc.get('model'))} (95% CI {_ci(auc_ci.get('model'))}, "
        f"n_neg = {imbalance.get('n_neg', 'N/A')})"
    )

    lines.extend([
        "",
        "## 1. Model vs Comparative Baselines",
        "",
        "Distance baselines are inverted (closer = higher score). CIs are spatial block bootstraps on H3 res-5 "
        "parents; the Δ column is the paired CI of *model AUC minus baseline AUC* — an interval that spans 0 "
        "means the model is not distinguishable from that baseline.",
        "",
        "| Candidate Predictor | ROC-AUC | 95% CI | Δ vs Model 95% CI | PR-AUC | Chance (Prevalence) | Spearman (ρ) | ρ 95% CI |",
        "|---|---|---|---|---|---|---|---|",
        f"| **Full Model (`susceptibility`)** | **{_f(auc.get('model'))}** | {_ci(auc_ci.get('model'))} | -- "
        f"| **{_f(pr_auc.get('model'))}** | {prevalence:.3f} | {_f(spearman.get('model'), '+.3f')} | {_ci(sp_ci.get('model'))} |",
    ])
    for name, key in BASELINE_ROWS:
        if auc.get(key) is None and pr_auc.get(key) is None:
            continue
        lines.append(
            f"| {name} | {_f(auc.get(key))} | {_ci(auc_ci.get(key))} | {_ci(diff_ci.get(key))} "
            f"| {_f(pr_auc.get(key))} | {prevalence:.3f} | {_f(spearman.get(key), '+.3f', '--')} | {_ci(sp_ci.get(key))} |"
        )

    thresholds = spatial.get("thresholds", {})
    if thresholds:
        lines.extend([
            "",
            "## 2. Classification Performance across Decision Thresholds",
            "",
            "| Decision Threshold | Precision | Recall | F1 Score | Balanced Acc | MCC | Flagged Cells | Flagged % |",
            "|---|---|---|---|---|---|---|---|",
        ])
        if "all_positive" in thresholds:
            ap = thresholds["all_positive"]
            lines.append(
                f"| *All Flooded (Trivial)* | {ap.get('precision', 0.0):.3f} | {ap.get('recall', 0.0):.3f} | "
                f"{ap.get('f1', 0.0):.3f} | {ap.get('balanced_accuracy', 0.0):.3f} | {ap.get('mcc', 0.0):.3f} | "
                f"{ap.get('n_flagged', 0):,} | 100.0% |"
            )
        for thresh, vals in sorted(
            [(k, v) for k, v in thresholds.items() if k != "all_positive"], key=lambda x: float(x[0])
        ):
            lines.append(
                f"| ≥ {thresh} | {vals.get('precision', 0.0):.3f} | {vals.get('recall', 0.0):.3f} | "
                f"{vals.get('f1', 0.0):.3f} | {vals.get('balanced_accuracy', 0.0):.3f} | {vals.get('mcc', 0.0):.3f} | "
                f"{vals.get('n_flagged', 0):,} | {vals.get('flagged_pct', 0.0) * 100:.1f}% |"
            )

    if per_year:
        lines.extend([
            "",
            "## 3. Per-Year Agreement",
            "",
            "`in_sample` = the Sentinel-1 stack year the model is built from; `temporal_holdout` = later years; "
            "`pre_sentinel1` = before Sentinel-1, so independent of the SAR input. Years with few negatives "
            "carry little information.",
            "",
            "| Year | Role | Cells | Flooded | Not Flooded | Model AUC | 95% CI | HAND | Freq | Anom. Freq | Mainstem | Tributary |",
            "|---|---|---|---|---|---|---|---|---|---|---|---|",
        ])
        for r in per_year:
            a = r.get("auc", {})
            lines.append(
                f"| {r['year']} | {r.get('role')} | {r.get('n_cells', 0):,} | {r.get('n_pos', 0):,} | {r.get('n_neg', 0):,} "
                f"| {_f(a.get('model'))} | {_ci(r.get('auc_model_ci95'))} | {_f(a.get('hand_only'))} "
                f"| {_f(a.get('frequency_only'))} | {_f(a.get('anomalous_frequency_only'), '.3f', '--')} "
                f"| {_f(a.get('dist_mainstem'), '.3f', '--')} | {_f(a.get('dist_tributary'), '.3f', '--')} |"
            )

    regimes = spatial.get("by_regime", [])
    if regimes:
        lines.extend([
            "",
            "## 4. Hazard Regime Disaggregation",
            "",
            "Product columns cover every published cell; agreement columns cover cells that passed the quality "
            "and permanent-water filters. Regimes marked ✓ form the headline evaluation domain.",
            "",
            "| Hazard Regime | Headline | Cells (product) | Share | Population | Mean Susceptibility | Evaluated Cells | Not Flooded | NDEM Prevalence | ROC-AUC | Spearman (ρ) |",
            "|---|---|---|---|---|---|---|---|---|---|---|",
        ])
        for reg in regimes:
            pop = reg.get("population")
            prev = reg.get("ndem_prevalence")
            lines.append(
                f"| {str(reg.get('regime', '')).replace('_', ' ').title()} | {'✓' if reg.get('in_headline') else ''} "
                f"| {reg.get('cell_count', 0):,} | {_f(reg.get('share_pct'), '.1f')}% "
                f"| {f'{int(pop):,}' if pop is not None else 'N/A'} | {_f(reg.get('mean_susceptibility'))} "
                f"| {reg.get('eval_cell_count', 0):,} | {reg.get('eval_n_neg', 0):,} "
                f"| {f'{prev * 100:.1f}%' if prev is not None else 'N/A'} | {_f(reg.get('roc_auc'))} "
                f"| {_f(reg.get('spearman'), '+.3f')} |"
            )
        lines.extend([
            "",
            "> [!NOTE]",
            "> Char-belt and channel cells stay in the product with their own `hazard_regime`; they are not",
            "> excluded. NDEM maps terrestrial flood damage and rarely marks chars as flooded, so their",
            "> agreement is reported here rather than mixed into the headline.",
        ])

    terciles = spatial.get("by_confidence_tercile", [])
    if terciles:
        lines.extend([
            "",
            "## 5. Agreement Stratified by SAR Observation Density",
            "",
            "| Observation Density Tier | Cell Count | Mean Density | Prevalence | ROC-AUC | PR-AUC |",
            "|---|---|---|---|---|---|",
        ])
        for t in terciles:
            lines.append(
                f"| {t.get('tier', 'Tercile')} | {t.get('cell_count', 0):,} | {t.get('mean_stratify_value', 0.0):.2f} "
                f"| {t.get('prevalence', 0.0) * 100:.1f}% | {_f(t.get('roc_auc'))} | {_f(t.get('pr_auc'))} |"
            )

    regions = spatial.get("by_region_block", [])
    if regions:
        lines.extend([
            "",
            "## 6. Regional Disaggregation (median-latitude split; no training involved)",
            "",
            "| Regional Block | Cell Count | Prevalence | ROC-AUC | PR-AUC |",
            "|---|---|---|---|---|",
        ])
        for r in regions:
            lines.append(
                f"| {str(r.get('region', '')).capitalize()} | {r.get('cell_count', 0):,} "
                f"| {r.get('prevalence', 0.0) * 100:.1f}% | {_f(r.get('roc_auc'))} | {_f(r.get('pr_auc'))} |"
            )

    pre2015 = spatial.get("pre2015_subset", {})
    sensitivity = spatial.get("sensitivity", {})
    if pre2015 or ym or sensitivity:
        lines.extend(["", "## 7. Non-Circularity, Year-Matched and Sensitivity Checks", ""])
        if pre2015:
            lines.append(
                f"- **Pre-2015 Non-Circular Subset (1998–2013)**: ROC-AUC = {_f(pre2015.get('auc'))} "
                "(reference predates Sentinel-1, so it cannot share the model's SAR source)."
            )
        if ym:
            lines.append(
                f"- **Year-Matched ({ym.get('year')}) Subset**: ROC-AUC = {_f(ym.get('auc'))} inside the "
                f"observation footprint ({ym.get('cells_in_footprint', 0):,} cells, prevalence "
                f"{_f((ym.get('prevalence_in_footprint') or 0) * 100, '.1f')}%)."
            )
        for key, row in sensitivity.items():
            lines.append(
                f"- **Sensitivity — {key.replace('_', ' ')}** ({row.get('description', '')}): "
                f"ROC-AUC = {_f(row.get('auc_model'))} on {row.get('n_cells', 0):,} cells "
                f"(n_neg = {row.get('n_neg', 0)})."
            )

    refs = payload.get("references", {})
    footprints = payload.get("reference_footprints", {})
    rivers = refs.get("rivers", {})
    if footprints or rivers:
        lines.extend(["", "## 8. Reference Provenance", ""])
        for yr, fp in footprints.items():
            audit = fp.get("gridcode_audit", {})
            lines.append(
                f"- **{yr} observation footprint**: {fp.get('method')} (ratio {fp.get('ratio')}), "
                f"{fp.get('buffer_m', 0):,.0f} m buffer, min overlap {fp.get('min_overlap')}; "
                f"{fp.get('cells_in_footprint', 0):,}/{fp.get('cells_total', 0):,} cells covered; "
                f"layer reaches {fp.get('max_lat')}° N. Gridcode audit: {audit.get('interpretation', 'n/a')}."
            )
        osm = rivers.get("osm_pbf", {})
        if osm:
            lines.append(
                f"- **OSM rivers**: `{osm.get('path')}` ({osm.get('bytes', 0):,} bytes, sha256 "
                f"`{str(osm.get('sha256', ''))[:12]}…`, file time {osm.get('modified_utc')}). "
                f"{rivers.get('osm_licence', '')}"
            )
        hydro = rivers.get("hydrorivers", {})
        if hydro.get("path"):
            lines.append(f"- **HydroRIVERS**: `{hydro.get('path')}` — {rivers.get('hydrorivers_citation', '')}")
        if rivers.get("status") and rivers.get("status") != "evaluated":
            lines.append(f"- **River baselines status**: {rivers.get('status')}")

    # Losses context
    losses = payload.get("losses_context", {})
    if losses:
        lines.extend([
            "",
            "## 9. Stack-Year Climate Context (CWC / MHA)",
            "",
            f"- **State Evaluated**: {losses.get('state', district)}",
            f"- **Primary Reference Source**: {losses.get('primary_source', 'CWC / MHA')} ({losses.get('data_source_type', 'official_record')})",
            f"- **SAR Stack Year**: {losses.get('stack_year', 'N/A')}",
            f"- **Historical State Series Size (n)**: {losses.get('series_n', 0)} years",
            f"- **State Flood Loss Percentile**: {losses.get('percentile', 0.0):.1f}%",
            f"- **Series Status**: `{losses.get('status', 'in_series')}`",
            f"- **Year Characterization**: `{losses.get('flag', 'unknown')}`",
        ])
        finding = losses.get("finding")
        if finding:
            lines.append(f"- **Finding Documentation**: {finding}")

        lines.extend([
            "",
            "> [!NOTE]",
            "> **Macro Climatological Context**: State-level CWC/MHA loss tallies indicate whether the",
            "> observation stack year was typical or extreme. In accordance with §1.1 and §4, macro statistics",
            "> must never be cited as an 'accuracy' or 'ground truth' score for localized pixel predictions.",
        ])

    # Gauges context (INDOFLOODS)
    gauges = payload.get("gauges", {})
    if gauges:
        lines.extend([
            "",
            "## 10. River Gauge Consistency & Gap Audit (INDOFLOODS)",
            "",
            f"- **Audit Status**: `{gauges.get('status', 'N/A')}`",
            f"- **Active Gauge Stations in Pilot District**: {gauges.get('n_stations', 0)}",
        ])
        finding = gauges.get("finding")
        if finding:
            lines.append(f"- **Finding Documentation**: {finding}")

        temporal = gauges.get("temporal_check")
        if temporal and temporal.get("status") == "evaluated":
            lines.extend([
                "",
                "### Temporal Scene-Date Check (Sentinel-1 SAR Detection vs Flood Waves)",
                "",
                f"- **Evaluated Scene Dates (n)**: {temporal.get('n_in_event_scenes', 0) + temporal.get('n_out_of_event_scenes', 0)}",
                f"- **In-Event Scenes (n)**: {temporal.get('n_in_event_scenes', 0)} (Mean Water Fraction: {temporal.get('mean_in_event_fraction', 0.0):.1%})",
                f"- **Out-of-Event Scenes (n)**: {temporal.get('n_out_of_event_scenes', 0)} (Mean Water Fraction: {temporal.get('mean_out_of_event_fraction', 0.0):.1%})",
                f"- **Mann–Whitney U Statistic**: {temporal.get('mann_whitney_u', 0.0):.1f} (p-value = {temporal.get('p_value', 1.0):.4e})",
            ])

        reach = gauges.get("reach_check")
        if reach and reach.get("status") == "evaluated":
            lines.extend([
                "",
                "### Reach-Level Spatial Susceptibility Consistency",
                "",
                f"- **Reach Cells within Radius (n)**: {reach.get('n_reach_cells', 0)}",
                f"- **Background District Cells (n)**: {reach.get('n_background_cells', 0)}",
                f"- **Mean Reach Susceptibility**: {reach.get('mean_reach_score', 0.0):.3f}",
                f"- **Mean Background Susceptibility**: {reach.get('mean_background_score', 0.0):.3f}",
                f"- **Mann–Whitney U Statistic**: {reach.get('mann_whitney_u', 0.0):.1f} (p-value = {reach.get('p_value', 1.0):.4f})",
            ])
        elif reach and reach.get("status") != "evaluated":
            lines.append(f"- **Reach Check Note**: {reach.get('status')} ({reach.get('reason', 'N/A')})")

        lines.extend([
            "",
            "> [!NOTE]",
            "> **Reference Citation**: Kuntla & Saharia (BAMS 2025), *INDOFLOODS: A Comprehensive Benchmark Dataset for Flood Studies in India*, licensed under CC BY 4.0.",
        ])

    lines.append("")
    return "\n".join(lines)


def save_validation_report(
    payload: dict[str, Any],
    output_dir: Path | str,
) -> Tuple[Path, Path]:
    """Validate, serialize, and write metrics.json and report.md to output directory.

    Args:
        payload: Validation metrics dictionary conforming to §11 contract.
        output_dir: Directory where reports should be written.

    Returns:
        Tuple of (json_path, markdown_path).

    Raises:
        ValueError: If payload fails validation against the contract.
    """
    is_valid, errors = validate_metrics_payload(payload)
    if not is_valid:
        raise ValueError(f"Invalid validation metrics payload: {'; '.join(errors)}")

    out_p = Path(output_dir)
    out_p.mkdir(parents=True, exist_ok=True)

    json_path = out_p / "metrics.json"
    md_path = out_p / "report.md"

    # Write metrics.json with clean formatting
    json_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    # Write report.md
    md_content = generate_markdown_summary(payload)
    md_path.write_text(md_content, encoding="utf-8")

    return json_path, md_path
