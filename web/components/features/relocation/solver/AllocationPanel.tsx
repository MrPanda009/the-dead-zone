'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { EmptyState, ErrorState, SectionHeader } from '@/components/common';
import { M3_DURATION, M3_EASE } from '@/lib/motion/m3';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import type { ApiError } from '@/lib/api/client';
import type { AllocationAssignment, AllocationPlanResponse } from '@/lib/api/types';

import { AllocationAssignmentRow } from './AllocationAssignmentRow';
import { AllocationSummary } from './AllocationSummary';
import { AllocationWarnings } from './AllocationWarnings';

export interface AllocationPanelProps {
  plan: AllocationPlanResponse | null;
  isSolving?: boolean;
  error?: ApiError | null;
  /** Highlights assignments originating from this habitation. */
  highlightedHabitationId?: number | null;
  onSelectAssignment?: (assignment: AllocationAssignment) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Solver parameter controls, rendered above the result. */
  controlsSlot?: React.ReactNode;
  emptyStateSlot?: React.ReactNode;
  /** Callback to collapse the right panel. */
  onToggleCollapse?: () => void;
  className?: string;
  classNames?: {
    root?: string;
    header?: string;
    controls?: string;
    result?: string;
    list?: string;
  };
  animation?: {
    disabled?: boolean;
    stagger?: number;
    duration?: number;
  };
}

/** Solver parameters, the resulting plan, and orchestrated results reveal. */
export const AllocationPanel = ({
  plan,
  isSolving = false,
  error = null,
  highlightedHabitationId = null,
  onSelectAssignment,
  title = 'Allocation plan',
  description,
  controlsSlot,
  emptyStateSlot,
  onToggleCollapse,
  className = '',
  classNames = {},
  animation = {},
}: AllocationPanelProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const {
    disabled: animationDisabled = false,
    stagger = 0.035,
    duration = M3_DURATION.medium2,
  } = animation;
  const animate = !animationDisabled && !prefersReducedMotion;

  const assignments = plan?.assignments ?? [];

  useGSAP(
    () => {
      if (!animate || !plan) return;

      const tl = gsap.timeline();

      if (rootRef.current?.querySelector('[data-allocation-summary]')) {
        tl.from('[data-allocation-summary]', {
          y: 10,
          opacity: 0,
          duration: M3_DURATION.medium2,
          ease: M3_EASE.decelerate,
          clearProps: 'transform,opacity',
        });
      }

      if (rootRef.current?.querySelector('[data-allocation-warnings]')) {
        tl.from(
          '[data-allocation-warnings]',
          {
            y: -6,
            opacity: 0,
            duration: M3_DURATION.short4,
            ease: 'back.out(1.4)',
            clearProps: 'transform,opacity',
          },
          '-=0.1',
        );
      }

      if (assignments.length > 0 && rootRef.current?.querySelector('[data-assignment-row]')) {
        tl.from(
          '[data-assignment-row]',
          {
            y: 8,
            opacity: 0,
            duration,
            stagger,
            ease: M3_EASE.decelerate,
            clearProps: 'transform,opacity',
          },
          '-=0.15',
        );
      }
    },
    { scope: rootRef, dependencies: [plan, assignments.length, animate, duration, stagger] },
  );

  return (
    <div
      ref={rootRef}
      className={['flex h-full min-h-0 flex-col gap-4', classNames.root ?? '', className].filter(Boolean).join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <SectionHeader title={title} description={description} className={classNames.header} />
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Collapse allocation panel"
            aria-label="Collapse allocation panel"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line/60 bg-surface-1/60 text-ink-muted hover:border-line-strong hover:bg-surface-2 hover:text-ink transition-all active:scale-95 cursor-pointer"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {controlsSlot ? <div className={classNames.controls}>{controlsSlot}</div> : null}

      {error ? (
        <ErrorState
          title="Allocation failed"
          message={
            error.code === 'UNAUTHENTICATED' || error.status === 401
              ? 'Running an allocation requires an authenticated government official. Sign in to continue.'
              : error.message
          }
          code={error.code}
          requestId={error.requestId}
        />
      ) : isSolving ? (
        <div aria-hidden className="h-32 animate-pulse rounded-xl border border-line/40 bg-surface-1/40" />
      ) : !plan ? (
        (emptyStateSlot ?? (
          <EmptyState
            title="No plan yet"
            description="Set the solver parameters and run an allocation to see how demand maps onto available sites."
          />
        ))
      ) : (
        <div className={['flex min-h-0 flex-1 flex-col gap-3', classNames.result ?? ''].join(' ')}>
          <AllocationSummary plan={plan} />

          <AllocationWarnings warnings={plan.group_split_warnings ?? []} />

          {assignments.length === 0 ? (
            <EmptyState
              title="Zero households allocated"
              description="No households could be allocated. Widen search radius or lower constraints."
            />
          ) : (
            <div className={['flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5', classNames.list ?? ''].join(' ')}>
              {assignments.map((assignment) => (
                <AllocationAssignmentRow
                  key={`${assignment.habitation_id}-${assignment.site_id}`}
                  assignment={assignment}
                  isHighlighted={highlightedHabitationId === assignment.habitation_id}
                  onSelect={onSelectAssignment}
                  animation={{ disabled: !animate }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
