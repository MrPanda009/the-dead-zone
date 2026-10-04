-- 021_flood_hazard_regime.sql
-- Flood model v0.2 drivers + hazard regime on the per-cell flood driver table.
--
-- Rationale: model v0.2 replaces raw SAR frequency with anomalous frequency (SAR frequency in
-- excess of JRC long-term water occurrence). That lowers scores on Brahmaputra char belts, whose
-- water is partly "normal" river presence. Char-belt residents are still among the most exposed,
-- so the regime travels with every cell: the client can show char belts as their own class
-- instead of reading a mid-range susceptibility as "moderate risk".

ALTER TABLE hazard_static_flood
    ADD COLUMN IF NOT EXISTS hazard_regime TEXT,
    ADD COLUMN IF NOT EXISTS mean_anomalous_frequency REAL,
    ADD COLUMN IF NOT EXISTS jrc_occurrence_mean REAL,
    ADD COLUMN IF NOT EXISTS baseline_water_fraction REAL;

ALTER TABLE hazard_static_flood
    DROP CONSTRAINT IF EXISTS hazard_static_flood_hazard_regime_check;

ALTER TABLE hazard_static_flood
    ADD CONSTRAINT hazard_static_flood_hazard_regime_check
    CHECK (hazard_regime IS NULL OR hazard_regime IN ('floodplain', 'char_belt', 'channel'));

COMMENT ON COLUMN hazard_static_flood.hazard_regime IS
    'floodplain | char_belt | channel, from JRC occurrence (cell mean) and raw SAR frequency. '
    'channel: occurrence >= 0.75; char_belt: occurrence >= 0.40 or SAR frequency >= 0.40. '
    'NULL when the build had no JRC occurrence layer.';

COMMENT ON COLUMN hazard_static_flood.mean_anomalous_frequency IS
    'Model v0.2 frequency input: max(0, SAR frequency - JRC occurrence fraction), cell mean.';

COMMENT ON COLUMN hazard_static_flood.jrc_occurrence_mean IS
    'JRC Global Surface Water v1.5 long-term water occurrence, cell mean in [0, 1].';

COMMENT ON COLUMN hazard_static_flood.baseline_water_fraction IS
    'Fraction of the cell where JRC occurrence >= 40 % (seasonal baseline water).';

CREATE INDEX IF NOT EXISTS idx_hazard_static_flood_regime
ON hazard_static_flood (hazard_regime);
