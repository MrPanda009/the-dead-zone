import type { ReactNode } from 'react';

import type { FloodValidationData } from '@/lib/api/hazard';

export interface ValidationGaugeNoteProps {
  gauges: NonNullable<FloodValidationData['gauges']>;
  title?: ReactNode;
  icon?: string;
  className?: string;
  classNames?: { root?: string; title?: string; body?: string };
}

/** Gauge-network audit and SAR temporal check, worded only from the payload. */
export const ValidationGaugeNote = ({
  gauges,
  title = 'Gauge network audit: ',
  icon = 'sensors',
  className = '',
  classNames = {},
}: ValidationGaugeNoteProps) => {
  const temporal = gauges.temporal_check?.status === 'evaluated' ? gauges.temporal_check : null;
  return (
    <div
      className={[
        'anim-metric-card p-2 rounded-lg bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10',
        'text-[10px] font-mono text-text-muted flex items-start gap-1.5',
        classNames.root ?? '',
        className,
      ].join(' ')}
    >
      <span className="material-symbols-outlined text-sm text-text-secondary shrink-0 mt-0.5">{icon}</span>
      <div className={classNames.body ?? ''}>
        <span className={['font-semibold text-text-secondary', classNames.title ?? ''].join(' ')}>{title}</span>
        <span>
          {gauges.finding ?? `${gauges.n_stations ?? 0} stations (${gauges.status}).`}
          {temporal &&
            ` SAR water fraction in flood-wave scenes ${(temporal.mean_in_event_fraction * 100).toFixed(1)}% vs ` +
              `${(temporal.mean_out_of_event_fraction * 100).toFixed(1)}% otherwise ` +
              `(Mann–Whitney U = ${temporal.mann_whitney_u.toFixed(1)}, p = ${temporal.p_value.toExponential(1)}).`}
        </span>
      </div>
    </div>
  );
};
