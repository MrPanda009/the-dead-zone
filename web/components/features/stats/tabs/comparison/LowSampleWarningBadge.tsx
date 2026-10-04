import type { ReactNode } from 'react';

export interface LowSampleWarningBadgeProps {
  message: ReactNode;
  icon?: string;
  className?: string;
  classNames?: { root?: string; icon?: string; message?: string };
}

/** Flags a metric that rests on very few negative cells. */
export const LowSampleWarningBadge = ({
  message,
  icon = 'warning',
  className = '',
  classNames = {},
}: LowSampleWarningBadgeProps) => (
  <div
    role="note"
    className={[
      'anim-metric-card p-2 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-start gap-1.5',
      'text-[10px] font-mono text-amber-900 dark:text-amber-200/90',
      classNames.root ?? '',
      className,
    ].join(' ')}
  >
    <span className={['material-symbols-outlined text-sm shrink-0', classNames.icon ?? ''].join(' ')}>{icon}</span>
    <span className={classNames.message ?? ''}>{message}</span>
  </div>
);
