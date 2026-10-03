import type { ReactNode } from 'react';

export interface StatTileProps {
  label: ReactNode;
  /** Material Symbols icon name. */
  icon?: string;
  value: ReactNode;
  caption?: ReactNode;
  /** Tailwind text colour for the value. */
  valueClassName?: string;
  className?: string;
  classNames?: {
    root?: string;
    label?: string;
    value?: string;
    caption?: string;
  };
}

/** One labelled figure in the dossier grid. */
export const StatTile = ({
  label,
  icon,
  value,
  caption,
  valueClassName = 'text-ink dark:text-white',
  className = '',
  classNames = {},
}: StatTileProps) => (
  <div
    className={[
      'p-2.5 rounded-xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 space-y-0.5',
      classNames.root ?? '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <div className={['flex items-center gap-1 text-text-muted text-[9px] font-mono uppercase', classNames.label ?? ''].join(' ')}>
      {icon ? <span className="material-symbols-outlined text-[11px]">{icon}</span> : null}
      <span>{label}</span>
    </div>
    <div className={['text-sm sm:text-base font-bold font-mono', valueClassName, classNames.value ?? ''].join(' ')}>
      {value}
    </div>
    {caption ? (
      <div className={['text-[8px] text-text-muted font-mono', classNames.caption ?? ''].join(' ')}>{caption}</div>
    ) : null}
  </div>
);
