import type { DisasterStatsResponse } from '@/lib/api/stats';
import type { AsyncResource } from '@/lib/hooks/useAsyncResource';
import { STATE_LEVEL_RECORDS_NOTICE } from '@/lib/stats/copy';

import { LossChartSkeleton } from '../../LossChartSkeleton';
import { ResourceErrorState } from '../../ResourceErrorState';
import { LossTimeSeriesChart } from '../../LossTimeSeriesChart';
import { RecordedLossSummary } from './RecordedLossSummary';

export interface RecordedLossesPanelProps {
  stateName: string;
  stats: AsyncResource<DisasterStatsResponse>;
  scopeNotice?: string;
  className?: string;
  classNames?: {
    root?: string;
    scope?: string;
  };
}

/** Recorded losses for the district's state, from the stats API. Replaces the old synthetic map. */
export const RecordedLossesPanel = ({
  stateName,
  stats,
  scopeNotice = STATE_LEVEL_RECORDS_NOTICE,
  className = '',
  classNames = {},
}: RecordedLossesPanelProps) => (
  <div
    className={[
      'flex-1 min-h-0 rounded-2xl border border-line dark:border-white/10 glass-card overflow-y-auto stats-scrollbar p-2.5 space-y-2.5',
      classNames.root ?? '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <p className={['text-[10px] font-mono text-text-muted leading-snug', classNames.scope ?? ''].join(' ')}>
      {stateName}: {scopeNotice}
    </p>

    {stats.isLoading ? <LossChartSkeleton /> : null}

    {!stats.isLoading && stats.error ? (
      <ResourceErrorState title="Could not load recorded losses" error={stats.error} onRetry={stats.refetch} />
    ) : null}

    {!stats.isLoading && !stats.error && stats.data ? (
      <>
        <RecordedLossSummary records={stats.data.cwc_flood_history ?? []} stateName={stateName} />
        <LossTimeSeriesChart stats={stats.data} compact className="p-3! rounded-2xl!" />
      </>
    ) : null}
  </div>
);
