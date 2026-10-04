import type { ReactNode } from 'react';

import { RegimeChip } from '@/components/common/RegimeChip';
import type { HazardRegime } from '@/lib/api/types';

export interface TopRiskGroupHeaderProps {
  regime: HazardRegime | null;
  count: number;
  /** Label for cells with no regime. */
  unclassifiedLabel?: ReactNode;
  className?: string;
}

/** Section heading when the ranking is grouped by regime. */
export const TopRiskGroupHeader = ({
  regime,
  count,
  unclassifiedLabel = 'No regime',
  className = '',
}: TopRiskGroupHeaderProps) => (
  <div className={['flex items-center gap-2 pt-2 first:pt-0', className].filter(Boolean).join(' ')}>
    {regime ? (
      <RegimeChip regime={regime} />
    ) : (
      <span className="font-mono text-[9px] uppercase tracking-wider text-ink-faint">{unclassifiedLabel}</span>
    )}
    <span className="font-mono text-[10px] tabular-nums text-ink-faint">{count.toLocaleString()} shown</span>
  </div>
);
