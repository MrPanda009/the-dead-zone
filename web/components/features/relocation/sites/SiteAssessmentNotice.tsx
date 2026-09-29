'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { M3_DURATION, M3_EASE } from '@/lib/motion/m3';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import type { CandidateSiteItem } from '@/lib/api/types';

export interface SiteAssessmentNoticeProps {
  sites: CandidateSiteItem[];
  className?: string;
  classNames?: {
    root?: string;
    text?: string;
  };
}

/**
 * States how far the listed sites have actually been assessed.
 *
 * Smooth entrance animation so it doesn't jarringly snap into place.
 */
export const SiteAssessmentNotice = ({
  sites,
  className = '',
  classNames = {},
}: SiteAssessmentNoticeProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const partial = sites.filter((site) => site.assessment_status !== 'fully_assessed');
  const shouldRender = sites.length > 0 && partial.length > 0;

  useGSAP(
    () => {
      if (prefersReducedMotion || !rootRef.current || !shouldRender) return;
      gsap.from(rootRef.current, {
        y: 6,
        opacity: 0,
        duration: M3_DURATION.medium2,
        ease: M3_EASE.decelerate,
        clearProps: 'transform,opacity',
      });
    },
    { scope: rootRef, dependencies: [shouldRender, prefersReducedMotion] },
  );

  if (!shouldRender) return null;

  return (
    <div
      ref={rootRef}
      className={[
        'rounded-xl border border-line/60 bg-surface-1/40 px-3 py-2',
        classNames.root ?? '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <p className={['text-[10px] leading-snug text-ink-muted', classNames.text ?? ''].join(' ')}>
        <span className="font-semibold text-ink">
          {partial.length} of {sites.length} sites
        </span>{' '}
        are not fully assessed. Their capacity figures are derived from policy norms, not from
        measured yield or surveyed infrastructure.
      </p>
    </div>
  );
};
