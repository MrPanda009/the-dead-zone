import os
import rasterio
from rasterio.windows import from_bounds
import numpy as np

# 1. Specify your .tif file name
TIF_FILE = "landscan-global-2024.tif"

if not os.path.exists(TIF_FILE):
    print(f"❌ Error: Could not find '{TIF_FILE}' in this folder.")
    print("Make sure your .tif file is copied into your project folder!")
    exit()

print(f"📂 Opening {TIF_FILE}...")

# 2. Open the .tif file
with rasterio.open(TIF_FILE) as src:
    print("\n--- 📊 RASTER METADATA ---")
    print(f"Dimensions (Width x Height): {src.width} x {src.height} pixels")
    print(f"Coordinate Reference System (CRS): {src.crs}")
    print(f"Bounding Box (Degrees): {src.bounds}")
    print(f"Number of Bands: {src.count}")
    
    # 3. Define India's Bounding Box [Min Lon, Min Lat, Max Lon, Max Lat]
    india_bounds = [68.1, 6.7, 97.4, 35.5] 
    
    # Convert geographic coordinates (lat/lon) to pixel window
    window = from_bounds(*india_bounds, transform=src.transform)
    
    print("\n✂️ Cropping data to India's bounding box...")
    # Read Band 1 (population density) within the cropped window
    india_data = src.read(1, window=window)
    
    # Handle 'No Data' values (using src.nodata)
    nodata_val = src.nodata
    if nodata_val is not None:
        india_data = np.where(india_data == nodata_val, 0, india_data)
        
    print("\n--- 📈 INDIA POPULATION STATS ---")
    print(f"Cropped Shape: {india_data.shape} pixels")
    print(f"Max Population in a single pixel: {np.max(india_data):,}")
    print(f"Total Estimated Population in this box: {np.sum(india_data, dtype=np.int64):,}")

print("\n✅ Done! Your .tif file was read successfully.")