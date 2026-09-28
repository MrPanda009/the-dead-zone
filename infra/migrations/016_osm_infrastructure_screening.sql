-- 016_osm_infrastructure_screening.sql
-- Ingests Humanitarian OpenStreetMap (HOT) & Overpass infrastructure facilities
-- (schools, clinics/hospitals, water points, road connections) to provide
-- screening-grade civic infrastructure intelligence for candidate relocation sites.

-- ====================================================================
-- 1. OSM INFRASTRUCTURE FACILITY (SPATIAL POINTS)
-- ====================================================================

CREATE TABLE IF NOT EXISTS osm_infrastructure_facility (
    id BIGSERIAL PRIMARY KEY,
    osm_id BIGINT NOT NULL,
    osm_type TEXT NOT NULL CHECK (osm_type IN ('node', 'way', 'relation')),
    facility_type TEXT NOT NULL CHECK (facility_type IN ('school', 'health', 'water', 'road')),
    name TEXT,
    operator_type TEXT NOT NULL DEFAULT 'unknown' CHECK (operator_type IN ('government', 'private', 'community', 'unknown')),
    geom GEOMETRY(Point, 4326) NOT NULL,
    tags JSONB NOT NULL DEFAULT '{}'::jsonb,
    admin_id BIGINT REFERENCES admin_boundary(id) ON DELETE CASCADE,
    source_snapshot_id UUID REFERENCES source_snapshot(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_osm_facility_element UNIQUE (osm_id, osm_type)
);

CREATE INDEX IF NOT EXISTS idx_osm_facility_geom ON osm_infrastructure_facility USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_osm_facility_type ON osm_infrastructure_facility (facility_type);
CREATE INDEX IF NOT EXISTS idx_osm_facility_admin_type ON osm_infrastructure_facility (admin_id, facility_type);

-- ====================================================================
-- 2. CANDIDATE SITE INFRASTRUCTURE SCREENING SUMMARY
-- ====================================================================

ALTER TABLE candidate_site
    ADD COLUMN IF NOT EXISTS screening_infra JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS infra_screening_status TEXT NOT NULL DEFAULT 'unscreened'
        CHECK (infra_screening_status IN ('unscreened', 'screened', 'survey_verified'));

COMMENT ON TABLE osm_infrastructure_facility IS
    'Point facilities (schools, healthcare, potable water points) harvested from Humanitarian OpenStreetMap/Overpass API for candidate site screening.';

COMMENT ON COLUMN candidate_site.screening_infra IS
    'Precomputed spatial summary of nearby civic facilities (counts within buffers, minimum distances, and heuristic screening capacity headroom).';

COMMENT ON COLUMN candidate_site.infra_screening_status IS
    'Screening status of civic infrastructure: unscreened, screened (via HOT/OSM), or survey_verified (official department ground survey).';
