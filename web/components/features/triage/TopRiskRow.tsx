'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { RegimeChip } from '@/components/common/RegimeChip';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import type { HazardCell } from '@/lib/api/types';
import { rgbaToCss, susceptibilityColor } from '@/lib/map/colorScale';
import { formatH3, formatScore } from '@/lib/map/format';

export interface TopRiskRowProps {
  cell: HazardCell;
  rank: number;
  breaks: number[];
  isSelected?: boolean;
  /** Marks the row as at or above the PRZ threshold. */
  isPrzCandidate?: boolean;
  /** Shows the cell's regime as an icon chip before the score. */
  showRegime?: boolean;
  onSelect?: (h3: string) => void;
  onHover?: (h3: string | null) => void;
  className?: string;
  classNames?: {
    root?: string;
    rank?: string;
    label?: string;
    score?: string;
  };
  animation?: {
    disabled?: boolean;
    duration?: number;
  };
}

/** One row of the ranked cell list. Extracted so the list never inlines JSX in `.map()`. */
export const TopRiskRow = ({
  cell,
  rank,
  breaks,
  isSelected = false,
  isPrzCandidate = false,
  showRegime = true,
  onSelect,
  onHover,
  className = '',
  classNames = {},
  animation = {},
}: TopRiskRowProps) => {
  const rootRef = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const { disabled: animationDisabled = false, duration = 0.18 } = animation;
  const animate = !animationDisabled && !prefersReducedMotion;

  useGSAP(
    () => {
      if (!animate || !rootRef.current) return;
      const element = rootRef.current;
      const to = (x: number) => gsap.to(element, { x, duration, ease: 'power2.out', overwrite: 'auto' });
      const onEnter = () => to(2);
      const onLeave = () => to(0);
      element.addEventListener('mouseenter', onEnter);
      element.addEventListener('mouseleave', onLeave);
      return () => {
        element.removeEventListener('mouseenter', onEnter);
        element.removeEventListener('mouseleave', onLeave);
      };
    },
    { scope: rootRef, dependencies: [animate, duration] },
  );

  return (
    <button
      ref={rootRef}
      type="button"
      data-risk-row
      onClick={() => onSelect?.(cell.h3)}
      onMouseEnter={() => onHover?.(cell.h3)}
      onMouseLeave={() => onHover?.(null)}
      className={[
        'flex w-full items-center gap-2 rounded-xl border px-2 py-1.5 text-left will-change-transform',
        'transition-colors duration-150',
        isSelected ? 'border-accent bg-accent/15 text-ink font-semibold' : 'border-transparent hover:border-line hover:bg-surface-2 dark:hover:bg-white/5',
        classNames.root ?? '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        className={['w-5 shrink-0 font-mono text-[10px] text-ink-faint', classNames.rank ?? ''].join(' ')}
      >
        {rank}
      </span>
      <span
        aria-hidden
        style={{ backgroundColor: rgbaToCss(susceptibilityColor(cell.susceptibility, breaks)) }}
        className="h-4 w-1 shrink-0 rounded-full"
      />
      <span
        className={['flex-1 truncate font-mono text-[10px] text-ink-muted', classNames.label ?? ''].join(' ')}
      >
        {formatH3(cell.h3)}
      </span>
      {showRegime && cell.hazard_regime ? (
        <RegimeChip regime={cell.hazard_regime} showLabel={false} className="shrink-0" />
      ) : null}
      {isPrzCandidate ? (
        <span className="shrink-0 rounded-md border border-red-500/60 bg-red-500/10 px-1.5 py-0.2 text-[9px] font-mono font-bold tracking-wider uppercase text-red-600 dark:text-red-400">
          PRZ
        </span>
      ) : null}
      <span
        className={['w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-ink', classNames.score ?? ''].join(' ')}
      >
        {formatScore(cell.susceptibility)}
      </span>
    </button>
  );
};
