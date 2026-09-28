'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { M3_DURATION, M3_EASE } from '@/lib/motion/m3';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import type { BindingConstraint } from '@/lib/api/types';

import { CONSTRAINT_HINTS, CONSTRAINT_LABELS, UNMEASURED_LABEL } from '../constants';

export interface CapacityBarProps {
  constraint: BindingConstraint;
  /** Households this dimension supports; null means never measured, which is not zero. */
  value: number | null | undefined;
  /** Largest capacity across the site's dimensions, used to scale the bar. */
  max: number;
  /** Marks this dimension as the one capping the site. */
  isBinding?: boolean;
  className?: string;
  classNames?: {
    root?: string;
    label?: string;
    value?: string;
    track?: string;
    fill?: string;
  };
  animation?: {
    disabled?: boolean;
    duration?: number;
    delay?: number;
  };
}

/**
 * One resource dimension of a site's carrying capacity.
 *
 * Uses GSAP for smooth width tweens and bottleneck warning pulses.
 * An unmeasured dimension renders as a hatched, valueless track rather than an empty bar.
 */
export const CapacityBar = ({
  constraint,
  value,
  max,
  isBinding = false,
  className = '',
  classNames = {},
  animation = {},
}: CapacityBarProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const measured = value !== null && value !== undefined;
  const fraction = measured && max > 0 ? Math.min(1, value / max) : 0;
  const targetPct = fraction * 100;

  const {
    disabled: animationDisabled = false,
    duration = M3_DURATION.medium4,
    delay = 0,
  } = animation;
  const animate = !animationDisabled && !prefersReducedMotion;

  useGSAP(
    () => {
      if (!fillRef.current || !measured) return;

      if (!animate) {
        gsap.set(fillRef.current, { width: `${targetPct}%` });
        return;
      }

      // Smooth fill tween
      gsap.fromTo(
        fillRef.current,
        { width: '0%' },
        {
          width: `${targetPct}%`,
          duration,
          delay,
          ease: M3_EASE.decelerate,
          overwrite: 'auto',
        },
      );

      // Warning amber bottleneck breathing pulse for binding constraints
      if (isBinding) {
        gsap.to(fillRef.current, {
          opacity: 0.75,
          duration: 1.2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: delay + duration * 0.5,
        });
      }
    },
    { scope: rootRef, dependencies: [targetPct, measured, isBinding, animate, duration, delay] },
  );

  return (
    <div
      ref={rootRef}
      title={CONSTRAINT_HINTS[constraint]}
      className={['flex flex-col gap-1', classNames.root ?? '', className].filter(Boolean).join(' ')}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={[
            'text-[10px] uppercase tracking-wide',
            isBinding ? 'font-semibold text-warning' : 'text-ink-faint',
            classNames.label ?? '',
          ].join(' ')}
        >
          {CONSTRAINT_LABELS[constraint]}
          {isBinding ? ' · binding' : ''}
        </span>
        <span
          className={[
            'font-mono text-[11px] tabular-nums',
            measured ? 'text-ink font-medium' : 'italic text-ink-faint',
            classNames.value ?? '',
          ].join(' ')}
        >
          {measured ? `${value.toLocaleString()} HH` : UNMEASURED_LABEL}
        </span>
      </div>

      <div
        className={[
          'h-1.5 w-full overflow-hidden rounded-full',
          measured ? 'bg-line dark:bg-white/10' : 'bg-line/40 dark:bg-white/5',
          classNames.track ?? '',
        ].join(' ')}
        style={
          measured
            ? undefined
            : {
                backgroundImage:
                  'repeating-linear-gradient(45deg, currentColor 0 2px, transparent 2px 6px)',
                color: 'var(--ink-faint)',
                opacity: 0.35,
              }
        }
      >
        {measured ? (
          <div
            ref={fillRef}
            className={[
              'h-full rounded-full will-change-[width]',
              isBinding ? 'bg-warning shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'bg-accent',
              classNames.fill ?? '',
            ].join(' ')}
            style={{ width: animate ? '0%' : `${targetPct}%` }}
          />
        ) : null}
      </div>
    </div>
  );
};
