'use client';

import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { EmptyState } from '@/components/common/EmptyState';
import { FilterChip } from '@/components/common/FilterChip';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import { useRankedCells, type RegimeFilter } from '@/lib/hooks/useRankedCells';
import type { HazardCell } from '@/lib/api/types';

import { RegimeComparabilityNote } from './RegimeComparabilityNote';
import { RegimeFilterBar } from './RegimeFilterBar';
import { TopRiskGroupHeader } from './TopRiskGroupHeader';
import { TopRiskRow } from './TopRiskRow';

export interface TopRiskListProps {
  cells: HazardCell[];
  breaks: number[];
  przThreshold: number;
  title?: string;
  description?: string;
  /** Rows to render (per regime when grouped). */
  limit?: number;
  selectedH3?: string | null;
  onSelect?: (h3: string) => void;
  onHover?: (h3: string | null) => void;
  /** Shows the regime filter chips and the group-by toggle. */
  showRegimeControls?: boolean;
  /** Controlled regime filter. Omit to let the list manage it. */
  regime?: RegimeFilter;
  onRegimeChange?: (next: RegimeFilter) => void;
  defaultGroupByRegime?: boolean;
  className?: string;
  classNames?: {
    root?: string;
    header?: string;
    list?: string;
    controls?: string;
  };
  animation?: {
    disabled?: boolean;
    stagger?: number;
    duration?: number;
  };
}

/**
 * Highest-scoring cells in the current layer, filterable and groupable by hazard regime.
 *
 * Unobserved and channel cells are excluded: they carry a placeholder 0.00, not a score, and
 * letting that sit in a hazard ranking would be actively misleading.
 */
export const TopRiskList = ({
  cells,
  breaks,
  przThreshold,
  title = 'Highest susceptibility',
  description,
  limit = 40,
  selectedH3 = null,
  onSelect,
  onHover,
  showRegimeControls = true,
  regime: controlledRegime,
  onRegimeChange,
  defaultGroupByRegime = false,
  className = '',
  classNames = {},
  animation = {},
}: TopRiskListProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [internalRegime, setInternalRegime] = useState<RegimeFilter>('all');
  const [groupByRegime, setGroupByRegime] = useState(defaultGroupByRegime);

  const regime = controlledRegime ?? internalRegime;
  const handleRegimeChange = (next: RegimeFilter) => {
    setInternalRegime(next);
    onRegimeChange?.(next);
  };

  const { disabled: animationDisabled = false, stagger = 0.02, duration = 0.3 } = animation;
  const animate = !animationDisabled && !prefersReducedMotion;

  const { ranked, groups, counts, isMixed } = useRankedCells({ cells, regime, groupByRegime, limit });
  const hasRegimes = counts.floodplain + counts.char_belt > 0;
  const controls = showRegimeControls && hasRegimes;

  useGSAP(
    () => {
      if (!animate || ranked.length === 0) return;
      gsap.fromTo(
        '[data-risk-row]',
        { y: 6, opacity: 0 },
        { y: 0, opacity: 1, duration, stagger, ease: 'power2.out', clearProps: 'opacity,transform' },
      );
    },
    { scope: rootRef, dependencies: [ranked, animate, duration, stagger] },
  );

  return (
    <div
      ref={rootRef}
      className={['flex flex-col gap-2', classNames.root ?? '', className].filter(Boolean).join(' ')}
    >
      <div className={['flex flex-col', classNames.header ?? ''].join(' ')}>
        <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-text-secondary">
          {title}
        </span>
        <span className="text-[10px] font-mono text-text-muted">
          {description ?? `Top ${ranked.length} of ${cells.length.toLocaleString()} cells`}
        </span>
      </div>

      {controls ? (
        <div className={['flex flex-col gap-1.5', classNames.controls ?? ''].join(' ')}>
          <RegimeFilterBar selected={regime} onChange={handleRegimeChange} counts={counts} />
          <FilterChip
            label="Group by regime"
            active={groupByRegime}
            onToggle={() => setGroupByRegime((value) => !value)}
            className="self-start"
          />
          {isMixed ? <RegimeComparabilityNote /> : null}
        </div>
      ) : null}

      {ranked.length === 0 ? (
        <EmptyState title="No ranked cells" description="No measured cells in the current layer." />
      ) : (
        <div className={['flex flex-col gap-0.5', classNames.list ?? ''].join(' ')}>
          {groups.map((group) => (
            <div key={group.regime ?? 'none'} className="flex flex-col gap-0.5">
              {groupByRegime ? <TopRiskGroupHeader regime={group.regime} count={group.rows.length} /> : null}
              {group.rows.map(({ cell, rank }) => (
                <TopRiskRow
                  key={cell.h3}
                  cell={cell}
                  rank={rank}
                  breaks={breaks}
                  isSelected={cell.h3 === selectedH3}
                  isPrzCandidate={cell.susceptibility >= przThreshold}
                  onSelect={onSelect}
                  onHover={onHover}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
