import geopandas as gpd

# Read the shapefile you downloaded
gdf = gpd.read_file("2011_Dist.shp")

# Print the column names and the first few rows
print("Columns:", gdf.columns.tolist())
print(gdf.head(3))