"""Milestone D Runner: End-to-End Step 9 (Flood Susceptibility) for any registered district.

Combines empirical inundation frequency (Step 7) and terrain HAND (Step 8) into the
final flood-susceptibility raster and confidence layer:
  - Applies FR-3.17 hard-zero exclusion mask.
  - Normalizes HAND using percentile-based method (P99).
  - Computes S_f = 0.5 * F + 0.5 * H_hand.
  - Computes confidence = min(1, n_valid / 30).
  - Exports GeoTIFFs, metadata.yaml, and 6-panel verification preview.

Reads the district's Milestone B and C outputs; no network I/O.

Usage:
    uv run python -m pipeline.hazard.flood.run_milestone_d <district>
"""

from pathlib import Path
from datetime import datetime, timezone
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import numpy as np
import rasterio
import yaml

from pipeline.hazard.flood.districts import DistrictConfig
from pipeline.hazard.flood.milestone_common import (
    MilestonePaths,
    build_parser,
    print_banner,
    require_inputs,
    resolve_district,
)
from pipeline.hazard.flood.water_mask import save_raster_geotiff
from pipeline.hazard.flood.susceptibility import (
    normalize_hand_percentile,
    combine_susceptibility,
    compute_confidence,
    DEFAULT_W_FREQ,
    DEFAULT_W_HAND,
    DEFAULT_HAND_CLIP_PERCENTILE,
    DEFAULT_OBSERVATION_CEILING,
)
from pipeline.hazard.flood.hand_terrain import (
    DEFAULT_HARD_ZERO_HAND_THRESHOLD_M,
    DEFAULT_HARD_ZERO_SLOPE_THRESHOLD_DEG,
)


def load_raster(path: Path) -> tuple[np.ndarray, rasterio.Affine, str]:
    """Load a single-band raster and return (data, transform, crs)."""
    with rasterio.open(path) as src:
        return src.read(1), src.transform, str(src.crs)


