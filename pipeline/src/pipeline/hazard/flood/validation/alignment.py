"""Alignment, masking, and spatial blocking for flood validation.

Resolves critical spike issues (§2.2, §3):
- Excludes permanent water bodies (e.g. >1% water fraction) to eliminate river-channel distortion.
- Respects observation coverage: does not treat un-imaged years or footprints as dry.
- Partitions cells into spatial parent blocks (H3 res-5) for block bootstrapping.
- Partitions cells into regional blocks (North vs South) for spatial holdout analysis.
- Filters quality flags to ensure only high-fidelity model cells are scored.
"""

from __future__ import annotations

import math
from typing import Any, Tuple
import h3
import numpy as np
import pandas as pd


def filter_quality_flag(
    df: pd.DataFrame,
    flag_col: str = "quality_flag",
    required_flag: str = "full",
) -> Tuple[pd.DataFrame, int]:
    """Filter model cells to only include those meeting the quality threshold.

    Args:
        df: Input model DataFrame.
        flag_col: Name of quality flag column.
        required_flag: Desired flag value (default 'full').

    Returns:
        Tuple of (filtered_df, n_excluded_non_full).
    """
    if flag_col not in df.columns:
        return df.copy(), 0

    mask = df[flag_col] == required_flag
    n_excluded = int((~mask).sum())
    return df[mask].copy(), n_excluded


def filter_permanent_water(
    df: pd.DataFrame,
    water_fraction_col: str = "permanent_water_fraction",
    max_water_fraction: float = 0.01,
) -> Tuple[pd.DataFrame, int]:
    """Exclude cells dominated by permanent water bodies (e.g. Brahmaputra mainstem).

    Fixes spike finding §3: Permanent water cells invert model correlation.
    Cells with permanent water fraction > max_water_fraction are dropped.

    Args:
        df: Input DataFrame.
        water_fraction_col: Column with permanent water fraction in [0.0, 1.0].
        max_water_fraction: Maximum allowable water fraction (default 0.01 = 1%).

    Returns:
        Tuple of (filtered_df, n_excluded_permanent_water).
    """
    if water_fraction_col not in df.columns:
        return df.copy(), 0

    water_vals = df[water_fraction_col].fillna(0.0).to_numpy()
    mask = water_vals <= max_water_fraction
    n_excluded = int((~mask).sum())
    return df[mask].copy(), n_excluded


def filter_baseline_water(
    df: pd.DataFrame,
    baseline_fraction_col: str = "baseline_water_fraction",
    max_baseline_fraction: float = 0.01,
) -> Tuple[pd.DataFrame, int]:
    """Exclude cells dominated by seasonal / quasi-channel baseline water (Priority 1).

    Per Barpeta Flood Validation Analysis (§3 Priority 1):
    Excludes quasi-channel and dynamic char cells with recurring baseline water
    to isolate true terrestrial floodplains from the active riverbed corridor.

    Args:
        df: Input DataFrame.
        baseline_fraction_col: Column with baseline water fraction in [0.0, 1.0].
        max_baseline_fraction: Maximum allowable baseline water fraction (default 0.01 = 1%).

    Returns:
        Tuple of (filtered_df, n_excluded_baseline_water).
    """
    if baseline_fraction_col not in df.columns:
        return df.copy(), 0

    water_vals = df[baseline_fraction_col].fillna(0.0).to_numpy()
    mask = water_vals <= max_baseline_fraction
    n_excluded = int((~mask).sum())
    return df[mask].copy(), n_excluded



def compute_coverage_frequency(
    yearly_flooded_counts: np.ndarray | pd.Series,
    yearly_coverage_counts: np.ndarray | pd.Series,
) -> np.ndarray:
    """Compute true reference flood frequency normalized by valid coverage years.

    Fixes spike bug §2.2: Treats un-imaged years as unobserved, not dry (0.0).
    Formula: ref_flood_frequency = years_flooded / years_with_coverage.
    Cells with 0 coverage years evaluate to NaN.

    Args:
        yearly_flooded_counts: Number of years cell was recorded as flooded.
        yearly_coverage_counts: Number of years sensor/reference imaged the cell.

    Returns:
        1D float array of true flood frequencies in [0.0, 1.0], with NaN for 0-coverage.
    """
    flooded = np.asarray(yearly_flooded_counts, dtype=float)
    coverage = np.asarray(yearly_coverage_counts, dtype=float)

    if len(flooded) != len(coverage):
        raise ValueError(
            f"Length mismatch: len(flooded)={len(flooded)} vs len(coverage)={len(coverage)}"
        )

    # Valid where coverage > 0
    valid_mask = (coverage > 0) & (~np.isnan(coverage)) & (~np.isnan(flooded))

    freq = np.full(len(flooded), fill_value=np.nan, dtype=float)
    freq[valid_mask] = np.clip(flooded[valid_mask] / coverage[valid_mask], 0.0, 1.0)
    return freq


def assign_h3_parent_blocks(
    df: pd.DataFrame,
    h3_col: str = "h3_hex",
    parent_res: int = 5,
    output_col: str = "parent_block",
) -> pd.DataFrame:
    """Assign spatial parent block IDs (e.g. H3 res-5) for block bootstrapping.

    Args:
        df: Input DataFrame containing H3 cell indices.
        h3_col: Column with H3 cell strings.
        parent_res: Resolution of parent cells (default 5 for res-8 cells).
        output_col: Name of column to store parent block ID.

    Returns:
        DataFrame copy with parent block column added.
    """
    out = df.copy()
    if h3_col not in out.columns or out.empty:
        out[output_col] = "block_0"
        return out

    def _to_parent(cell_id: str) -> str:
        try:
            return h3.cell_to_parent(cell_id, parent_res)
        except Exception:
            return "block_unknown"

    out[output_col] = out[h3_col].apply(_to_parent)
    return out


