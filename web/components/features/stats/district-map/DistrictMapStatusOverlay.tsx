import type { ReactNode } from 'react';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { MapSkeleton } from '@/components/features/map/MapSkeleton';
import type { ApiError } from '@/lib/api/client';

export type DistrictMapStatus = 'loading' | 'error' | 'not_computed' | 'empty' | 'ready';

export interface DistrictMapStatusOverlayProps {
  status: DistrictMapStatus;
  districtName: string;
  error?: ApiError | null;
  onRetry?: () => void;
  notComputedTitle?: ReactNode;
  notComputedDescription?: ReactNode;
  className?: string;
  classNames?: {
    root?: string;
    card?: string;
  };
}

/** Replaces the map content for every non-ready state. Nothing placeholder is ever drawn. */
export const DistrictMapStatusOverlay = ({
  status,
  districtName,
  error = null,
  onRetry,
  notComputedTitle,
  notComputedDescription = 'The riverine flood layer has not been computed for this district, so no cells are drawn.',
  className = '',
  classNames = {},
}: DistrictMapStatusOverlayProps) => {
  if (status === 'ready') return null;
  if (status === 'loading') return <MapSkeleton label={`Loading ${districtName} flood layer…`} />;

  return (
    <div
      className={[
        'absolute inset-0 z-20 flex items-center justify-center p-4 pointer-events-none',
        classNames.root ?? '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className={[
          'pointer-events-auto max-w-xs rounded-2xl bg-surface-0/90 dark:bg-forest-dark/90 backdrop-blur-md',
          classNames.card ?? '',
        ].join(' ')}
      >
        {status === 'error' ? (
          <ErrorState
            title="Could not load the flood layer"
            message={error?.message ?? 'The request failed.'}
            code={error?.code}
            requestId={error?.requestId}
            actionSlot={
              onRetry ? (
                <Button size="sm" variant="secondary" onClick={onRetry}>
                  Retry
                </Button>
              ) : null
            }
          />
        ) : (
          <EmptyState
            title={notComputedTitle ?? `No SAR flood layer for ${districtName}`}
            description={
              status === 'empty' ? 'The API returned no cells for this district.' : notComputedDescription
            }
          />
        )}
      </div>
    </div>
  );
};
