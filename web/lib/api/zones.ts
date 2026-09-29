/** Zone endpoints: the composite per-cell view that carries feature attributions. */

import { apiGet } from './client';
import type { ZoneCellDetail } from './types';

/**
 * Fetches one cell with its terrain attributions (`explanation`).
 *
 * Unlike `/hazard/cells/{h3}`, whose drivers come from the flood-only `hazard_static_flood`
 * table, this works for every hazard type and every district.
 */
export function fetchZoneDetail(h3: string, signal?: AbortSignal): Promise<ZoneCellDetail> {
  return apiGet<ZoneCellDetail>(`/zones/${h3}`, undefined, signal);
}
