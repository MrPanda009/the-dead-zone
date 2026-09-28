'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { M3_DURATION } from '@/lib/motion/m3';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';

export interface AllocationWarningsProps {
  warnings: string[];
  title?: React.ReactNode;
  className?: string;
  classNames?: {
    root?: string;
    title?: string;
    list?: string;
  };
}

/** Solver caveats — group splits and unsatisfiable demand — with cautionary entrance slide. */
export const AllocationWarnings = ({
  warnings,
  title = 'Solver notes',
  className = '',
  classNames = {},
}: AllocationWarningsProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (prefersReducedMotion || !rootRef.current || warnings.length === 0) return;
      gsap.from(rootRef.current, {
        y: -8,
        opacity: 0,
        duration: M3_DURATION.medium2,
        ease: 'back.out(1.4)',
        clearProps: 'transform,opacity',
      });
    },
    { scope: rootRef, dependencies: [warnings, prefersReducedMotion] },
  );

  if (warnings.length === 0) return null;

  return (
    <div
      ref={rootRef}
      data-allocation-warnings
      className={[
        'flex flex-col gap-1 rounded-xl border border-warning/35 bg-warning/5 px-3 py-2',
        classNames.root ?? '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        className={['text-[10px] font-semibold uppercase tracking-wide text-warning', classNames.title ?? ''].join(' ')}
      >
        {title}
      </span>
      <ul className={['flex flex-col gap-0.5', classNames.list ?? ''].join(' ')}>
        {warnings.map((warning) => (
          <li key={warning} className="text-[10px] leading-snug text-ink-muted">
            · {warning}
          </li>
        ))}
      </ul>
    </div>
  );
};
