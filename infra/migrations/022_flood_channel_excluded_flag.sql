-- Channel cells are excluded from terrestrial scoring (flood model v0.2, Phase 2b.3).
--
-- hazard_static.susceptibility stays NOT NULL (habitation roll-ups, forecast joins and the MHI
-- engine read it), so an active-channel cell is stored as susceptibility 0.0 / confidence 0.0 and
-- marked with quality_flag = 'channel_excluded'. Every aggregate that describes land (quantile
-- breaks, band shares, per-habitation means) filters on that flag; the flag, not the zero, is what
-- says "this is a river, not safe land".

ALTER TABLE hazard_static
    DROP CONSTRAINT IF EXISTS hazard_static_quality_flag_check;

ALTER TABLE hazard_static
    ADD CONSTRAINT hazard_static_quality_flag_check
    CHECK (quality_flag IN ('full', 'low_coverage', 'no_coverage', 'channel_excluded'));

COMMENT ON COLUMN hazard_static.quality_flag IS
    'full / low_coverage / no_coverage: zonal coverage (§10.3). '
    'no_coverage carries susceptibility 0.0 as a NaN fill, not a measurement. '
    'channel_excluded: active river channel (hazard_regime = channel); susceptibility 0.0 is a '
    'placeholder, the cell is excluded from terrestrial risk statistics.';
