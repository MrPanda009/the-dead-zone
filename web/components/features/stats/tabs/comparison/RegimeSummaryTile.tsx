import type { ReactNode } from 'react';

import type { ValidationRegime } from '@/lib/api/hazard';
import { formatScore } from '@/lib/stats/validation';

export type RegimeTileVariant = 'floodplain' | 'char_belt' | 'channel' | 'other';

export interface RegimeSummaryTileProps {
  regime: ValidationRegime;
  label: ReactNode;
  icon?: string;
  /** Marks the regime(s) scored in the headline metrics. */
  headlineLabel?: ReactNode;
  peopleLabel?: ReactNode;
  variant?: RegimeTileVariant;
  className?: string;
  classNames?: {
    root?: string;
    header?: string;
    population?: string;
    footer?: string;
  };
}

const VARIANT_CLASSES: Record<RegimeTileVariant, string> = {
  floodplain: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  char_belt: 'bg-citron/15 border-citron/30 text-citron',
  channel: 'bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-400',
  other: 'bg-surface-1 dark:bg-white/5 border-line dark:border-white/10 text-text-secondary',
};

export const RegimeSummaryTile = ({
  regime,
  label,
  icon = 'layers',
  headlineLabel,
  peopleLabel = 'people',
  variant = 'other',
  className = '',
  classNames = {},
}: RegimeSummaryTileProps) => {
  const prevalence = regime.ndem_prevalence;
  return (
    <div
      className={[
        'anim-regime-tile p-2 rounded-lg border flex flex-col justify-between font-mono',
        VARIANT_CLASSES[variant],
        classNames.root ?? '',
        className,
      ].join(' ')}
    >
      <div className={['flex items-center justify-between gap-2 text-[10px]', classNames.header ?? ''].join(' ')}>
        <span className="uppercase font-bold flex items-center gap-1 min-w-0">
          <span className="material-symbols-outlined text-xs">{icon}</span>
          <span className="truncate">{label}</span>
          {regime.in_headline && headlineLabel && (
            <span className="px-1 rounded border border-current text-[8px] shrink-0">{headlineLabel}</span>
          )}
        </span>
        <span className="opacity-80 shrink-0">{regime.share_pct}% of cells</span>
      </div>
      <div className={['text-[11px] font-bold mt-1 text-ink dark:text-text-primary', classNames.population ?? ''].join(' ')}>
        {typeof regime.population === 'number' ? Math.round(regime.population).toLocaleString() : 'N/A'}
        <span className="text-[9px] font-normal text-text-muted ml-0.5">{peopleLabel}</span>
      </div>
      <div className={['mt-1 pt-1 border-t border-line/40 dark:border-white/10 text-[9px] text-text-secondary grid grid-cols-2 sm:grid-cols-4 gap-x-2', classNames.footer ?? ''].join(' ')}>
        <span>Mean S {formatScore(regime.mean_susceptibility, 2)}</span>
        <span>NDEM {typeof prevalence === 'number' ? `${(prevalence * 100).toFixed(0)}%` : 'N/A'}</span>
        <span>AUC {formatScore(regime.roc_auc)}</span>
        <span>n {regime.eval_cell_count ?? regime.cell_count}</span>
      </div>
    </div>
  );
};
