import os
import geopandas as gpd
import rasterio
from rasterio.mask import mask
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import LogNorm

# --- CONFIGURATION ---
TIF_FILE = "landscan-global-2024.tif"
DISTRICTS_FILE = "2011_Dist.shp"     
DISTRICT_COLUMN = "DISTRICT"         

def main():
    if not os.path.exists(TIF_FILE) or not os.path.exists(DISTRICTS_FILE):
        print("❌ Error: Missing .tif or shapefile. Ensure files are in the same folder.")
        return

    # --- 🟢 NEW: INTERACTIVE SEARCH PROMPT ---
    print("\n" + "="*50)
    print("🌍 SETU-DRR: DISTRICT POPULATION PROFILER")
    print("="*50)
    
    district_name = input("Enter the name of the district (e.g., Barpeta, Wayanad): ").strip()
    
    if not district_name:
        print("❌ No district entered. Exiting.")
        return
    # -----------------------------------------

    print(f"\n🔍 Searching for '{district_name}' in boundaries...")
    
    # 1. Load the district boundaries
    districts = gpd.read_file(DISTRICTS_FILE)
    
    # Search case-insensitively
    target_district = districts[districts[DISTRICT_COLUMN].str.lower() == district_name.lower()]
    
    if target_district.empty:
        print(f"❌ Could not find '{district_name}'. Check spelling (e.g., 'Barpeta').")
        return
        
    print("✅ District found! Extracting shape...")
    geom = target_district.geometry.values

    # 2. Cookie-cut the raster
    print(f"✂️  Cookie-cutting the population data for {district_name.title()}...")
    with rasterio.open(TIF_FILE) as src:
        if districts.crs != src.crs:
            target_district = target_district.to_crs(src.crs)
            geom = target_district.geometry.values
            
        out_image, out_transform = mask(src, geom, crop=True)
    
    # 3. Clean data and calculate stats
    pop_data = out_image[0]
    nodata = src.nodata if src.nodata is not None else -9999
    pop_data = np.where(pop_data == nodata, 0, pop_data)
    
    total_population = np.sum(pop_data, dtype=np.int64)
    max_density = np.max(pop_data)
    
    pop_data_masked = np.where(pop_data <= 0, np.nan, pop_data)

    print("🎨 Generating visual profile...")
    
    # 4. Create the Visual
    fig, ax = plt.subplots(figsize=(10, 10), facecolor='#1e1e1e')
    ax.set_facecolor('#1e1e1e')
    
    im = ax.imshow(
        pop_data_masked, 
        cmap="inferno", 
        norm=LogNorm(vmin=1, vmax=np.nanmax(pop_data_masked)),
        extent=(
            target_district.total_bounds[0], target_district.total_bounds[2], 
            target_district.total_bounds[1], target_district.total_bounds[3]
        )
    )
    
    target_district.boundary.plot(ax=ax, color='white', linewidth=1.5)
    ax.axis('off')

    stats_text = (
        f"{district_name.upper()} (2024)\n"
        f"────────────────────────\n"
        f"Total Est. Population: {total_population:,}\n"
        f"Peak Pixel Density: {int(max_density):,} people"
    )
    
    ax.text(
        0.05, 0.95, stats_text, 
        transform=ax.transAxes, 
        fontsize=14, color='white', 
        verticalalignment='top',
        bbox=dict(facecolor='black', alpha=0.7, edgecolor='white', boxstyle='round,pad=0.5')
    )
    
    cbar = plt.colorbar(im, ax=ax, fraction=0.035, pad=0.04)
    cbar.set_label("Population Count (Log Scale)", color='white', fontsize=12)
    cbar.ax.yaxis.set_tick_params(color='white', labelcolor='white')

    # 5. Save output dynamically based on what you typed
    output_filename = f"profile_{district_name.lower().replace(' ', '_')}.png"
    plt.savefig(output_filename, dpi=300, bbox_inches="tight", facecolor=fig.get_facecolor())
    print(f"✅ Success! Saved district profile to {output_filename}")
    
    plt.show()

if __name__ == "__main__":
    main()