'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/lib/api/client';

export interface AsyncResource<T> {
  /** Data for the *current* key only. A key change never exposes the previous key's data. */
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
  refetch: () => void;
}

interface ResourceState<T> {
  /** The request this result belongs to; compared against the current key to derive loading. */
  key: string;
  data: T | null;
  error: ApiError | null;
}

function toApiError(cause: unknown): ApiError {
  return cause instanceof ApiError ? cause : new ApiError('Unexpected error loading data.', 0);
}

/**
 * Loads one resource and keeps it tied to a request key.
 *
 * Loading and staleness are derived from the key rather than set in the effect, so switching
 * district or state immediately drops the old payload instead of showing it under a new
 * heading. Errors are returned, never swallowed: callers render an error state, not a fallback.
 */
export function useAsyncResource<T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  enabled = true,
): AsyncResource<T> {
  const [state, setState] = useState<ResourceState<T> | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const requestKey = `${key}|${reloadToken}`;

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    fetcherRef
      .current(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setState({ key: requestKey, data, error: null });
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setState({ key: requestKey, data: null, error: toApiError(cause) });
      });

    return () => controller.abort();
  }, [requestKey, enabled]);

  const refetch = useCallback(() => setReloadToken((token) => token + 1), []);

  const isCurrent = state?.key === requestKey;
  return {
    data: isCurrent ? state.data : null,
    error: isCurrent ? state.error : null,
    isLoading: enabled && !isCurrent,
    refetch,
  };
}
