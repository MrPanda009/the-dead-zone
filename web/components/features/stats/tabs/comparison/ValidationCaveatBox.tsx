import type { ReactNode } from 'react';

export interface ValidationCaveatBoxProps {
  title?: ReactNode;
  children: ReactNode;
  icon?: string;
  className?: string;
  classNames?: { root?: string; title?: string; body?: string };
}

export const ValidationCaveatBox = ({
  title = 'Claim boundary',
  children,
  icon = 'info',
  className = '',
  classNames = {},
}: ValidationCaveatBoxProps) => (
  <div
    className={[
      'p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] leading-relaxed',
      'text-amber-900 dark:text-amber-200/90 font-mono',
      classNames.root ?? '',
      className,
    ].join(' ')}
  >
    <div className={['font-bold flex items-center gap-1 mb-0.5 text-amber-800 dark:text-amber-300', classNames.title ?? ''].join(' ')}>
      <span className="material-symbols-outlined text-sm">{icon}</span>
      <span>{title}</span>
    </div>
    <div className={classNames.body ?? ''}>{children}</div>
  </div>
);
