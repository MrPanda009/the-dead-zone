"""Validation runner for Phase 4: CWC / MHA disaster loss context.

Executes the climatological context check:
1. Evaluates state flood damage records from Central Water Commission (CWC) and
   Disaster Management Division (MHA).
2. Calculates empirical loss percentiles with sample size (n) for the SAR observation stack year.
3. Produces a standardized `losses_report.json` and updates `metrics.json` and `report.md`.
4. Strictly adheres to non-claim boundaries: macro disaster tallies characterize climate
   representativeness (typical vs extreme vs outside series), never a local model accuracy score.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .config import ValidationConfig
from .reference_losses import evaluate_district_loss_context
from .report import generate_markdown_summary


def run_losses_validation(config: ValidationConfig) -> dict[str, Any]:
    """Execute Phase 4 flood loss context validation for a district.

    Args:
        config: District validation configuration.

    Returns:
        Evaluated loss context dictionary.
    """
    print(f"\n[PHASE 4] Running CWC / MHA Loss Context Check for: {config.district.upper()}")
    print("-" * 70)

    loss_context = evaluate_district_loss_context(
        district=config.district,
    )

    print(f"  State: {loss_context['state']}")
    print(f"  SAR Stack Year: {loss_context['stack_year']}")
    print(f"  Series Size (n): {loss_context['series_n']} years")
    print(f"  Status: {loss_context['status']}")
    print(f"  Percentile: {loss_context['percentile']:.1f}%")
    print(f"  Climate Flag: {loss_context['flag']}")
    print(f"  Finding: {loss_context['finding']}")

    # Save artifact
    out_dir = Path(config.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    losses_report_path = out_dir / "losses_report.json"
    losses_report_path.write_text(json.dumps(loss_context, indent=2), encoding="utf-8")
    print(f"\n  Saved loss context report to: {losses_report_path}")

    # Update metrics.json if it exists
    metrics_json_path = out_dir / "metrics.json"
    if metrics_json_path.exists():
        metrics_data = json.loads(metrics_json_path.read_text(encoding="utf-8"))
        metrics_data["losses_context"] = {
            "stack_year": loss_context["stack_year"],
            "series_n": loss_context["series_n"],
            "percentile": loss_context["percentile"],
            "flag": loss_context["flag"],
            "status": loss_context["status"],
            "state": loss_context["state"],
            "primary_source": loss_context["primary_source"],
            "data_source_type": loss_context["data_source_type"],
            "metric_evaluated": loss_context["metric_evaluated"],
            "benchmark_year": loss_context.get("benchmark_year"),
            "benchmark_value": loss_context.get("benchmark_value"),
            "finding": loss_context["finding"],
        }
        metrics_json_path.write_text(json.dumps(metrics_data, indent=2), encoding="utf-8")
        print(f"  Updated metrics.json with verified loss context.")

        # Regenerate report.md to reflect verified loss context
        report_md_path = out_dir / "report.md"
        updated_md = generate_markdown_summary(metrics_data)
        report_md_path.write_text(updated_md, encoding="utf-8")
        print(f"  Regenerated report.md with updated loss context.")

    print("=" * 70)
    return loss_context