def main(argv: list[str] | None = None):
    parser = build_parser("Milestone D (Step 9): combine inundation frequency and HAND into susceptibility")
    args = parser.parse_args(argv)
    cfg = resolve_district(args)
    paths = MilestonePaths(cfg)

    print_banner("Milestone D (Step 9)", cfg, task="Combine Inundation Frequency + HAND → Flood Susceptibility")

    frequency_tif = paths.frequency("inundation_frequency")
    valid_obs_tif = paths.frequency("valid_observation_count")
    cropland_tif = paths.frequency("cropland_fraction")
    hand_tif = paths.hand("hand")
    hard_zero_tif = paths.hand("hard_zero_mask")
    require_inputs(frequency_tif, valid_obs_tif, produced_by="run_milestone_b", district=cfg)
    require_inputs(hand_tif, hard_zero_tif, produced_by="run_milestone_c", district=cfg)

    out_dir = paths.susceptibility_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    s1_record = paths.read_frequency_meta()

    # -----------------------------------------------------------------
    # 1. Load all input rasters
    # -----------------------------------------------------------------
    print("\n[1/6] Loading cached input rasters (no network I/O)...")

    frequency, master_transform, master_crs = load_raster(frequency_tif)
    print(f"  [+] Inundation Frequency: {frequency.shape}, valid={np.sum(np.isfinite(frequency)):,}")

    valid_obs, _, _ = load_raster(valid_obs_tif)
    print(f"  [+] Valid Observation Count: range [{valid_obs.min()}, {valid_obs.max()}]")

    cropland_fraction = None
    if cropland_tif.exists():
        cropland_fraction, _, _ = load_raster(cropland_tif)
        print(f"  [+] Cropland Fraction (ESA WorldCover v200): mean={np.nanmean(cropland_fraction):.3f}, >50% crop={np.sum(cropland_fraction > 0.5):,} px")
        # Save a copy in susceptibility directory for downstream bundling
        save_raster_geotiff(paths.susceptibility("cropland_fraction"), cropland_fraction, master_transform, master_crs, nodata=np.nan, dtype="float32")

    hand_m, hand_transform, _ = load_raster(hand_tif)
    print(f"  [+] HAND: valid={np.sum(np.isfinite(hand_m)):,}, range [{np.nanmin(hand_m):.2f}m, {np.nanmax(hand_m):.2f}m]")

    # B and C each build their own master grid; a different --resolution between
    # them would silently misalign every pixel.
    if hand_m.shape != frequency.shape or not hand_transform.almost_equals(master_transform):
        raise ValueError(
            f"Milestone B grid {frequency.shape} and Milestone C grid {hand_m.shape} for {cfg.name} "
            "do not align; re-run both with the same --resolution."
        )

    hard_zero_raw, _, _ = load_raster(hard_zero_tif)
    # Hard-zero mask: 0 = eligible, 1 = excluded, 255 = nodata
    eligible_mask = (hard_zero_raw == 0)
    hard_zero_count = np.sum(hard_zero_raw == 1)
    print(f"  [+] Hard-Zero Mask: eligible={np.sum(eligible_mask):,}, excluded={hard_zero_count:,}")

    master_shape = frequency.shape
    resolution_m = float(abs(master_transform.a))

    # -----------------------------------------------------------------
    # 2. Normalize HAND (Percentile-based, P99)
    # -----------------------------------------------------------------
    print(f"\n[2/6] Normalizing HAND (percentile-based, P{DEFAULT_HAND_CLIP_PERCENTILE:.0f})...")

    hand_normalized, p99_value = normalize_hand_percentile(
        hand_m,
        eligible_mask,
        clip_percentile=DEFAULT_HAND_CLIP_PERCENTILE,
    )

    valid_hn = np.isfinite(hand_normalized)
    print(f"  [+] P{DEFAULT_HAND_CLIP_PERCENTILE:.0f} normalization ceiling: {p99_value:.2f} m")
    print(f"  [+] H_hand range: [{np.nanmin(hand_normalized):.4f}, {np.nanmax(hand_normalized):.4f}]")
    print(f"  [+] H_hand mean: {np.nanmean(hand_normalized):.4f}, median: {np.nanmedian(hand_normalized):.4f}")

    # -----------------------------------------------------------------
    # 3. Combine S_f = w_F * F + w_H * H_hand
    # -----------------------------------------------------------------
    w_f = DEFAULT_W_FREQ
    w_h = DEFAULT_W_HAND
    print(f"\n[3/6] Computing Flood Susceptibility: S_f = {w_f}*F + {w_h}*H_hand...")

    susceptibility = combine_susceptibility(
        frequency=frequency,
        hand_normalized=hand_normalized,
        eligible_mask=eligible_mask,
        w_freq=w_f,
        w_hand=w_h,
    )

    valid_s = np.isfinite(susceptibility)
    nonzero_s = (susceptibility > 0) & valid_s
    zero_s = (susceptibility == 0.0) & valid_s

    print(f"  [+] Valid susceptibility pixels: {np.sum(valid_s):,}")
    print(f"  [+] Non-zero susceptibility: {np.sum(nonzero_s):,} ({np.sum(nonzero_s)/np.sum(valid_s)*100:.1f}%)")
    print(f"  [+] Hard-zero susceptibility: {np.sum(zero_s):,} ({np.sum(zero_s)/np.sum(valid_s)*100:.2f}%)")
    print(f"  [+] S_f range: [{np.nanmin(susceptibility):.4f}, {np.nanmax(susceptibility):.4f}]")
    print(f"  [+] S_f mean: {np.nanmean(susceptibility):.4f}, median: {np.nanmedian(susceptibility):.4f}")

    # Export susceptibility GeoTIFF
    susc_path = paths.susceptibility("flood_susceptibility")
    save_raster_geotiff(susc_path, susceptibility, master_transform, master_crs, nodata=np.nan, dtype="float32")
    print(f"  [+] Exported: {susc_path}")

    # -----------------------------------------------------------------
    # 4. Compute Confidence Layer
    # -----------------------------------------------------------------
    print(f"\n[4/6] Computing Confidence Layer: min(1, n_valid / {DEFAULT_OBSERVATION_CEILING})...")

    confidence = compute_confidence(
        valid_observation_count=valid_obs,
        eligible_mask=eligible_mask,
        observation_ceiling=DEFAULT_OBSERVATION_CEILING,
    )

    valid_c = np.isfinite(confidence) & (confidence > 0)
    print(f"  [+] Confidence range: [{np.nanmin(confidence):.4f}, {np.nanmax(confidence):.4f}]")
    print(f"  [+] Confidence mean: {np.nanmean(confidence[eligible_mask]):.4f}")
    print(f"  [+] Pixels with max confidence (n≥30): {np.sum(confidence >= 1.0):,}")

    conf_path = paths.susceptibility("confidence")
    save_raster_geotiff(conf_path, confidence, master_transform, master_crs, nodata=np.nan, dtype="float32")
    print(f"  [+] Exported: {conf_path}")

    # -----------------------------------------------------------------
    # 5. Write metadata.yaml
    # -----------------------------------------------------------------
    print("\n[5/6] Writing auditable metadata manifest...")

    metadata = {
        "model_version": "flood-susceptibility-v0.1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "pilot_aoi": f"{cfg.name}, {cfg.state}",
        "district_key": cfg.key,
        "lgd_code": cfg.lgd_code,
        "river_basin": cfg.river_basin,
        "pilot_aoi_bbox_wgs84": list(cfg.bbox_wgs84),
        "master_grid": {
            "crs": master_crs,
            "resolution_m": resolution_m,
            "shape": list(master_shape),
        },
        "sentinel1": {
            "collection": "sentinel-1-rtc (Microsoft Planetary Computer)",
            "observation_period": s1_record.get("observation_period"),
            "num_scenes": s1_record.get("num_scenes"),
            "polarization": "VV",
        },
        "water_detection": {
            "method": "VV dB threshold",
            "threshold_db": s1_record.get("threshold_db"),
        },
        "permanent_water": {
            "source": "JRC Global Surface Water v1.5 (1984-2024)",
            "occurrence_threshold_pct": s1_record.get("occurrence_threshold_pct"),
        },
        "cropland": {
            "source": "ESA WorldCover 10m 2021 (v200)",
            "treatment": "flagged",
            "mean_cropland_fraction": round(float(np.nanmean(cropland_fraction)), 4) if cropland_fraction is not None else None,
            "heavy_cropland_pixels_gt_50pct": int(np.sum(cropland_fraction > 0.5)) if cropland_fraction is not None else None,
        },
        "hand": {
            "source": "ASF GLO-30 HAND v1/2021",
            "dem": "Copernicus GLO-30 (2021)",
            "method": "HydroSAR/PySheds (ASF continental basin processing)",
            "flow_accumulation_threshold": "N/A (pre-computed)",
        },
        "hard_zero_fr317": {
            "hand_threshold_m": DEFAULT_HARD_ZERO_HAND_THRESHOLD_M,
            "slope_threshold_deg": DEFAULT_HARD_ZERO_SLOPE_THRESHOLD_DEG,
        },
        "normalization": {
            "hand_method": "percentile-based",
            "hand_clip_percentile": DEFAULT_HAND_CLIP_PERCENTILE,
            "hand_clip_value_m": round(float(p99_value), 2),
            "formula": "H_hand = 1 - clip(HAND / P99, 0, 1)",
        },
        "combination": {
            "formula": "S_f = w_F * F + w_H * H_hand",
            "w_F": w_f,
            "w_H": w_h,
            "rationale": "Equal weighting baseline",
        },
        "confidence": {
            "formula": "min(1, n_valid / 30)",
            "observation_ceiling": DEFAULT_OBSERVATION_CEILING,
        },
        "results_summary": {
            "total_pixels": int(master_shape[0] * master_shape[1]),
            "valid_susceptibility_pixels": int(np.sum(valid_s)),
            "flood_eligible_pixels": int(np.sum(eligible_mask)),
            "hard_zero_pixels": int(np.sum(zero_s)),
            "mean_susceptibility": round(float(np.nanmean(susceptibility)), 4),
            "median_susceptibility": round(float(np.nanmedian(susceptibility)), 4),
            "max_susceptibility": round(float(np.nanmax(susceptibility)), 4),
            "mean_confidence_eligible": round(float(np.nanmean(confidence[eligible_mask])), 4),
        },
        "licences_and_attribution": [
            "Copernicus Sentinel-1 data, MSPC RTC (CC BY 4.0)",
            "ASF GLO-30 HAND (CC0 1.0, derived from Copernicus GLO-30)",
            "Copernicus DEM GLO-30 (Copernicus licence)",
            "JRC Global Surface Water (Copernicus, unrestricted)",
            "ESA WorldCover 10m 2021 (CC BY 4.0)",
        ],
    }

    meta_path = paths.susceptibility("metadata", ".yaml")
    with open(meta_path, "w", encoding="utf-8") as f:
        yaml.dump(metadata, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
    print(f"  [+] Exported: {meta_path}")

    # -----------------------------------------------------------------
    # 6. Generate 6-Panel Verification Preview
    # -----------------------------------------------------------------
    print("\n[6/6] Generating Milestone D Verification Preview PNG...")

    preview_path = paths.susceptibility("milestone_d_preview", ".png")
    generate_milestone_d_preview(
        frequency=frequency,
        hand_m=hand_m,
        hand_normalized=hand_normalized,
        susceptibility=susceptibility,
        confidence=confidence,
        eligible_mask=eligible_mask,
        p99_value=p99_value,
        w_f=w_f,
        w_h=w_h,
        cfg=cfg,
        out_path=preview_path,
    )
    print(f"  [+] Exported: {preview_path}")

    # -----------------------------------------------------------------
    # Cross-Validation Summary
    # -----------------------------------------------------------------
    print("\n" + "-" * 75)
    print("Cross-Validation Check:")
    high_susc = (susceptibility > 0.5) & np.isfinite(susceptibility)
    if np.sum(high_susc) > 0:
        print(f"  Pixels with S_f > 0.5: {np.sum(high_susc):,}")
        print(f"  Mean HAND for S_f > 0.5: {np.nanmean(hand_m[high_susc]):.2f} m (expect < 2m)")
        print(f"  Mean F for S_f > 0.5: {np.nanmean(frequency[high_susc]):.4f} (expect > 0.15)")
    else:
        print("  No pixels exceed S_f > 0.5")

    print("\n" + "=" * 75)
    print(f"Milestone D (Step 9: Flood Susceptibility Combination) completed for {cfg.name}!")
    print("=" * 75)


def generate_milestone_d_preview(
    frequency: np.ndarray,
    hand_m: np.ndarray,
    hand_normalized: np.ndarray,
    susceptibility: np.ndarray,
    confidence: np.ndarray,
    eligible_mask: np.ndarray,
    p99_value: float,
    w_f: float,
    w_h: float,
    cfg: DistrictConfig,
    out_path: Path,
):
    """Render a 6-panel visual validation summary of Milestone D outputs."""
    fig, axes = plt.subplots(2, 3, figsize=(27, 16), dpi=150)

    # Panel 1: Inundation Frequency F(x,y)
    freq_display = np.ma.masked_invalid(frequency)
    im1 = axes[0, 0].imshow(freq_display, cmap="magma", vmin=0.0, vmax=1.0)
    axes[0, 0].set_title("1. Inundation Frequency $F(x,y)$\n(Step 7: Sentinel-1 SAR Stack)", fontsize=11, fontweight="bold")
    axes[0, 0].axis("off")
    plt.colorbar(im1, ax=axes[0, 0], fraction=0.046, pad=0.04).set_label("Frequency [0–1]")

    # Panel 2: Raw HAND
    hand_display = np.ma.masked_invalid(hand_m)
    im2 = axes[0, 1].imshow(hand_display, cmap="Blues_r", vmin=0.0, vmax=40.0)
    axes[0, 1].set_title("2. HAND (m, Raw)\n(Step 8: ASF GLO-30)", fontsize=11, fontweight="bold")
    axes[0, 1].axis("off")
    plt.colorbar(im2, ax=axes[0, 1], fraction=0.046, pad=0.04).set_label("HAND (m)")

    # Panel 3: Normalized HAND H_hand
    hn_display = np.ma.masked_invalid(hand_normalized)
    im3 = axes[0, 2].imshow(hn_display, cmap="YlOrRd", vmin=0.0, vmax=1.0)
    axes[0, 2].set_title(f"3. Normalized HAND $H_{{hand}}$\n(P{DEFAULT_HAND_CLIP_PERCENTILE:.0f} = {p99_value:.2f}m; Low HAND → High Value)", fontsize=11, fontweight="bold")
    axes[0, 2].axis("off")
    plt.colorbar(im3, ax=axes[0, 2], fraction=0.046, pad=0.04).set_label("$H_{hand}$ [0–1]")

    # Panel 4: Final Flood Susceptibility S_f
    susc_display = np.ma.masked_invalid(susceptibility)
    cmap_susc = plt.cm.RdYlGn_r.copy()
    im4 = axes[1, 0].imshow(susc_display, cmap=cmap_susc, vmin=0.0, vmax=1.0)
    axes[1, 0].set_title(f"4. Flood Susceptibility $S_f$\n($S_f = {w_f}F + {w_h}H_{{hand}}$; Hard Zero at HAND>30m|Slope>15°)", fontsize=11, fontweight="bold")
    axes[1, 0].axis("off")
    plt.colorbar(im4, ax=axes[1, 0], fraction=0.046, pad=0.04).set_label("Susceptibility [0–1]")

    # Panel 5: Confidence Layer
    conf_display = np.ma.masked_invalid(confidence)
    im5 = axes[1, 1].imshow(conf_display, cmap="viridis", vmin=0.0, vmax=1.0)
    axes[1, 1].set_title(f"5. Confidence Layer\n(min(1, $n_{{valid}}$ / {DEFAULT_OBSERVATION_CEILING}))", fontsize=11, fontweight="bold")
    axes[1, 1].axis("off")
    plt.colorbar(im5, ax=axes[1, 1], fraction=0.046, pad=0.04).set_label("Confidence [0–1]")

    # Panel 6: Susceptibility Histogram
    susc_eligible = susceptibility[eligible_mask & np.isfinite(susceptibility)]
    axes[1, 2].hist(susc_eligible, bins=100, color="#2b83ba", edgecolor="none", alpha=0.85, density=True)
    for p, c, ls in [(50, "#e66101", "--"), (90, "#d7191c", "-"), (99, "#b2182b", "-.")]:
        pval = np.percentile(susc_eligible, p)
        axes[1, 2].axvline(pval, color=c, linestyle=ls, linewidth=1.5, label=f"P{p} = {pval:.3f}")
    axes[1, 2].set_xlabel("Flood Susceptibility $S_f$", fontsize=11)
    axes[1, 2].set_ylabel("Density", fontsize=11)
    axes[1, 2].set_title("6. Susceptibility Distribution (Eligible Domain)\nWith Percentile Markers", fontsize=11, fontweight="bold")
    axes[1, 2].legend(fontsize=9, loc="upper right")
    axes[1, 2].set_xlim(0, 1)

    plt.suptitle(
        f"SETU-DRR Flood Susceptibility Pipeline — Milestone D (Step 9: Combination) — {cfg.name}",
        fontsize=15, fontweight="bold", y=0.99,
    )
    plt.tight_layout()
    plt.savefig(out_path, bbox_inches="tight")
    plt.close()


if __name__ == "__main__":
    main()
