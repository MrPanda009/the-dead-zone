'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { M3_DURATION, M3_EASE } from '@/lib/motion/m3';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';

export interface UnmetDemandMeterProps {
  placedHouseholds: number;
  unmetHouseholds: number;
  totalHouseholds: number;
  label?: React.ReactNode;
  className?: string;
  classNames?: {
    root?: string;
    label?: string;
    track?: string;
    placed?: string;
    legend?: string;
  };
  animation?: {
    disabled?: boolean;
    duration?: number;
    delay?: number;
  };
}

/**
 * Share of demand the solver could place.
 *
 * Uses GSAP to tween the placed width and scrub the percentage counter.
 * The unmet remainder is given equal visual weight to the placed share.
 */
export const UnmetDemandMeter = ({
  placedHouseholds,
  unmetHouseholds,
  totalHouseholds,
  label = 'Demand coverage',
  className = '',
  classNames = {},
  animation = {},
}: UnmetDemandMeterProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const percentRef = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const placedFraction = totalHouseholds > 0 ? placedHouseholds / totalHouseholds : 0;
  const targetPct = placedFraction * 100;

  const {
    disabled: animationDisabled = false,
    duration = M3_DURATION.long2,
    delay = 0,
  } = animation;
  const animate = !animationDisabled && !prefersReducedMotion;

  useGSAP(
    () => {
      if (!barRef.current || !percentRef.current) return;

      if (!animate) {
        gsap.set(barRef.current, { width: `${targetPct}%` });
        percentRef.current.textContent = `${targetPct.toFixed(1)}%`;
        return;
      }

      // Sweep bar fill from 0 to target
      gsap.fromTo(
        barRef.current,
        { width: '0%' },
        {
          width: `${targetPct}%`,
          duration,
          delay,
          ease: M3_EASE.emphasized,
          overwrite: 'auto',
        },
      );

      // Numeric counter scrub
      const counter = { value: 0 };
      gsap.to(counter, {
        value: targetPct,
        duration,
        delay,
        ease: M3_EASE.emphasized,
        onUpdate: () => {
          if (percentRef.current) {
            percentRef.current.textContent = `${counter.value.toFixed(1)}%`;
          }
        },
      });
    },
    { scope: rootRef, dependencies: [targetPct, animate, duration, delay] },
  );

  return (
    <div
      ref={rootRef}
      className={['flex flex-col gap-1.5', classNames.root ?? '', className].filter(Boolean).join(' ')}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={[
            'text-[10px] uppercase tracking-wide text-ink-faint font-semibold',
            classNames.label ?? '',
          ].join(' ')}
        >
          {label}
        </span>
        <span
          ref={percentRef}
          className="font-mono text-[11px] tabular-nums font-bold text-ink"
        >
          {animate ? '0.0%' : `${targetPct.toFixed(1)}%`}
        </span>
      </div>

      <div
        className={[
          'flex h-2 w-full overflow-hidden rounded-full bg-critical/30',
          classNames.track ?? '',
        ].join(' ')}
      >
        <div
          ref={barRef}
          className={[
            'h-full bg-safe will-change-[width]',
            classNames.placed ?? '',
          ].join(' ')}
          style={{ width: animate ? '0%' : `${targetPct}%` }}
        />
      </div>

      <div className={['flex justify-between text-[10px] font-medium', classNames.legend ?? ''].join(' ')}>
        <span className="text-safe">{placedHouseholds.toLocaleString()} HH placed</span>
        <span className="text-critical">{unmetHouseholds.toLocaleString()} HH unmet</span>
      </div>
    </div>
  );
};
