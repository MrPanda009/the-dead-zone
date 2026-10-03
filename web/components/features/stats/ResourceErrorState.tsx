import type { ReactNode } from 'react';

import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import type { ApiError } from '@/lib/api/client';

export interface ResourceErrorStateProps {
  title: ReactNode;
  error: ApiError;
  onRetry?: () => void;
  retryLabel?: ReactNode;
  className?: string;
}

/** Error card with a retry button. Used wherever a stats resource fails; there is no fallback data. */
export const ResourceErrorState = ({
  title,
  error,
  onRetry,
  retryLabel = 'Retry',
  className = '',
}: ResourceErrorStateProps) => (
  <ErrorState
    title={title}
    message={error.message}
    code={error.code}
    requestId={error.requestId}
    className={className}
    actionSlot={
      onRetry ? (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null
    }
  />
);
