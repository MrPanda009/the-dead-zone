-- 017_health_facilities.sql
-- Spatial healthcare facilities schema for SETU-DRR carrying capacity evaluation.

CREATE TABLE IF NOT EXISTS health_facility (
    id BIGSERIAL PRIMARY KEY,
    nin_n TEXT,
    admin_id BIGINT REFERENCES admin_boundary(id) ON DELETE SET NULL,
    import_run_id UUID REFERENCES data_import_run(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    facility_type TEXT NOT NULL,
    ownership_type TEXT,
    location_type TEXT,
    subdistrict TEXT,
    address TEXT,
    geom GEOMETRY(Point, 4326) NOT NULL,
    h3_res8 BIGINT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_physical BOOLEAN NOT NULL DEFAULT TRUE,
    norm_population INT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all columns exist idempotently in case table pre-existed from an earlier draft
ALTER TABLE health_facility ADD COLUMN IF NOT EXISTS nin_n TEXT;
ALTER TABLE health_facility ADD COLUMN IF NOT EXISTS admin_id BIGINT REFERENCES admin_boundary(id) ON DELETE SET NULL;
ALTER TABLE health_facility ADD COLUMN IF NOT EXISTS import_run_id UUID REFERENCES data_import_run(id) ON DELETE SET NULL;
ALTER TABLE health_facility ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE health_facility ADD COLUMN IF NOT EXISTS facility_type TEXT;
ALTER TABLE health_facility ADD COLUMN IF NOT EXISTS ownership_type TEXT;
ALTER TABLE health_facility ADD COLUMN IF NOT EXISTS location_type TEXT;
ALTER TABLE health_facility ADD COLUMN IF NOT EXISTS subdistrict TEXT;
ALTER TABLE health_facility ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE health_facility ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326);
ALTER TABLE health_facility ADD COLUMN IF NOT EXISTS h3_res8 BIGINT;
ALTER TABLE health_facility ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE health_facility ADD COLUMN IF NOT EXISTS is_physical BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE health_facility ADD COLUMN IF NOT EXISTS norm_population INT NOT NULL DEFAULT 0;
ALTER TABLE health_facility ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE health_facility ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_health_facility_geom ON health_facility USING gist (geom);
CREATE INDEX IF NOT EXISTS idx_health_facility_h3 ON health_facility USING btree (h3_res8);
CREATE INDEX IF NOT EXISTS idx_health_facility_admin_id ON health_facility USING btree (admin_id);
CREATE INDEX IF NOT EXISTS idx_health_facility_type ON health_facility USING btree (facility_type);
CREATE UNIQUE INDEX IF NOT EXISTS uq_health_facility_nin_n ON health_facility (nin_n)
    WHERE nin_n IS NOT NULL AND nin_n <> '' AND nin_n <> 'NA';

COMMENT ON TABLE health_facility IS 'Public and primary healthcare facilities geocoded for carrying capacity (CC_health) evaluation.';
