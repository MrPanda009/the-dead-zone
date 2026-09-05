'use client';

import { useRef, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';

export interface AppHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Contextual chips (district, model version, dataset). */
  metaSlot?: ReactNode;
  /** Right-aligned controls. */
  actionSlot?: ReactNode;
  className?: string;
  classNames?: {
    root?: string;
    title?: string;
    subtitle?: string;
    meta?: string;
  };
  animation?: {
    disabled?: boolean;
    duration?: number;
  };
}

export const AppHeader = ({
  title,
  subtitle,
  metaSlot,
  actionSlot,
  className = '',
  classNames = {},
  animation = {},
}: AppHeaderProps) => {
  const rootRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const { disabled: animationDisabled = false, duration = 0.5 } = animation;
  const animate = !animationDisabled && !prefersReducedMotion;

  useGSAP(
    () => {
      if (!animate) return;
      gsap.from('[data-header-item]', {
        y: -8,
        opacity: 0,
        duration,
        stagger: 0.05,
        ease: 'power3.out',
      });
    },
    { scope: rootRef, dependencies: [animate, duration] },
  );

  return (
    <header
      ref={rootRef}
      className={[
        'flex h-12 shrink-0 items-center justify-between gap-4 border-b border-line bg-surface-0 px-4',
        classNames.root ?? '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-baseline gap-3" data-header-item>
        <h1 className={['text-sm font-semibold tracking-tight text-ink', classNames.title ?? ''].join(' ')}>
          {title}
        </h1>
        {subtitle ? (
          <p className={['text-[11px] text-ink-faint', classNames.subtitle ?? ''].join(' ')}>{subtitle}</p>
        ) : null}
      </div>

      <div className={['flex items-center gap-2', classNames.meta ?? ''].join(' ')} data-header-item>
        {metaSlot}
        {actionSlot}
      </div>
    </header>
  );
};
