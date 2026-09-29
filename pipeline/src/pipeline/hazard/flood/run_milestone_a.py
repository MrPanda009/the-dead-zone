"""Milestone A Runner: End-to-End Steps 1–4 for any registered district.

Executes:
  - Step 1: Define the district AOI boundary & save GeoJSON.
  - Step 2: Query Microsoft Planetary Computer STAC for Sentinel-1 RTC scenes.
  - Step 3: Stream and window-clip VV backscatter COG raster.
  - Step 4: Convert to dB, threshold, and export binary water mask GeoTIFF & preview PNG.

Usage:
    uv run python -m pipeline.hazard.flood.run_milestone_a <district> [--datetime-range A/B]
"""

from pathlib import Path
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import numpy as np

from pipeline.hazard.flood.aoi import save_boundary
from pipeline.hazard.flood.districts import DistrictConfig
from pipeline.hazard.flood.milestone_common import (
    MilestonePaths,
    build_parser,
    print_banner,
    resolve_district,
)
from pipeline.hazard.flood.stac import query_sentinel1_rtc, extract_scene_metadata
from pipeline.hazard.flood.water_mask import (
    stream_and_clip_raster,
    linear_to_db,
    detect_water,
    save_raster_geotiff,
    DEFAULT_VV_WATER_THRESHOLD_DB,
)


def main(argv: list[str] | None = None):
    parser = build_parser("Milestone A (Steps 1-4): AOI, Sentinel-1 discovery and single-scene water mask")
    parser.add_argument("--datetime-range", default=None,
                        help="ISO8601 interval for the STAC query (default: the district's S1 window)")
    parser.add_argument("--threshold-db", type=float, default=DEFAULT_VV_WATER_THRESHOLD_DB,
                        help="VV backscatter water threshold in dB")
    args = parser.parse_args(argv)
    cfg = resolve_district(args)
    paths = MilestonePaths(cfg)
    datetime_range = args.datetime_range or cfg.s1_datetime_range

    print_banner("Milestone A (Steps 1-4)", cfg, width=70)

    # -------------------------------------------------------------
    # Step 1: Define and save AOI boundary
    # -------------------------------------------------------------
    print(f"\n[Step 1] Initializing {cfg.name} AOI boundary...")
    boundary_path = save_boundary(cfg, paths.boundary_geojson)
    print(f"  [+] Saved AOI boundary to: {boundary_path}")

    # -------------------------------------------------------------
    # Step 2: Query Sentinel-1 RTC scenes
    # -------------------------------------------------------------
    print("\n[Step 2] Querying Sentinel-1 RTC STAC catalog (Planetary Computer)...")
    scenes = query_sentinel1_rtc(bbox=cfg.bbox_wgs84, datetime_range=datetime_range)
    print(f"  [+] Found {len(scenes)} scenes in {datetime_range} window.")

    if not scenes:
        raise RuntimeError(f"No Sentinel-1 RTC scenes found for {cfg.name} in {datetime_range}.")

    selected_item = scenes[0]
    meta = extract_scene_metadata(selected_item)
    print(f"  [+] Selected Scene: {meta['id']}")
    print(f"    Date: {meta['datetime']}")
    print(f"    VV Asset URL: {meta['vv_href'][:80]}...")

    # -------------------------------------------------------------
    # Step 3: Stream and Clip VV Backscatter Raster
    # -------------------------------------------------------------
    print("\n[Step 3] Streaming & window-clipping VV raster directly from cloud...")
    raw_vv, transform, crs, nodata_val = stream_and_clip_raster(meta["vv_href"], bbox_wgs84=cfg.bbox_wgs84)
    print(f"  [+] Clipped Shape: {raw_vv.shape[0]} rows x {raw_vv.shape[1]} cols")
    print(f"  [+] Coordinate Reference System: {crs}")
    print(f"  [+] Pixel Resolution: {abs(transform.a):.1f}m x {abs(transform.e):.1f}m")

    # Convert linear power to dB
    vv_db, valid_mask = linear_to_db(raw_vv, nodata_val=nodata_val)
    valid_count = np.sum(valid_mask)
    print(f"  [+] Valid pixel observations: {valid_count:,} / {raw_vv.size:,} ({valid_count / raw_vv.size * 100:.1f}%)")

    # -------------------------------------------------------------
    # Step 4: Generate Water Mask
    # -------------------------------------------------------------
    print("\n[Step 4] Computing SAR binary water mask...")
    threshold_db = args.threshold_db
    print(f"  [+] Applying VV backscatter threshold: < {threshold_db} dB")

    water_mask = detect_water(vv_db, valid_mask, threshold_db=threshold_db)

    water_pixels = np.sum(water_mask == 1)
    land_pixels = np.sum(water_mask == 0)
    invalid_pixels = np.sum(water_mask == 255)

    pixel_area_km2 = (abs(transform.a) * abs(transform.e)) / 1e6
    water_area_km2 = water_pixels * pixel_area_km2
    land_area_km2 = land_pixels * pixel_area_km2

    print(f"  [+] Water / Inundated pixels: {water_pixels:,} ({water_area_km2:.2f} km2)")
    print(f"  [+] Land / Non-water pixels:   {land_pixels:,} ({land_area_km2:.2f} km2)")
    print(f"  [+] Invalid / Out-of-swath:    {invalid_pixels:,}")

    # Save output GeoTIFF (prefixed: one scene can cover several districts)
    out_dir = paths.water_masks_dir
    scene_stem = f"{cfg.file_prefix}_{meta['id']}"
    geotiff_path = out_dir / f"{scene_stem}_water_mask.tif"
    save_raster_geotiff(geotiff_path, water_mask, transform, crs)
    print(f"  [+] Exported Water Mask GeoTIFF to: {geotiff_path}")

    # Generate visual validation preview PNG
    preview_png_path = out_dir / f"{scene_stem}_preview.png"
    generate_preview(vv_db, water_mask, meta["id"], meta["datetime"], cfg, preview_png_path)
    print(f"  [+] Exported Verification Preview PNG to: {preview_png_path}")

    print("\n" + "=" * 70)
    print(f"Milestone A completed successfully for {cfg.name}!")
    print("=" * 70)


