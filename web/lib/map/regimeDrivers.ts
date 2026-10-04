/**
 * Driver rows for the dossier, keyed by `FloodDrivers` field.
 *
 * The API says which drivers matter for a cell's regime (`RegimeContext.key_drivers`); this
 * table says how to label, format and bar each one, so the dossier can reorder and emphasise
 * rows per regime without a layout per regime.
 */

import type { FloodDrivers } from '@/lib/api/types';
import { clamp01 } from './colorScale';
import { MAINSTEM_DISTANCE_SCALE_M, TRIBUTARY_DISTANCE_SCALE_M } from './constants';
import {
  formatDegrees,
  formatDistance,
  formatMetres,
  formatPercent,
  formatScore,
} from './format';

export type DriverKey = Exclude<keyof FloodDrivers, 'observation_ceiling' | 'hazard_regime' | 'model_version'>;

export interface DriverSpec {
  label: string;
  hint: string;
  format: (drivers: FloodDrivers) => string;
  /** [0, 1] bar fill, or null for no bar. */
  fraction: (drivers: FloodDrivers) => number | null;
  /** Rows without a value are hidden when the spec is optional (newer, regime-specific inputs). */
  optional?: boolean;
}

const nullable = (value: number | null | undefined): number | null => value ?? null;

const proximity = (metres: number | null | undefined, scale: number): number | null =>
  metres === null || metres === undefined ? null : 1 - clamp01(metres / scale);

export const DRIVER_SPECS: Record<DriverKey, DriverSpec> = {
  mean_inundation_frequency: {
    label: 'Inundation frequency (F)',
    hint: 'Share of Sentinel-1 scenes in which this cell read as water, after permanent water removal.',
    format: (d) => formatScore(d.mean_inundation_frequency),
    fraction: (d) => d.mean_inundation_frequency,
  },
  mean_anomalous_frequency: {
    label: 'Anomalous frequency (F_anom)',
    hint: 'Inundation in excess of normal river water: max(0, F − JRC long-term occurrence).',
    format: (d) => formatScore(d.mean_anomalous_frequency),
    fraction: (d) => nullable(d.mean_anomalous_frequency),
    optional: true,
  },
  mean_hand_m: {
    label: 'Mean HAND',
    hint: 'Height Above Nearest Drainage. Lower means closer to the drainage network, hence more susceptible.',
    format: (d) => formatMetres(d.mean_hand_m),
    fraction: (d) => (d.mean_hand_m === null ? null : clamp01(1 - d.mean_hand_m / 12)),
  },
  dist_tributary_m: {
    label: 'Distance to tributary',
    hint: 'Nearest major tributary. Closer means more exposed to backwater and embankment breach.',
    format: (d) => formatDistance(d.dist_tributary_m),
    fraction: (d) => proximity(d.dist_tributary_m, TRIBUTARY_DISTANCE_SCALE_M),
    optional: true,
  },
  sar_instability: {
    label: 'Surface instability',
    hint: 'How often the surface flips between wet and dry across the monsoon stack: 4F(1−F). High means an unstable sandbar.',
    format: (d) => formatScore(d.sar_instability),
    fraction: (d) => nullable(d.sar_instability),
    optional: true,
  },
  jrc_occurrence_mean: {
    label: 'Long-term water occurrence',
    hint: 'JRC Global Surface Water occurrence, 1984–2024. High means the cell is often under river water.',
    format: (d) => formatPercent(d.jrc_occurrence_mean, 1),
    fraction: (d) => nullable(d.jrc_occurrence_mean),
    optional: true,
  },
  dist_mainstem_m: {
    label: 'Distance to mainstem',
    hint: 'Nearest mainstem channel. Closer means more exposed to bank erosion.',
    format: (d) => formatDistance(d.dist_mainstem_m),
    fraction: (d) => proximity(d.dist_mainstem_m, MAINSTEM_DISTANCE_SCALE_M),
    optional: true,
  },
  baseline_water_fraction: {
    label: 'Seasonal baseline water',
    hint: 'Share of the cell where JRC occurrence is at least 40 %.',
    format: (d) => formatPercent(d.baseline_water_fraction, 1),
    fraction: (d) => nullable(d.baseline_water_fraction),
    optional: true,
  },
  min_hand_m: {
    label: 'Min HAND',
    hint: 'Lowest point in the cell relative to drainage.',
    format: (d) => formatMetres(d.min_hand_m),
    fraction: () => null,
  },
  mean_slope_deg: {
    label: 'Mean slope',
    hint: 'Above 15° the cell is hard-zeroed by FR-3.17.',
    format: (d) => formatDegrees(d.mean_slope_deg),
    fraction: () => null,
  },
  mean_cropland_fraction: {
    label: 'Cropland fraction',
    hint: 'ESA WorldCover class 40. Agricultural exposure, not hazard.',
    format: (d) => formatPercent(d.mean_cropland_fraction, 1),
    fraction: (d) => d.mean_cropland_fraction,
  },
  max_susceptibility: {
    label: 'Peak pixel score',
    hint: 'Highest single-pixel susceptibility inside the cell — a mean can hide a hot channel.',
    format: (d) => formatScore(d.max_susceptibility),
    fraction: (d) => d.max_susceptibility,
  },
  valid_pixel_fraction: {
    label: 'Valid pixel coverage',
    hint: 'Share of the cell with valid raster data. Below 50% the cell is flagged low coverage.',
    format: (d) => formatPercent(d.valid_pixel_fraction, 1),
    fraction: (d) => d.valid_pixel_fraction,
  },
  hard_zero_fraction: {
    label: 'Hard-zero area',
    hint: 'Share excluded by HAND > 30 m or slope > 15°.',
    format: (d) => formatPercent(d.hard_zero_fraction, 1),
    fraction: (d) => d.hard_zero_fraction,
  },
};

