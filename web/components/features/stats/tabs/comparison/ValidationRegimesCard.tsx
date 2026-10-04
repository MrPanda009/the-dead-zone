'use client';

import { useRef, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import type { ValidationRegime } from '@/lib/api/hazard';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import { REGIME_LABELS, VALIDATION_COPY } from '@/lib/stats/copy';

import { RegimeSummaryTile, type RegimeTileVariant } from './RegimeSummaryTile';

export interface ValidationRegimesCardProps {
  /** `by_regime` from the validation payload. */
  byRegime?: ValidationRegime[] | null;
  title?: ReactNode;
  unitLabel?: ReactNode;
  headlineLabel?: ReactNode;
  /** Builds the char-belt note from the formatted char population; pass null to hide it. */
  charNote?: ((people: string) => ReactNode) | null;
  className?: string;
  classNames?: {
    root?: string;
    header?: string;
    grid?: string;
    note?: string;
  };
  animation?: { disabled?: boolean; duration?: number; stagger?: number };
}

const KNOWN_VARIANTS: readonly RegimeTileVariant[] = ['floodplain', 'char_belt', 'channel'];

/** Floodplain / char belt / channel split, with population and agreement per regime. */
export const ValidationRegimesCard = ({
  byRegime,
  title = VALIDATION_COPY.regimesTitle,
  unitLabel = VALIDATION_COPY.regimesUnit,
  headlineLabel = VALIDATION_COPY.regimesHeadline,
  charNote = VALIDATION_COPY.charNote,
  className = '',
  classNames = {},
  animation = {},
}: ValidationRegimesCardProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { disabled = false, duration = 0.35, stagger = 0.04 } = animation;

  useGSAP(
    () => {
      if (disabled || prefersReducedMotion) return;
      gsap.from('.anim-regime-tile', { scale: 0.96, opacity: 0, duration, stagger, ease: 'power2.out' });
    },
    { scope: containerRef, dependencies: [byRegime?.length, disabled, prefersReducedMotion] },
  );

  if (!byRegime || byRegime.length === 0) return null;
  const charPopulation = byRegime.find((r) => r.regime === 'char_belt')?.population;

  return (
    <div
      ref={containerRef}
      className={[
        'p-2.5 rounded-xl bg-surface-0 dark:bg-forest-dark border border-line dark:border-white/10 space-y-2',
        classNames.root ?? '',
        className,
      ].join(' ')}
    >
      <div className={['flex items-center justify-between', classNames.header ?? ''].join(' ')}>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink dark:text-text-primary flex items-center gap-1.5">
          <span className="material-symbols-outlined text-xs text-citron">layers</span>
          {title}
        </span>
        <span className="text-[9px] font-mono text-text-muted">{unitLabel}</span>
      </div>

      <div className={['grid grid-cols-1 gap-1.5', classNames.grid ?? ''].join(' ')}>
        {byRegime.map((regime) => (
          <RegimeSummaryTile
            key={regime.regime}
            regime={regime}
            label={REGIME_LABELS[regime.regime]?.label ?? regime.regime}
            icon={REGIME_LABELS[regime.regime]?.icon}
            headlineLabel={headlineLabel}
            variant={KNOWN_VARIANTS.includes(regime.regime as RegimeTileVariant) ? (regime.regime as RegimeTileVariant) : 'other'}
          />
        ))}
      </div>

      {charNote && typeof charPopulation === 'number' && charPopulation > 0 && (
        <p className={['text-[9px] font-mono text-text-muted leading-tight', classNames.note ?? ''].join(' ')}>
          {charNote(Math.round(charPopulation).toLocaleString())}
        </p>
      )}
    </div>
  );
};
