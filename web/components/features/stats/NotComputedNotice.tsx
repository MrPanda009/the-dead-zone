import type { ReactNode } from 'react';

export interface NotComputedNoticeProps {
  districtName: string;
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
  classNames?: {
    root?: string;
    title?: string;
    description?: string;
  };
}

/**
 * Shown where a computed flood figure would go when the API reports `not_computed`.
 * It states the gap plainly; recorded history for the state still applies.
 */
export const NotComputedNotice = ({
  districtName,
  title,
  description = 'No SAR-derived flood layer has been computed for this district. Screening relies on recorded state-level losses only.',
  className = '',
  classNames = {},
}: NotComputedNoticeProps) => (
  <div
    className={[
      'p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 space-y-1',
      classNames.root ?? '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <div className={['font-bold flex items-center gap-1.5', classNames.title ?? ''].join(' ')}>
      <span className="material-symbols-outlined text-base">info</span>
      <span>{title ?? `No SAR flood layer for ${districtName}`}</span>
    </div>
    <p className={['text-[11px] leading-relaxed opacity-90', classNames.description ?? ''].join(' ')}>
      {description}
    </p>
  </div>
);