def assign_regional_split(
    df: pd.DataFrame,
    lat_col: str = "centroid_lat",
    output_col: str = "region_block",
) -> pd.DataFrame:
    """Partition cells into North and South halves based on median latitude.

    Supports spatial holdout testing (§2.2, §8 Phase 2) and diagnosing
    geographic performance asymmetries.

    Args:
        df: Input DataFrame.
        lat_col: Column containing latitude values.
        output_col: Name of column to store regional split.

    Returns:
        DataFrame copy with regional split ('north' / 'south').
    """
    out = df.copy()
    if lat_col not in out.columns or len(out) < 2:
        out[output_col] = "north"
        return out

    median_lat = float(out[lat_col].median())
    out[output_col] = np.where(out[lat_col] >= median_lat, "north", "south")
    return out


def build_alignment_dataset(
    model_df: pd.DataFrame,
    ref_df: pd.DataFrame,
    h3_col: str = "h3_hex",
    ref_flood_fraction_col: str = "ref_flood_fraction",
    water_fraction_col: str = "permanent_water_fraction",
    max_permanent_water_fraction: float = 0.01,
    required_quality_flag: str = "full",
    primary_threshold: float = 0.10,
    h3_block_res: int = 5,
    baseline_water_fraction_col: str | None = None,
    max_baseline_water_fraction: float = 0.01,
    use_baseline_water_filter: bool = False,
) -> Tuple[pd.DataFrame, dict[str, Any]]:
    """Join model cells with reference observations and apply masks and spatial blocks.

    Executes complete alignment pipeline:
    1. Inner join model cells with reference data by H3 cell ID.
    2. Filter to cells with required quality flag (e.g. 'full').
    3. Filter out permanent water cells (> max_permanent_water_fraction).
    4. Optional (Priority 1): Filter out seasonal baseline water cells (> max_baseline_water_fraction).
    5. Assign H3 res-5 spatial parent blocks.
    6. Assign North/South regional split.
    7. Derive binary evaluation label at primary_threshold.

    Args:
        model_df: Model predictions DataFrame.
        ref_df: Reference observations DataFrame.
        h3_col: H3 cell key column name.
        ref_flood_fraction_col: Column containing reference flood fraction.
        water_fraction_col: Column with permanent water fraction.
        max_permanent_water_fraction: Permanent water filter cutoff.
        required_quality_flag: Quality flag requirement (default 'full').
        primary_threshold: Flood fraction threshold for binary positive label.
        h3_block_res: Parent H3 resolution for spatial block bootstrap.
        baseline_water_fraction_col: Column with seasonal baseline water fraction.
        max_baseline_water_fraction: Baseline water filter cutoff.
        use_baseline_water_filter: Whether to apply baseline water exclusion.

    Returns:
        Tuple of (aligned_df, audit_metadata_dict).
    """
    # 1. Join
    if h3_col in model_df.columns and h3_col in ref_df.columns:
        # Avoid duplicate columns on merge
        cols_to_use = [c for c in ref_df.columns if c not in model_df.columns or c == h3_col]
        merged = pd.merge(model_df, ref_df[cols_to_use], on=h3_col, how="inner")
    else:
        merged = model_df.copy()

    total_joined = len(merged)

    # 2. Quality Flag filter
    filtered_q, n_excluded_non_full = filter_quality_flag(
        merged, required_flag=required_quality_flag
    )

    # 3. Permanent Water filter
    filtered_pw, n_excluded_pw = filter_permanent_water(
        filtered_q,
        water_fraction_col=water_fraction_col,
        max_water_fraction=max_permanent_water_fraction,
    )

    # 4. Baseline Water filter (Priority 1)
    if use_baseline_water_filter and baseline_water_fraction_col and baseline_water_fraction_col in filtered_pw.columns:
        filtered_bw, n_excluded_bw = filter_baseline_water(
            filtered_pw,
            baseline_fraction_col=baseline_water_fraction_col,
            max_baseline_fraction=max_baseline_water_fraction,
        )
    else:
        filtered_bw = filtered_pw
        n_excluded_bw = 0

    # 5. Spatial blocks
    with_blocks = assign_h3_parent_blocks(
        filtered_bw, h3_col=h3_col, parent_res=h3_block_res
    )

    # 6. Regional split
    aligned = assign_regional_split(with_blocks)

    # 7. Binary label
    if ref_flood_fraction_col in aligned.columns:
        aligned["y_true_binary"] = (
            aligned[ref_flood_fraction_col] >= primary_threshold
        ).astype(int)
        prevalence = float(aligned["y_true_binary"].mean())
    else:
        aligned["y_true_binary"] = 0
        prevalence = 0.0

    audit_meta = {
        "n_joined_cells": total_joined,
        "n_evaluated_cells": len(aligned),
        "n_excluded_non_full": n_excluded_non_full,
        "n_excluded_permanent_water": n_excluded_pw,
        "n_excluded_baseline_water": n_excluded_bw,
        "prevalence": prevalence,
        "primary_flood_threshold": primary_threshold,
        "max_permanent_water_fraction": max_permanent_water_fraction,
        "max_baseline_water_fraction": max_baseline_water_fraction,
    }

    return aligned, audit_meta

