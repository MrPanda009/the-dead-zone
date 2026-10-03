'use client';

import { fetchDistrictHazardSummary, type DistrictHazardSummaryDTO } from '@/lib/api/stats';

import { useAsyncResource, type AsyncResource } from './useAsyncResource';

/** District rollup (`GET /hazard/summary`). `lgdCode` is the admin id or LGD code. */
export function useDistrictHazardSummary(
  lgdCode: number | null,
  { hazardType = 'riverine_flood', enabled = true }: { hazardType?: string; enabled?: boolean } = {},
): AsyncResource<DistrictHazardSummaryDTO> {
  return useAsyncResource(
    `summary|${lgdCode ?? ''}|${hazardType}`,
    (signal) => fetchDistrictHazardSummary(lgdCode as number, hazardType, signal),
    enabled && lgdCode !== null,
  );
}
