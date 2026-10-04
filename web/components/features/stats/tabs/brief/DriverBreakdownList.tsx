'use client';

import { useRef, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { EmptyState } from '@/components/common/EmptyState';
import { HexMarker } from '@/components/common/HexMarker';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import type { DriverRowData } from '@/lib/stats/derive';

import { DriverRow } from './DriverRow';

export interface DriverBreakdownListProps {
  rows: DriverRowData[];
  title?: ReactNode;
  emptyTitle?: ReactNode;
  emptyDescription?: ReactNode;
  /** Bar colour per driver id. */
  barClassNames?: Record<string, string>;
  animation?: { disabled?: boolean; duration?: number };
  className?: string;
  classNames?: {
    root?: string;
    title?: string;
    list?: string;
  };
}

const DEFAULT_BARS: Record<string, string> = {
  frequency: 'bg-sky-400',
  'hand-mean': 'bg-teal-400',
  'hand-min': 'bg-teal-300',
  slope: 'bg-emerald-400',
  cropland: 'bg-amber-400',
};

/** Measured drivers for the district, from the API's `drivers_summary`. */
export const DriverBreakdownList = ({
  rows,
  title = 'Measured drivers (district mean)',
  emptyTitle = 'No measured drivers',
  emptyDescription = 'This district has no flood driver data from the SAR layer.',
  barClassNames = DEFAULT_BARS,
  animation = {},
  className = '',
  classNames = {},
}: DriverBreakdownListProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotion();
  const signature = rows.map((r) => `${r.id}:${r.fraction.toFixed(3)}`).join('|');

  useGSAP(
    () => {
      if (!rootRef.current || reduceMotion || animation.disabled) return;
      gsap.fromTo(
        rootRef.current.querySelectorAll('.driver-progress'),
        { width: 0 },
        {
          width: (_index: number, target: HTMLElement) => target.dataset.width ?? '0%',
          duration: animation.duration ?? 0.8,
          stagger: 0.08,
          ease: 'power3.out',
        },
      );
    },
    { scope: rootRef, dependencies: [signature, reduceMotion, animation.disabled, animation.duration] },
  );

  return (
    <div ref={rootRef} className={['space-y-1.5 pt-1', classNames.root ?? '', className].filter(Boolean).join(' ')}>
      <div className={['text-[9px] font-mono uppercase tracking-wider text-text-muted font-bold flex items-center gap-1', classNames.title ?? ''].join(' ')}>
        <HexMarker size="xs" colorClass="bg-text-muted" />
        <span>{title}</span>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className={['space-y-2', classNames.list ?? ''].join(' ')}>
          {rows.map((row) => (
            <DriverRow key={row.id} row={row} barClassName={barClassNames[row.id]} />
          ))}
        </div>
      )}
    </div>
  );
};
