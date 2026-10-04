-- River-proximity inputs of the regime-specific flood scores (Phase 2b), kept per cell so the
-- dossier can show the drivers behind a floodplain or char-belt score.
--
-- dist_tributary_m: floodplain term; dist_mainstem_m: char-belt term. Both are NULL when the build
-- had no river network for the district (the scores then renormalise over the remaining terms).

ALTER TABLE hazard_static_flood
    ADD COLUMN IF NOT EXISTS dist_tributary_m REAL,
    ADD COLUMN IF NOT EXISTS dist_mainstem_m REAL;

COMMENT ON COLUMN hazard_static_flood.dist_tributary_m IS
    'Metres from the cell centroid to the nearest major tributary (OSM named rivers + HydroRIVERS >= 50 km2).';

COMMENT ON COLUMN hazard_static_flood.dist_mainstem_m IS
    'Metres from the cell centroid to the nearest mainstem channel (Brahmaputra for Barpeta).';
