"""SETU-DRR Flood Susceptibility Validation Framework.

Pure metrics, alignment, baselines, and reporting for evaluating the
flood susceptibility model against independent historical flood references
(NDEM/NRSC flood inundation, INDOFLOODS gauge network, CWC/MHA loss records).
"""

from .config import ValidationConfig, get_validation_config
from .metrics import (
    compute_roc_auc,
    compute_pr_auc_with_prevalence,
    compute_spearman,
    compute_threshold_classification,
    compute_block_bootstrap_ci,
    compute_tercile_breakdown,
    compute_region_breakdown,
)
from .alignment import (
    filter_quality_flag,
    filter_permanent_water,
    compute_coverage_frequency,
    assign_h3_parent_blocks,
    assign_regional_split,
    build_alignment_dataset,
)
from .baselines import (
    compute_hand_baseline,
    compute_frequency_baseline,
    compute_distance_to_river_baseline,
    compute_random_baseline,
    attach_all_baselines,
)
from .report import (
    validate_metrics_payload,
    generate_markdown_summary,
    save_validation_report,
)
from .reference_ndem import (
    load_ndem_polygons,
    rasterize_flood_polygons,
    extract_zonal_fractions_from_raster,
    build_ndem_reference_dataset,
)
from .reference_indofloods import (
    load_indofloods_metadata,
    load_indofloods_events,
    find_stations_near_bbox,
    audit_district_gauge_gaps,
    verify_wayanad_gauge_locations,
    compute_reach_correlation,
    compute_scene_date_temporal_check,
)
from .checks_ndem import run_ndem_validation
from .checks_indofloods import run_indofloods_validation
from .reference_losses import (
    load_cwc_losses,
    load_mha_losses,
    calculate_series_percentile,
    evaluate_district_loss_context,
)
from .checks_losses import run_losses_validation

__all__ = [
    "ValidationConfig",
    "get_validation_config",
    "compute_roc_auc",
    "compute_pr_auc_with_prevalence",
    "compute_spearman",
    "compute_threshold_classification",
    "compute_block_bootstrap_ci",
    "compute_tercile_breakdown",
    "compute_region_breakdown",
    "filter_quality_flag",
    "filter_permanent_water",
    "compute_coverage_frequency",
    "assign_h3_parent_blocks",
    "assign_regional_split",
    "build_alignment_dataset",
    "compute_hand_baseline",
    "compute_frequency_baseline",
    "compute_distance_to_river_baseline",
    "compute_random_baseline",
    "attach_all_baselines",
    "validate_metrics_payload",
    "generate_markdown_summary",
    "save_validation_report",
    "load_ndem_polygons",
    "rasterize_flood_polygons",
    "extract_zonal_fractions_from_raster",
    "build_ndem_reference_dataset",
    "load_indofloods_metadata",
    "load_indofloods_events",
    "find_stations_near_bbox",
    "audit_district_gauge_gaps",
    "verify_wayanad_gauge_locations",
    "compute_reach_correlation",
    "compute_scene_date_temporal_check",
    "run_ndem_validation",
    "run_indofloods_validation",
    "load_cwc_losses",
    "load_mha_losses",
    "calculate_series_percentile",
    "evaluate_district_loss_context",
    "run_losses_validation",
]
