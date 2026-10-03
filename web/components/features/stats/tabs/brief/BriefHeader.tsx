import type { ReactNode } from 'react';

export interface BriefHeaderProps {
  title: ReactNode;
  /** Controls on the right: district picker, status badge. */
  actionsSlot?: ReactNode;
  className?: string;
  classNames?: {
    root?: string;
    title?: string;
    actions?: string;
  };
}

/** Title row shared by the Brief and Model vs History tabs. */
export const BriefHeader = ({ title, actionsSlot, className = '', classNames = {} }: BriefHeaderProps) => (
  <div
    className={[
      'flex flex-wrap items-center justify-between gap-2.5 shrink-0 pb-1.5',
      classNames.root ?? '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <h1
      className={[
        'font-display text-base sm:text-lg lg:text-xl font-extrabold text-ink dark:text-white tracking-tight leading-tight',
        classNames.title ?? '',
      ].join(' ')}
    >
      {title}
    </h1>
    <div className={['flex items-center gap-2', classNames.actions ?? ''].join(' ')}>{actionsSlot}</div>
  </div>
);
