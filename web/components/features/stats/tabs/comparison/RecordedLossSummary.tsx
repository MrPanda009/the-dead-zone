import type { ReactNode } from 'react';

import { EmptyState } from '@/components/common/EmptyState';
import type { CwcFloodDamageDTO } from '@/lib/api/stats';
import { formatInteger } from '@/lib/stats/format';

import { RecordedLossRow } from './RecordedLossRow';

export interface RecordedLossSummaryProps {
  /** CWC flood damage rows for the selected state, any order. */
  records: readonly CwcFloodDamageDTO[];
  stateName: string;
  title?: ReactNode;
  className?: string;
  classNames?: {
    root?: string;
    title?: string;
  };
}

/** Latest CWC flood-damage entry for the state. Values are reported as published, per state. */
export const RecordedLossSummary = ({
  records,
  stateName,
  title = 'Latest CWC flood-damage entry',
  className = '',
  classNames = {},
}: RecordedLossSummaryProps) => {
  const latest =
    records.length > 0
      ? records.reduce((best, r) => (r.calendar_year > best.calendar_year ? r : best), records[0])
      : null;

  if (!latest) {
    return (
      <EmptyState
        title={`No CWC entry for ${stateName}`}
        description="The CWC flood-damage series has no row for this state in the loaded years."
        className={className}
      />
    );
  }

  return (
    <div
      className={[
        'p-3 rounded-xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 space-y-1',
        classNames.root ?? '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={['text-[10px] font-mono uppercase font-semibold text-text-muted', classNames.title ?? ''].join(' ')}>
        {title} · {latest.calendar_year}
      </div>
      <RecordedLossRow label="Human lives lost" value={formatInteger(latest.human_lives_lost)} valueClassName="text-rose-500" />
      <RecordedLossRow label="Area affected" value={`${latest.area_affected_mha} Mha`} valueClassName="text-amber-500" />
      <RecordedLossRow label="Damage" value={`₹${formatInteger(Math.round(latest.total_damage_crores))} Cr`} />
    </div>
  );
};
