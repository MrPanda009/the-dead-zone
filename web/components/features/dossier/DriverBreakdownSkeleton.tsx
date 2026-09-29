'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';

export interface DriverBreakdownSkeletonProps {
  rows?: number;
  className?: string;
  animation?: {
    disabled?: boolean;
    duration?: number;
  };
}

/** Placeholder for the drivers panel while attributions load. */
export const DriverBreakdownSkeleton = ({
  rows = 3,
  className = '',
  animation = {},
}: DriverBreakdownSkeletonProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { disabled = false, duration = 0.8 } = animation;

  useGSAP(
    () => {
      if (disabled || prefersReducedMotion) return;
      gsap.to('[data-skeleton]', {
        opacity: 0.4,
        duration,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    },
    { scope: rootRef, dependencies: [disabled, prefersReducedMotion, duration] },
  );

  return (
    <div
      ref={rootRef}
      aria-busy
      className={['flex flex-col gap-2.5', className].filter(Boolean).join(' ')}
    >
      <div data-skeleton className="h-3 w-24 rounded bg-line" />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex flex-col gap-1">
          <div className="flex justify-between">
            <div data-skeleton className="h-2 w-20 rounded bg-line" />
            <div data-skeleton className="h-2 w-14 rounded bg-line" />
          </div>
          <div className="h-0.5 w-full rounded-full bg-line" />
        </div>
      ))}
    </div>
  );
};
