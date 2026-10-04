import type { ReactNode } from 'react';

import { HexMarker } from '@/components/common/HexMarker';

import { ComparisonCaveats } from './ComparisonCaveats';
import { NotValidatedNotice } from './NotValidatedNotice';

export interface ValidationStatusCardProps {
  /**
   * A measured validation result. When omitted the card shows "Not yet validated".
   * Nothing on this page may display an agreement figure without passing one here.
   */
  validationSlot?: ReactNode;
  /** Caveats returned by the API for the selected state's recorded data. */
  apiCaveats?: readonly string[];
  title?: ReactNode;
  subtitle?: ReactNode;
  sourcesLabel?: ReactNode;
  className?: string;
  classNames?: {
    root?: string;
    header?: string;
    body?: string;
    footer?: string;
  };
}

export const ValidationStatusCard = ({
  validationSlot,
  apiCaveats = [],
  title = 'VALIDATION STATUS',
  subtitle = 'Computed susceptibility and recorded losses, shown side by side',
  sourcesLabel = 'Records: MHA · CWC · NCRB (state-level)',
  className = '',
  classNames = {},
}: ValidationStatusCardProps) => (
  <div
    className={[
      'min-h-[280px] lg:min-h-0 lg:h-full flex flex-col glass-card p-3 sm:p-3.5 rounded-2xl border border-line dark:border-white/10 shadow-xl lg:overflow-y-auto pr-1 stats-scrollbar gap-2',
      classNames.root ?? '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <div className={['border-b border-line dark:border-white/10 pb-1.5 shrink-0', classNames.header ?? ''].join(' ')}>
      <div className="text-[9px] font-mono uppercase tracking-wider text-citron font-bold flex items-center gap-1">
        <HexMarker />
        <span>{title}</span>
      </div>
      <div className="text-[11px] text-text-muted font-mono mt-0.5">{subtitle}</div>
    </div>

    <div className={['lg:flex-1 lg:min-h-0 lg:overflow-y-auto stats-scrollbar space-y-2.5 pr-1', classNames.body ?? ''].join(' ')}>
      {validationSlot ?? <NotValidatedNotice />}
      <ComparisonCaveats apiCaveats={apiCaveats} />
    </div>

    <div className={['pt-2 border-t border-line dark:border-white/10 text-[10px] text-text-muted font-mono shrink-0', classNames.footer ?? ''].join(' ')}>
      {sourcesLabel}
    </div>
  </div>
);
