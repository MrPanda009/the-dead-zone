'use client';

import { fetchAvailableStates } from '@/lib/api/stats';

import { useAsyncResource } from './useAsyncResource';

/**
 * States that have recorded-loss data, merged into a fixed starting list.
 *
 * The dropdown stays usable while the request is in flight or if it fails; a state without
 * records simply renders the empty state on the tab.
 */
export function useStatsAvailableStates(initial: readonly string[]): string[] {
  const { data } = useAsyncResource('stats-states', (signal) => fetchAvailableStates(signal));
  const fetched = data?.states ?? [];
  return Array.from(new Set([...initial, ...fetched]));
}
