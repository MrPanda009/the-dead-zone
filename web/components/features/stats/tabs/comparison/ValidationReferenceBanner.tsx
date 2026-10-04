import type { ReactNode } from 'react';

export interface ValidationReferenceBannerProps {
  title?: ReactNode;
  versionLabel: ReactNode;
  yearsLabel: ReactNode;
  referenceName: ReactNode;
  /** e.g. "2,354 floodplain cells". */
  scopeLabel: ReactNode;
  className?: string;
  classNames?: { root?: string; title?: string; badge?: string; body?: string };
}

export const ValidationReferenceBanner = ({
  title = 'Measured spatial agreement',
  versionLabel,
  yearsLabel,
  referenceName,
  scopeLabel,
  className = '',
  classNames = {},
}: ValidationReferenceBannerProps) => (
  <div
    className={[
      'p-2.5 rounded-xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 space-y-1',
      classNames.root ?? '',
      className,
    ].join(' ')}
  >
    <div className="flex items-center justify-between text-[11px] font-mono">
      <span className={['text-citron font-bold uppercase tracking-wider flex items-center gap-1', classNames.title ?? ''].join(' ')}>
        <span className="w-1.5 h-1.5 rounded-full bg-citron" />
        {title}
      </span>
      <div className="flex items-center gap-1.5">
        <span className={['px-1.5 py-0.5 rounded bg-citron/15 text-citron text-[9px] font-bold border border-citron/30', classNames.badge ?? ''].join(' ')}>
          {versionLabel}
        </span>
        <span className="text-text-muted">{yearsLabel}</span>
      </div>
    </div>
    <p className={['text-[11px] text-text-secondary', classNames.body ?? ''].join(' ')}>
      Reference: <span className="font-semibold text-ink dark:text-text-primary">{referenceName}</span> ({scopeLabel})
    </p>
  </div>
);
