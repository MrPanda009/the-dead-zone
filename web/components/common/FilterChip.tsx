'use client';

import { useRef, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';

export interface FilterChipProps {
  label: ReactNode;
  /** Trailing count, e.g. the number of rows the filter keeps. */
  count?: ReactNode;
  active?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  onToggle?: () => void;
  className?: string;
  classNames?: {
    root?: string;
    label?: string;
    count?: string;
  };
  animation?: {
    disabled?: boolean;
    duration?: number;
  };
}

/** Toggle pill for list and table filters. Exposes its state as `aria-pressed`. */
export const FilterChip = ({
  label,
  count,
  active = false,
  disabled = false,
  leftIcon,
  onToggle,
  className = '',
  classNames = {},
  animation = {},
}: FilterChipProps) => {
  const rootRef = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const { disabled: animationDisabled = false, duration = 0.16 } = animation;
  const animate = !animationDisabled && !prefersReducedMotion;

  useGSAP(
    () => {
      const element = rootRef.current;
      if (!animate || !element || disabled) return;
      const scale = (value: number) =>
        gsap.to(element, { scale: value, duration, ease: 'power2.out', overwrite: 'auto' });
      const onEnter = () => scale(1.04);
      const onLeave = () => scale(1);
      const onDown = () => scale(0.97);
      element.addEventListener('mouseenter', onEnter);
      element.addEventListener('mouseleave', onLeave);
      element.addEventListener('pointerdown', onDown);
      element.addEventListener('pointerup', onEnter);
      return () => {
        element.removeEventListener('mouseenter', onEnter);
        element.removeEventListener('mouseleave', onLeave);
        element.removeEventListener('pointerdown', onDown);
        element.removeEventListener('pointerup', onEnter);
      };
    },
    { scope: rootRef, dependencies: [animate, duration, disabled] },
  );

  return (
    <button
      ref={rootRef}
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onToggle}
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold',
        'transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40',
        active
          ? 'border-accent bg-accent/15 text-ink'
          : 'border-line text-ink-muted hover:border-line-strong hover:bg-surface-2 dark:hover:bg-white/5',
        classNames.root ?? '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {leftIcon}
      <span className={classNames.label ?? ''}>{label}</span>
      {count !== undefined ? (
        <span className={['tabular-nums text-ink-faint', classNames.count ?? ''].join(' ')}>{count}</span>
      ) : null}
    </button>
  );
};
