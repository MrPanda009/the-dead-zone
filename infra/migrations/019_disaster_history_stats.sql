-- Migration 019: Disaster History and Historical Statistics Tables
-- Reference: UPDATE_CHANGES.md Section 1, 3, 4

CREATE TABLE IF NOT EXISTS historical_disaster_loss (
    id BIGSERIAL PRIMARY KEY,
    state_name VARCHAR(100) NOT NULL,
    year_label VARCHAR(30) NOT NULL,
    year_start INT NOT NULL,
    year_end INT NOT NULL,
    lives_lost INT DEFAULT 0,
    cattle_lost INT DEFAULT 0,
    houses_damaged INT DEFAULT 0,
    crop_area_affected_ha DOUBLE PRECISION DEFAULT 0.0,
    hazard_types_included VARCHAR(255) DEFAULT 'Floods/Heavy Rains/Landslides/Cyclones',
    source_uuid VARCHAR(64) NOT NULL,
    source_title VARCHAR(255) NOT NULL,
    source_ministry VARCHAR(255) NOT NULL,
    data_quality_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_state_year_loss UNIQUE(state_name, year_label, source_uuid)
);

CREATE INDEX IF NOT EXISTS idx_hist_loss_state ON historical_disaster_loss(state_name);
CREATE INDEX IF NOT EXISTS idx_hist_loss_years ON historical_disaster_loss(year_start, year_end);

CREATE TABLE IF NOT EXISTS ncrb_natural_hazard_casualty (
    id BIGSERIAL PRIMARY KEY,
    state_name VARCHAR(100) NOT NULL,
    calendar_year INT NOT NULL,
    landslide_deaths INT DEFAULT 0,
    flash_flood_deaths INT DEFAULT 0,
    flood_deaths INT DEFAULT 0,
    cloudburst_deaths INT DEFAULT 0,
    cyclone_deaths INT DEFAULT 0,
    avalanche_deaths INT DEFAULT 0,
    lightning_deaths INT DEFAULT 0,
    cold_heat_wave_deaths INT DEFAULT 0,
    other_nature_deaths INT DEFAULT 0,
    total_deaths INT NOT NULL,
    source_uuid VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_state_year_ncrb UNIQUE(state_name, calendar_year)
);

CREATE INDEX IF NOT EXISTS idx_ncrb_state ON ncrb_natural_hazard_casualty(state_name);
CREATE INDEX IF NOT EXISTS idx_ncrb_year ON ncrb_natural_hazard_casualty(calendar_year);

CREATE TABLE IF NOT EXISTS cwc_flood_damage_record (
    id BIGSERIAL PRIMARY KEY,
    state_name VARCHAR(100) NOT NULL,
    calendar_year INT NOT NULL,
    area_affected_mha DOUBLE PRECISION DEFAULT 0.0,
    population_affected_m DOUBLE PRECISION DEFAULT 0.0,
    human_lives_lost INT DEFAULT 0,
    cattle_lost INT DEFAULT 0,
    houses_damaged_count INT DEFAULT 0,
    total_damage_crores DOUBLE PRECISION DEFAULT 0.0,
    source_uuid VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_cwc_state_year UNIQUE(state_name, calendar_year)
);

CREATE INDEX IF NOT EXISTS idx_cwc_state ON cwc_flood_damage_record(state_name);
CREATE INDEX IF NOT EXISTS idx_cwc_year ON cwc_flood_damage_record(calendar_year);

CREATE TABLE IF NOT EXISTS highway_disaster_damage (
    id BIGSERIAL PRIMARY KEY,
    state_name VARCHAR(100) NOT NULL,
    reporting_period VARCHAR(50) NOT NULL,
    damaged_length_km DOUBLE PRECISION NOT NULL,
    disaster_triggers VARCHAR(255) DEFAULT 'Heavy Rain / Landslide / Flood',
    source_uuid VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_highway_state_period UNIQUE(state_name, reporting_period)
);

CREATE INDEX IF NOT EXISTS idx_highway_state ON highway_disaster_damage(state_name);

CREATE TABLE IF NOT EXISTS disaster_relief_allocation (
    id BIGSERIAL PRIMARY KEY,
    state_name VARCHAR(100) NOT NULL,
    fiscal_year VARCHAR(30) NOT NULL,
    sdrf_central_share_cr DOUBLE PRECISION DEFAULT 0.0,
    sdrf_state_share_cr DOUBLE PRECISION DEFAULT 0.0,
    ndrf_releases_cr DOUBLE PRECISION DEFAULT 0.0,
    lives_saved_count INT DEFAULT 0,
    source_uuid VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_relief_state_year UNIQUE(state_name, fiscal_year)
);

CREATE INDEX IF NOT EXISTS idx_relief_state ON disaster_relief_allocation(state_name);

CREATE TABLE IF NOT EXISTS disaster_case_study (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(64) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    disaster_type VARCHAR(100) NOT NULL,
    state_name VARCHAR(100) NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    fatalities INT DEFAULT 0,
    injured INT DEFAULT 0,
    missing INT DEFAULT 0,
    compensation_cr DOUBLE PRECISION DEFAULT 0.0,
    summary TEXT NOT NULL,
    geotechnical_context TEXT,
    response_actions JSONB DEFAULT '[]'::jsonb,
    source_refs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_study_slug ON disaster_case_study(slug);
CREATE INDEX IF NOT EXISTS idx_case_study_state ON disaster_case_study(state_name);
