-- 018_candidate_site_health_link.sql
-- Direct relational foreign key and physical transit metrics for candidate relocation sites.

ALTER TABLE candidate_site
    ADD COLUMN IF NOT EXISTS primary_health_facility_id BIGINT REFERENCES health_facility(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS health_travel_time_hours REAL,
    ADD COLUMN IF NOT EXISTS health_distance_km REAL;

CREATE INDEX IF NOT EXISTS idx_candidate_site_primary_health ON candidate_site(primary_health_facility_id);

COMMENT ON COLUMN candidate_site.primary_health_facility_id IS 'Assigned nearest accessible primary health facility under IPHS time-to-care ceiling.';
COMMENT ON COLUMN candidate_site.health_travel_time_hours IS 'Effective WHO-Tobler terrain travel time to assigned health facility in hours.';
COMMENT ON COLUMN candidate_site.health_distance_km IS 'Geodesic physical distance to assigned health facility in kilometers.';
