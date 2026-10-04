'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { RegimeChip } from '@/components/common/RegimeChip';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import type { RegimeContext } from '@/lib/api/types';

import { RegimeHazardTag } from './RegimeHazardTag';

export interface RegimeContextBannerProps {
  context: RegimeContext;
  /** Shows the hazard mechanism tags under the description. */
  showHazards?: boolean;
  /** Shows the scoring-basis line at the foot of the banner. */
  showScoringBasis?: boolean;
  className?: string;
  classNames?: {
    root?: string;
    header?: string;
    description?: string;
    hazards?: string;
    basis?: string;
  };
  animation?: {
    disabled?: boolean;
    duration?: number;
  };
}

const TONE_CLASSES: Record<RegimeContext['regime'], string> = {
  floodplain: 'border-emerald-500/30 bg-emerald-500/5',
  char_belt: 'border-amber-500/35 bg-amber-500/8',
  channel: 'border-sky-500/30 bg-sky-500/8',
};

/**
 * Explains what the cell's hazard regime means, so a score is never read without its context:
 * a char-belt 0.72 and a floodplain 0.72 come from different formulas and different threats.
 */
export const RegimeContextBanner = ({
  context,
  showHazards = true,
  showScoringBasis = true,
  className = '',
  classNames = {},
  animation = {},
}: RegimeContextBannerProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const { disabled: animationDisabled = false, duration = 0.3 } = animation;
  const animate = !animationDisabled && !prefersReducedMotion;

  useGSAP(
    () => {
      if (!animate || !rootRef.current) return;
      gsap.fromTo(
        rootRef.current,
        { y: 6, opacity: 0 },
        { y: 0, opacity: 1, duration, ease: 'power2.out', clearProps: 'opacity,transform' },
      );
    },
    { scope: rootRef, dependencies: [context.regime, animate, duration] },
  );

  return (
    <div
      ref={rootRef}
      data-regime-banner={context.regime}
      className={[
        'flex flex-col gap-2 rounded-xl border px-3 py-2.5',
        TONE_CLASSES[context.regime],
        classNames.root ?? '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={['flex items-center gap-2', classNames.header ?? ''].join(' ')}>
        <RegimeChip regime={context.regime} size="md" />
        <span className="text-[11px] font-semibold text-ink">{context.headline}</span>
      </div>

      <p className={['text-[10px] leading-snug text-ink-muted', classNames.description ?? ''].join(' ')}>
        {context.description}
      </p>

      {showHazards && context.primary_hazards.length > 0 ? (
        <div className={['flex flex-wrap gap-1', classNames.hazards ?? ''].join(' ')}>
          {context.primary_hazards.map((hazard) => (
            <RegimeHazardTag key={hazard}>{hazard}</RegimeHazardTag>
          ))}
        </div>
      ) : null}

      {showScoringBasis ? (
        <p className={['font-mono text-[9px] text-ink-faint', classNames.basis ?? ''].join(' ')}>
          Scored by {context.scoring_basis}
        </p>
      ) : null}
    </div>
  );
};
