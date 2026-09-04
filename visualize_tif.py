import os
import rasterio
from rasterio.windows import from_bounds
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import LogNorm

# 1. Path to your raster file
TIF_FILE = "landscan-global-2024.tif"

if not os.path.exists(TIF_FILE):
    print(f"❌ Could not find {TIF_FILE}")
    exit()

print("📂 Reading raster data...")

with rasterio.open(TIF_FILE) as src:
    # 2. Define your area of interest (Bounding Box: [Min Lon, Min Lat, Max Lon, Max Lat])
    # For all India:
    bbox = [68.1, 6.7, 97.4, 35.5]
    
    # 💡 TIP: For Wayanad pilot district only, uncomment the line below:
    # bbox = [75.75, 11.45, 76.45, 11.95]

    # Convert lat/lon bounds to raster window
    window = from_bounds(*bbox, transform=src.transform)
    pop_data = src.read(1, window=window)

    # 3. Clean up NoData / Zero values for log plotting
    nodata_val = src.nodata
    if nodata_val is not None:
        pop_data = np.where(pop_data == nodata_val, 0, pop_data)

    # Replace 0 or negative numbers with NaN so log scale doesn't throw a warning
    pop_data_masked = np.where(pop_data <= 0, np.nan, pop_data)

    print("🎨 Rendering map...")
    
    # 4. Set up the matplotlib figure
    plt.figure(figsize=(12, 10))
    
    # Use LogNorm so low-density rural areas are visible alongside high-density cities
    im = plt.imshow(
        pop_data_masked,
        cmap="inferno",  # "inferno", "viridis", "YlOrRd", or "hot" look great
        norm=LogNorm(vmin=1, vmax=np.nanmax(pop_data_masked))
    )

    # 5. Add colorbar legend and labels
    cbar = plt.colorbar(im, fraction=0.035, pad=0.04)
    cbar.set_label("Population Count per Pixel (Log Scale)", fontsize=11, fontweight="bold")

    plt.title("Population Density Map (LandScan 2024)", fontsize=14, fontweight="bold")
    plt.axis("off")  # Turn off pixel coordinate axes

    # 6. Save image to disk
    output_image = "population_map.png"
    plt.savefig(output_image, dpi=300, bbox_inches="tight")
    print(f"✅ Map image successfully saved as '{output_image}'!")

    # 7. Pop up the map window
    plt.show()