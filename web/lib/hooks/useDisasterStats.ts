'use client';

import { fetchDisasterStats, type DisasterStatsResponse } from '@/lib/api/stats';

import { useAsyncResource, type AsyncResource } from './useAsyncResource';

export const DEFAULT_STATS_FROM_YEAR = 2014;
export const DEFAULT_STATS_TO_YEAR = 2024;

export interface UseDisasterStatsOptions {
  fromYear?: number;
  toYear?: number;
  /** Skip the request, e.g. while another tab is active. */
  enabled?: boolean;
}

/** Recorded state-level losses (MHA, NCRB, CWC) for one state. */
export function useDisasterStats(
  state: string,
  { fromYear = DEFAULT_STATS_FROM_YEAR, toYear = DEFAULT_STATS_TO_YEAR, enabled = true }: UseDisasterStatsOptions = {},
): AsyncResource<DisasterStatsResponse> {
  return useAsyncResource(
    `stats|${state}|${fromYear}|${toYear}`,
    (signal) => fetchDisasterStats({ state, from_year: fromYear, to_year: toYear }, signal),
    enabled && state.length > 0,
  );
}
