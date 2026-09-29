'use client';

import { useEffect, useState } from 'react';

import { ApiError } from '@/lib/api/client';
import { fetchZoneDetail } from '@/lib/api/zones';
import type { FeatureContribution } from '@/lib/api/types';

export interface UseCellExplanationResult {
  contributions: FeatureContribution[];
  /** Model that produced the attributions — may differ from the model behind the score. */
  attributionModelVersion: string | null;
  isLoading: boolean;
  error: ApiError | null;
}

interface ExplanationState {
  /** The cell this result belongs to; compared against the selection to derive loading. */
  key: string;
  contributions: FeatureContribution[];
  attributionModelVersion: string | null;
  error: ApiError | null;
}

/** Loads the per-cell feature attributions, cancelling in-flight requests on change. */
export function useCellExplanation(h3: string | null, enabled = true): UseCellExplanationResult {
  const [state, setState] = useState<ExplanationState | null>(null);
  const requestKey = h3 ?? '';
  const active = enabled && Boolean(h3);

  useEffect(() => {
    if (!active || !h3) return;

    const controller = new AbortController();

    fetchZoneDetail(h3, controller.signal)
      .then((zone) => {
        if (controller.signal.aborted) return;
        const contributions = zone.explanation ?? [];
        setState({
          key: requestKey,
          contributions,
          attributionModelVersion:
            contributions.length > 0 ? (zone.explanation_model_version ?? null) : null,
          error: null,
        });
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          key: requestKey,
          contributions: [],
          attributionModelVersion: null,
          error:
            cause instanceof ApiError
              ? cause
              : new ApiError('Unexpected error loading terrain attributions.', 0),
        });
      });

    return () => controller.abort();
  }, [active, h3, requestKey]);

  const isCurrent = state?.key === requestKey;

  return {
    contributions: isCurrent ? state.contributions : [],
    attributionModelVersion: isCurrent ? state.attributionModelVersion : null,
    isLoading: active && !isCurrent,
    error: isCurrent ? state.error : null,
  };
}
