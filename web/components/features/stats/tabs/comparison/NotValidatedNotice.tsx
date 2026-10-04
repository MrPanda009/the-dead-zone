import type { ReactNode } from 'react';

import { NOT_VALIDATED_NOTICE, NOT_VALIDATED_TITLE } from '@/lib/stats/copy';

export interface NotValidatedNoticeProps {
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
 * The only statement the comparison page makes about agreement until a validation run exists.
 * Neutral on purpose: it must not look like a pass.
 */
export const NotValidatedNotice = ({
  title = NOT_VALIDATED_TITLE,
  description = NOT_VALIDATED_NOTICE,
  className = '',
  classNames = {},
}: NotValidatedNoticeProps) => (
  <div
    className={[
      'p-2.5 rounded-xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 space-y-1 shrink-0',
      classNames.root ?? '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <div className={['flex items-center gap-1.5 text-xs font-bold text-text-secondary', classNames.title ?? ''].join(' ')}>
      <span className="material-symbols-outlined text-base">help</span>
      <span>{title}</span>
    </div>
    <p className={['text-[11px] leading-snug text-text-muted', classNames.description ?? ''].join(' ')}>{description}</p>
  </div>
);