/** Row order for cells without regime context, matching the pre-regime dossier. */
export const LEGACY_DRIVER_ORDER: readonly DriverKey[] = [
  'mean_inundation_frequency',
  'mean_hand_m',
  'min_hand_m',
  'mean_slope_deg',
  'mean_cropland_fraction',
  'max_susceptibility',
  'valid_pixel_fraction',
  'hard_zero_fraction',
];

export const LEGACY_KEY_DRIVERS: readonly DriverKey[] = ['mean_inundation_frequency', 'mean_hand_m'];

export interface DriverRowModel {
  key: DriverKey;
  spec: DriverSpec;
  emphasised: boolean;
}

/**
 * Orders driver rows: the regime's key drivers first (emphasised), then the remaining rows.
 * Optional rows with no value are dropped; the regime's own key drivers are kept so a missing
 * input shows as "—" rather than silently vanishing.
 */
export function buildDriverRows(
  drivers: FloodDrivers,
  keyDrivers: readonly string[] | undefined,
  options: { includeSecondary?: boolean } = {},
): DriverRowModel[] {
  const { includeSecondary = true } = options;
  const known = (key: string): key is DriverKey => key in DRIVER_SPECS;
  const keys = (keyDrivers && keyDrivers.length > 0 ? keyDrivers : LEGACY_KEY_DRIVERS).filter(known);
  const keySet = new Set<DriverKey>(keys);

  // Regime-specific inputs only appear as key drivers of their own regime; the shared context
  // rows (HAND range, slope, cropland, coverage) follow for every cell.
  const secondary = includeSecondary ? LEGACY_DRIVER_ORDER.filter((key) => !keySet.has(key)) : [];

  const rows: DriverRowModel[] = [
    ...keys.map((key) => ({ key, spec: DRIVER_SPECS[key], emphasised: true })),
    ...secondary.map((key) => ({ key, spec: DRIVER_SPECS[key], emphasised: false })),
  ];
  return rows.filter(
    ({ key, spec, emphasised }) => emphasised || !spec.optional || drivers[key] !== null && drivers[key] !== undefined,
  );
}
