import type { ReactNode } from 'react';

import type { ValidationInterval } from '@/lib/api/hazard';
import type { BaselineVerdict } from '@/lib/stats/validation';
import { formatInterval } from '@/lib/stats/validation';

export interface BaselineComparisonRowProps {
  label: ReactNode;
  source?: ReactNode;
  /** ROC-AUC in [0, 1]. */
  auc: number;
  /** 95 % block-bootstrap interval of this predictor's AUC. */
  ci?: ValidationInterval;
  /** How this predictor compares with the model (paired interval of the difference). */
  verdict: BaselineVerdict;
  /** Text for the verdict chip; omitted for the model row. */
  verdictLabel?: ReactNode;
  className?: string;
  classNames?: {
    root?: string;
    label?: string;
    value?: string;
    track?: string;
    bar?: string;
    verdict?: string;
  };
}

const BAR_CLASSES: Record<BaselineVerdict, string> = {
  model: 'bg-citron',
  better_than_model: 'bg-emerald-500',
  worse_than_model: 'bg-amber-500/70',
  indistinguishable: 'bg-sky-500/60',
  unknown: 'bg-surface-2 dark:bg-white/20',
};

const CHIP_CLASSES: Record<BaselineVerdict, string> = {
  model: 'border-citron/30 text-citron',
  better_than_model: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
  worse_than_model: 'border-amber-500/30 text-amber-700 dark:text-amber-400',
  indistinguishable: 'border-sky-500/30 text-sky-700 dark:text-sky-400',
  unknown: 'border-line dark:border-white/10 text-text-muted',
};

export const BaselineComparisonRow = ({
  label,
  source,
  auc,
  ci,
  verdict,
  verdictLabel,
  className = '',
  classNames = {},
}: BaselineComparisonRowProps) => {
  const ciText = formatInterval(ci);
  return (
    <div
      className={[
        'anim-baseline-row p-1.5 rounded-lg font-mono hover:bg-surface-1 dark:hover:bg-white/5 transition-colors',
        verdict === 'model' ? 'bg-citron/5' : '',
        classNames.root ?? '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className={['min-w-0 truncate text-text-secondary', classNames.label ?? ''].join(' ')} title={typeof source === 'string' ? source : undefined}>
          <span className={verdict === 'model' ? 'font-bold text-ink dark:text-text-primary' : ''}>{label}</span>
        </span>
        <span className={['flex items-center gap-1.5 shrink-0', classNames.value ?? ''].join(' ')}>
          {verdictLabel && (
            <span className={['px-1 rounded border text-[8px] uppercase tracking-wide', CHIP_CLASSES[verdict], classNames.verdict ?? ''].join(' ')}>
              {verdictLabel}
            </span>
          )}
          <span className="font-bold text-ink dark:text-text-primary">{auc.toFixed(3)}</span>
          {ciText && <span className="text-[9px] text-text-muted">{ciText}</span>}
        </span>
      </div>
      <div className={['mt-0.5 h-1.5 w-full rounded-full bg-surface-2 dark:bg-white/5 overflow-hidden', classNames.track ?? ''].join(' ')}>
        <div
          className={['anim-baseline-bar h-full rounded-full', BAR_CLASSES[verdict], classNames.bar ?? ''].join(' ')}
          style={{ width: `${Math.max(0, Math.min(100, auc * 100))}%` }}
        />
      </div>
    </div>
  );
};
