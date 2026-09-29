'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { Badge } from '@/components/ui';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import type { AllocationPlanResponse, HabitationListItem } from '@/lib/api/types';

export interface RelocationHeaderMetaProps {
  totalHabitations?: number;
  selectedHabitation?: HabitationListItem | null;
  plan?: AllocationPlanResponse | null;
  className?: string;
}

/** Contextual chips for the workspace header with microinteraction pop on state change. */
export const RelocationHeaderMeta = ({
  totalHabitations = 0,
  selectedHabitation = null,
  plan = null,
  className = '',
}: RelocationHeaderMetaProps) => {
  const rootRef = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (prefersReducedMotion) return;

      if (plan && rootRef.current?.querySelector('[data-plan-badge]')) {
        gsap.fromTo(
          '[data-plan-badge]',
          { scale: 0.92, opacity: 0.8 },
          { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2)' }
        );
      }
    },
    { scope: rootRef, dependencies: [plan?.allocation_run_id, prefersReducedMotion] },
  );

  useGSAP(
    () => {
      if (prefersReducedMotion) return;

      if (selectedHabitation && rootRef.current?.querySelector('[data-hab-badge]')) {
        gsap.fromTo(
          '[data-hab-badge]',
          { x: -6, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.25, ease: 'power2.out' }
        );
      }
    },
    { scope: rootRef, dependencies: [selectedHabitation?.id, prefersReducedMotion] },
  );

  return (
    <span ref={rootRef} className={['flex items-center gap-1.5', className].filter(Boolean).join(' ')}>
      {totalHabitations > 0 ? (
        <Badge variant="neutral">{totalHabitations.toLocaleString()} habitations</Badge>
      ) : null}
      {selectedHabitation ? (
        <span data-hab-badge className="inline-flex">
          <Badge variant="info">{selectedHabitation.name}</Badge>
        </span>
      ) : null}
      {plan ? (
        <span data-plan-badge className="inline-flex">
          <Badge
            variant={plan.unmet_demand_households > 0 ? 'warning' : 'safe'}
            title="Households the last run could not place"
          >
            {plan.unmet_demand_households.toLocaleString()} unmet
          </Badge>
        </span>
      ) : null}
    </span>
  );
};
