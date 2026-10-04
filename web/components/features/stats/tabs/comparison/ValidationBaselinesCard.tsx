'use client';

import { useRef, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import { VALIDATION_COPY } from '@/lib/stats/copy';
import type { BaselineComparison } from '@/lib/stats/validation';

import { BaselineComparisonRow } from './BaselineComparisonRow';

export interface ValidationBaselinesCardProps {
  /** Model first, then baselines — see `buildBaselineComparisons`. */
  rows: BaselineComparison[];
  title?: ReactNode;
  unitLabel?: ReactNode;
  footnote?: ReactNode;
  verdictLabels?: Partial<Record<BaselineComparison['verdict'], ReactNode>>;
  className?: string;
  classNames?: {
    root?: string;
    header?: string;
    list?: string;
    footnote?: string;
  };
  animation?: { disabled?: boolean; duration?: number; stagger?: number };
}

/** Model ROC-AUC next to each baseline, judged by the paired bootstrap interval of the difference. */
export const ValidationBaselinesCard = ({
  rows,
  title = VALIDATION_COPY.baselinesTitle,
  unitLabel = VALIDATION_COPY.baselinesUnit,
  footnote = VALIDATION_COPY.baselinesFootnote,
  verdictLabels = VALIDATION_COPY.verdict,
  className = '',
  classNames = {},
  animation = {},
}: ValidationBaselinesCardProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { disabled = false, duration = 0.45, stagger = 0.04 } = animation;

  useGSAP(
    () => {
      if (disabled || prefersReducedMotion) return;
      gsap.from('.anim-baseline-row', { y: 6, opacity: 0, duration, stagger, ease: 'power2.out' });
      gsap.from('.anim-baseline-bar', { scaleX: 0, transformOrigin: 'left center', duration, stagger, ease: 'power2.out' });
    },
    { scope: containerRef, dependencies: [rows.length, disabled, prefersReducedMotion] },
  );

  if (rows.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={[
        'p-2.5 rounded-xl bg-surface-0 dark:bg-forest-dark border border-line dark:border-white/10 space-y-1.5',
        classNames.root ?? '',
        className,
      ].join(' ')}
    >
      <div className={['flex items-center justify-between', classNames.header ?? ''].join(' ')}>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink dark:text-text-primary flex items-center gap-1.5">
          <span className="material-symbols-outlined text-xs text-citron">compare_arrows</span>
          {title}
        </span>
        <span className="text-[9px] font-mono text-text-muted">{unitLabel}</span>
      </div>

      <div className={['space-y-0.5', classNames.list ?? ''].join(' ')}>
        {rows.map((row) => (
          <BaselineComparisonRow
            key={row.key}
            label={row.label}
            source={row.source}
            auc={row.auc}
            ci={row.ci}
            verdict={row.verdict}
            verdictLabel={row.verdict === 'model' ? undefined : verdictLabels[row.verdict]}
          />
        ))}
      </div>

      {footnote && (
        <p className={['text-[9px] font-mono text-text-muted leading-tight pt-1 border-t border-line/60 dark:border-white/5', classNames.footnote ?? ''].join(' ')}>
          {footnote}
        </p>
      )}
    </div>
  );
};
