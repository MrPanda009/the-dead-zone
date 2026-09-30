/** Endpoint bindings for the historical disaster statistics and district summary API. */

import { apiGet } from './client';
import type { components } from '../api-types';

export type AvailableStatesResponse = components['schemas']['AvailableStatesResponse'];
export type DisasterStatsResponse = components['schemas']['DisasterStatsResponse'];
export type StateDisasterComparisonDTO = components['schemas']['StateDisasterComparisonDTO'];
export type DisasterCaseStudyDTO = components['schemas']['DisasterCaseStudyDTO'];
export type DistrictHazardSummaryDTO = components['schemas']['DistrictHazardSummaryDTO'];
export type HistoricalLossDTO = components['schemas']['HistoricalLossDTO'];
export type NcrbHazardCasualtyDTO = components['schemas']['NcrbHazardCasualtyDTO'];
export type CwcFloodDamageDTO = components['schemas']['CwcFloodDamageDTO'];
export type HighwayDisasterDamageDTO = components['schemas']['HighwayDisasterDamageDTO'];
export type ReliefAllocationDTO = components['schemas']['ReliefAllocationDTO'];

/** Fetches available states having historical disaster records. */
export function fetchAvailableStates(signal?: AbortSignal): Promise<AvailableStatesResponse> {
  return apiGet<AvailableStatesResponse>('/stats/states', undefined, signal);
}

/** Fetches time-series disaster loss and hazard breakdown for a state. */
export function fetchDisasterStats(
  params: { state?: string; from_year?: number; to_year?: number } = {},
  signal?: AbortSignal,
): Promise<DisasterStatsResponse> {
  return apiGet<DisasterStatsResponse>(
    '/stats/disasters',
    {
      state: params.state || 'Assam',
      from_year: params.from_year ?? 2014,
      to_year: params.to_year ?? 2024,
    },
    signal,
  );
}

/** Compares disaster impacts between two states. */
export function fetchDisasterComparison(
  state1: string,
  state2: string,
  signal?: AbortSignal,
): Promise<StateDisasterComparisonDTO> {
  return apiGet<StateDisasterComparisonDTO>(
    '/stats/disasters/comparison',
    { state1, state2 },
    signal,
  );
}

/** Fetches curated landmark disaster case studies (e.g. Noney 2022). */
export function fetchCaseStudies(
  slug?: string,
  signal?: AbortSignal,
): Promise<DisasterCaseStudyDTO[]> {
  return apiGet<DisasterCaseStudyDTO[]>(
    '/stats/case-studies',
    slug ? { slug } : undefined,
    signal,
  );
}

/** Fetches district-level hazard rollup and officer decision prompt. */
export function fetchDistrictHazardSummary(
  admin: number,
  hazardType: string = 'riverine_flood',
  signal?: AbortSignal,
): Promise<DistrictHazardSummaryDTO> {
  return apiGet<DistrictHazardSummaryDTO>(
    '/hazard/summary',
    { admin, hazard_type: hazardType },
    signal,
  );
}
