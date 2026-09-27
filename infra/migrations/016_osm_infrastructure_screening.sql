-- 016_osm_infrastructure_screening.sql
-- OpenStreetMap infrastructure facilities schema for candidate site screening.

CREATE TABLE IF NOT EXISTS osm_infrastructure_facility (
    id BIGSERIAL PRIMARY KEY,
    osm_id BIGINT NOT NULL,
    osm_type TEXT NOT NULL,
    facility_type TEXT NOT NULL,
    name TEXT,
    operator_type TEXT NOT NULL DEFAULT 'unknown',
    geom GEOMETRY(Geometry, 4326) NOT NULL,
    tags JSONB NOT NULL DEFAULT '{}'::jsonb,
    admin_id BIGINT REFERENCES admin_boundary(id) ON DELETE SET NULL,
    source_snapshot_id UUID REFERENCES source_snapshot(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_osm_facility_element ON osm_infrastructure_facility (osm_id, osm_type);
CREATE INDEX IF NOT EXISTS idx_osm_facility_geom ON osm_infrastructure_facility USING gist (geom);
CREATE INDEX IF NOT EXISTS idx_osm_facility_type ON osm_infrastructure_facility (facility_type);
CREATE INDEX IF NOT EXISTS idx_osm_facility_admin_type ON osm_infrastructure_facility (admin_id, facility_type);

ALTER TABLE candidate_site ADD COLUMN IF NOT EXISTS screening_infra JSONB;
ALTER TABLE candidate_site ADD COLUMN IF NOT EXISTS infra_screening_status TEXT;
