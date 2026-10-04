"""CLI runner for flood susceptibility validation.

Usage:
    python -m pipeline.hazard.flood.validation.run --district barpeta
    python -m pipeline.hazard.flood.validation.run --district dholpur
"""

from __future__ import annotations

import argparse
import sys
from .checks_ndem import run_ndem_validation
from .checks_indofloods import run_indofloods_validation
from .checks_losses import run_losses_validation
from .config import get_validation_config


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run SETU-DRR flood susceptibility validation against independent reference datasets."
    )
    parser.add_argument(
        "--district",
        "-d",
        required=True,
        help="District key slug (e.g. 'barpeta', 'dholpur', 'morena', 'wayanad').",
    )
    parser.add_argument(
        "--check",
        choices=["all", "ndem", "gauges", "losses"],
        default="all",
        help="Validation track to execute (default: all).",
    )
    parser.add_argument(
        "--water-threshold",
        type=float,
        default=None,
        help="Maximum permanent water fraction for cell exclusion (default: 0.01 = 1 percent).",
    )
    parser.add_argument(
        "--baseline-water-threshold",
        type=float,
        default=None,
        help="Maximum seasonal baseline water fraction for cell exclusion (Priority 1, default: 0.01 = 1 percent).",
    )
    parser.add_argument(
        "--use-baseline-water",
        action=argparse.BooleanOptionalAction,
        default=None,
        help="Whether to apply seasonal baseline water exclusion (Priority 1).",
    )
    parser.add_argument(
        "--distance-to-river-raster",
        type=str,
        default=None,
        help="Path to distance-to-river GeoTIFF (for Priority 4 baseline).",
    )
    parser.add_argument(
        "--model-version",
        type=str,
        default=None,
        help="Model version string for reporting.",
    )
    parser.add_argument(
        "--processed-cells",
        type=str,
        default=None,
        help="Path to evaluated model cells parquet.",
    )
    parser.add_argument(
        "--flood-threshold",
        type=float,
        default=None,
        help="Minimum inundated fraction to classify a cell as flooded (default: 0.10).",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=None,
        help="Custom output directory for metrics.json and report.md.",
    )

    args = parser.parse_args()

    config = get_validation_config(
        district=args.district,
        max_permanent_water_fraction=args.water_threshold,
        max_baseline_water_fraction=args.baseline_water_threshold,
        use_baseline_water_filter=args.use_baseline_water,
        primary_flood_fraction_threshold=args.flood_threshold,
        model_version=args.model_version,
        processed_cells_path=args.processed_cells,
        distance_to_river_raster_path=args.distance_to_river_raster,
        output_dir=args.output_dir,
    )


    try:
        if args.check in ("all", "ndem"):
            run_ndem_validation(config)
        if args.check in ("all", "gauges"):
            run_indofloods_validation(config)
        if args.check in ("all", "losses"):
            run_losses_validation(config)
    except Exception as e:
        print(f"\n[ERROR] Validation failed: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
