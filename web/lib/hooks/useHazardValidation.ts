'use client';

import { fetchHazardValidation, type FloodValidationData } from '@/lib/api/hazard';
import { useAsyncResource, type AsyncResource } from './useAsyncResource';

/**
 * Reads independent flood validation results (`GET /hazard/validation`).
 * Returns `status: 'not_validated'` when no independent historical run exists.
 */
export function useHazardValidation(
  admin: number | null,
  { hazardType = 'riverine_flood', enabled = true }: { hazardType?: string; enabled?: boolean } = {},
): AsyncResource<FloodValidationData> {
  return useAsyncResource(
    `validation|${admin ?? ''}|${hazardType}`,
    (signal) => fetchHazardValidation(admin as number, hazardType, signal),
    enabled && admin !== null,
  );
}