def generate_preview(
    vv_db: np.ndarray,
    water_mask: np.ndarray,
    scene_id: str,
    scene_date: str,
    cfg: DistrictConfig,
    out_path: Path,
):
    """Generate side-by-side plot of SAR backscatter (dB) and binary water mask."""
    fig, axes = plt.subplots(1, 2, figsize=(16, 8), dpi=150)

    # Panel 1: SAR VV Backscatter (dB)
    vv_display = np.ma.masked_invalid(vv_db)
    im1 = axes[0].imshow(vv_display, cmap="gray", vmin=-25, vmax=-5)
    axes[0].set_title(f"Sentinel-1 RTC VV Backscatter (dB)\n{scene_date[:10]}", fontsize=12, fontweight="bold")
    axes[0].axis("off")
    cbar1 = plt.colorbar(im1, ax=axes[0], fraction=0.046, pad=0.04)
    cbar1.set_label("Backscatter (dB)", fontsize=10)

    # Panel 2: Water Mask
    # Colormap: 0=lightgreen (land), 1=deep skyblue (water), 2=dark slate (nodata)
    cmap_mask = mcolors.ListedColormap(["#d1e7dd", "#0d6efd", "#212529"])
    norm = mcolors.BoundaryNorm([-0.5, 0.5, 1.5, 2.5], cmap_mask.N)

    # Remap 255 to 2 for discrete indexing in colormap
    disp_mask = np.zeros_like(water_mask, dtype=np.uint8)
    disp_mask[water_mask == 0] = 0
    disp_mask[water_mask == 1] = 1
    disp_mask[water_mask == 255] = 2

    im2 = axes[1].imshow(disp_mask, cmap=cmap_mask, norm=norm)
    axes[1].set_title("Detected Surface Water Mask\n(Blue: Water, Green: Land, Dark: Nodata)", fontsize=12, fontweight="bold")
    axes[1].axis("off")

    cbar2 = plt.colorbar(im2, ax=axes[1], ticks=[0, 1, 2], fraction=0.046, pad=0.04)
    cbar2.ax.set_yticklabels(["Land (0)", "Water (1)", "Nodata (255)"], fontsize=10)

    plt.suptitle(f"{cfg.name} ({cfg.river_basin}) — Scene: {scene_id[:35]}...", fontsize=14, y=0.98)
    plt.tight_layout()
    plt.savefig(out_path, bbox_inches="tight")
    plt.close()


if __name__ == "__main__":
    main()
