'use client';

import { useRef, type ReactNode } from 'react';
import gsap from 'gsap';

import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';

export type ValidationMetricTileVariant = 'default' | 'accent';

export interface ValidationMetricTileProps {
  label: ReactNode;
  value: ReactNode;
  /** Secondary value beside the main one, e.g. a confidence interval. */
  detail?: ReactNode;
  caption?: ReactNode;
  variant?: ValidationMetricTileVariant;
  className?: string;
  classNames?: {
    root?: string;
    label?: string;
    value?: string;
    detail?: string;
    caption?: string;
  };
  animation?: { enableHover?: boolean; liftPx?: number; duration?: number };
}

const ROOT_CLASSES: Record<ValidationMetricTileVariant, string> = {
  default: 'border-line dark:border-white/10',
  accent: 'border-citron/30 dark:border-citron/20 bg-citron/5',
};

export const ValidationMetricTile = ({
  label,
  value,
  detail,
  caption,
  variant = 'default',
  className = '',
  classNames = {},
  animation = {},
}: ValidationMetricTileProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { enableHover = true, liftPx = 2, duration = 0.2 } = animation;
  const lift = (y: number) => {
    if (!enableHover || prefersReducedMotion || !rootRef.current) return;
    gsap.to(rootRef.current, { y, duration, ease: 'power2.out' });
  };

  return (
    <div
      ref={rootRef}
      onMouseEnter={() => lift(-liftPx)}
      onMouseLeave={() => lift(0)}
      className={[
        'anim-metric-card p-2.5 rounded-xl bg-surface-0 dark:bg-forest-dark border flex flex-col justify-between',
        ROOT_CLASSES[variant],
        classNames.root ?? '',
        className,
      ].join(' ')}
    >
      <div className={['text-[10px] font-mono uppercase', variant === 'accent' ? 'text-citron font-bold' : 'text-text-muted', classNames.label ?? ''].join(' ')}>
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={['text-lg font-mono font-bold', variant === 'accent' ? 'text-citron' : 'text-ink dark:text-text-primary', classNames.value ?? ''].join(' ')}>
          {value}
        </span>
        {detail && <span className={['text-[10px] font-mono text-text-muted', classNames.detail ?? ''].join(' ')}>{detail}</span>}
      </div>
      {caption && (
        <div className={['text-[9px] font-mono text-text-muted mt-0.5 leading-tight', classNames.caption ?? ''].join(' ')}>{caption}</div>
      )}
    </div>
  );
};
