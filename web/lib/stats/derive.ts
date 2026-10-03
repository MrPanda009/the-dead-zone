/**
 * Pure helpers that turn API payloads into display values for the Stats dashboard.
 *
 * Nothing here invents data: every function returns `null` / an empty list when the
 * payload does not support a statement, and callers render an empty state instead.
 */

import type { DistrictHazardSummaryDTO } from '@/lib/api/stats';

/** FR-3.17 hard-zero limits; the same cut-offs the pipeline uses to exclude terrain. */
export const HAND_LIMIT_M = 30;
export const SLOPE_LIMIT_DEG = 15;

/** Susceptibility cut used for the "high share" gauge (high + very high bands). */
export const HIGH_SHARE_THRESHOLD = 0.6;
/** Susceptibility cut the backend uses for "habitations at risk". */
export const AT_RISK_THRESHOLD = 0.5;

export type FloodDrivers = NonNullable<DistrictHazardSummaryDTO['drivers_summary']>;

/** True when the district has a computed layer with at least one cell. */
export function isComputed(summary: DistrictHazardSummaryDTO | null | undefined): boolean {
  return !!summary && summary.model_status === 'computed' && summary.total_cells > 0;
}

/** Percentage of cells with S >= 0.60 (high + very high bands), or null when not computed. */
export function highSharePct(summary: DistrictHazardSummaryDTO | null | undefined): number | null {
  if (!summary || !isComputed(summary) || !summary.band_distribution) return null;
  const { high, very_high } = summary.band_distribution;
  return Math.round((high + very_high) * 1000) / 10;
}

export interface DriverRowData {
  id: string;
  label: string;
  /** Pre-formatted value including its unit. */
  display: string;
  /** Position on the bar, clamped to [0, 1]. */
  fraction: number;
  /** Plain-language scale shown under the bar so the bar is never read as a share. */
  scale: string;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

function row(
  id: string,
  label: string,
  value: number | null | undefined,
  format: (v: number) => string,
  domainMax: number,
  scale: string,
): DriverRowData | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return { id, label, display: format(value), fraction: clamp01(value / domainMax), scale };
}

/** Rows for the driver panel, in display order. Missing drivers are omitted, not zeroed. */
export function driverRowsFromSummary(
  drivers: FloodDrivers | null | undefined,
): DriverRowData[] {
  if (!drivers) return [];
  const rows = [
    row(
      'frequency',
      'Sentinel-1 inundation frequency',
      drivers.mean_inundation_frequency,
      (v) => v.toFixed(2),
      1,
      '0 – 1 (share of valid scenes flooded)',
    ),
    row(
      'hand-mean',
      'Mean HAND (height above drainage)',
      drivers.mean_hand_m,
      (v) => `${v.toFixed(1)} m`,
      HAND_LIMIT_M,
      `0 – ${HAND_LIMIT_M} m (lower = closer to drainage)`,
    ),
    row(
      'hand-min',
      'Minimum HAND',
      drivers.min_hand_m,
      (v) => `${v.toFixed(1)} m`,
      HAND_LIMIT_M,
      `0 – ${HAND_LIMIT_M} m`,
    ),
    row(
      'slope',
      'Mean slope',
      drivers.mean_slope_deg,
      (v) => `${v.toFixed(1)}°`,
      SLOPE_LIMIT_DEG,
      `0 – ${SLOPE_LIMIT_DEG}° (steeper terrain is excluded)`,
    ),
    row(
      'cropland',
      'Cropland fraction',
      drivers.mean_cropland_fraction,
      (v) => `${Math.round(v * 100)}%`,
      1,
      '0 – 100% of cell area',
    ),
  ];
  return rows.filter((r): r is DriverRowData => r !== null);
}
