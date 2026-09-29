/** Helpers for deciding which driver panel a hazard cell can honestly show. */

import type { FloodDrivers } from '@/lib/api/types';

/**
 * True when the cell carries measured flood drivers.
 *
 * The hazard API always returns a `drivers` object, with every field null for layers that
 * have no `hazard_static_flood` row (landslide, flash flood, Wayanad's terrain flood layer),
 * so its mere presence says nothing about whether there is data behind it.
 */
export function hasFloodDriverData(drivers: FloodDrivers | null | undefined): boolean {
  if (!drivers) return false;
  return (
    drivers.mean_inundation_frequency !== null ||
    drivers.mean_hand_m !== null ||
    drivers.mean_slope_deg !== null ||
    drivers.max_susceptibility !== null
  );
}
