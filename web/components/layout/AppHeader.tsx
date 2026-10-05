'use client';

import { useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useLayoutContext } from './ThreePanelLayout';

export interface AppHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Target link for returning to overview (default '/') */
  homeHref?: string;
  /** Contextual chips (district, model version, dataset). */
  metaSlot?: ReactNode;
  /** Right-aligned controls. */
  actionSlot?: ReactNode;
  onToggleCollapse?: () => void;
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
  homeHref = '/',
  metaSlot,
  actionSlot,
  onToggleCollapse,
  className = '',
  classNames = {},
  animation = {},
}: AppHeaderProps) => {
  const rootRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { toggleTop } = useLayoutContext();
  const handleCollapse = onToggleCollapse ?? toggleTop;

  const { disabled: animationDisabled = false, duration = 0.5 } = animation;
  const animate = !animationDisabled && !prefersReducedMotion;

  useGSAP(
    () => {
      if (!animate) return;
      gsap.fromTo(
        '[data-header-item]',
        { y: -8, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration,
          stagger: 0.05,
          ease: 'power3.out',
          clearProps: 'opacity,transform',
        }
      );
    },
    { scope: rootRef, dependencies: [animate, duration] },
  );

  return (
    <header
      ref={rootRef}
      className={[
        'flex h-13 shrink-0 items-center justify-between gap-3 border-b border-line dark:border-[#1e2d45] bg-surface-0/95 dark:bg-[#0c1524]/95 backdrop-blur-xl px-4 text-ink dark:text-text-primary transition-colors duration-200 select-none',
        classNames.root ?? '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* 1. Left Platform Identity */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 md:min-w-[170px] lg:min-w-[200px]" data-header-item>
        <Link
          href={homeHref}
          className="flex items-center gap-2 group cursor-pointer shrink-0"
          title="Return to Global Overview"
        >
          <span className="material-symbols-outlined text-citron text-xl group-hover:rotate-90 transition-transform">
            emergency
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold tracking-wider text-citron">
              TERRA
            </span>
            <span className="text-[9px] font-mono text-text-muted tracking-tight hidden sm:inline">
              TERRAIN RISK & RELOCATION ANALYTICS
            </span>
          </div>
        </Link>

        {metaSlot ? (
          <div className={['hidden sm:flex items-center gap-1.5 ml-1', classNames.meta ?? ''].join(' ')}>
            {metaSlot}
          </div>
        ) : null}
      </div>

      {/* 2. Center Nav Links - Truly Centered */}
      <div className="hidden md:flex items-center gap-1.5 md:absolute md:left-1/2 md:-translate-x-1/2" data-header-item>
        <Link
          href="/"
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-surface-1 dark:hover:bg-white/5 border border-line dark:border-white/10 transition-colors cursor-pointer"
          title="Home Overview"
        >
          <span className="material-symbols-outlined text-xs">home</span>
          <span>Home</span>
        </Link>
        <Link
          href="/gov"
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-surface-1 dark:hover:bg-white/5 border border-line dark:border-white/10 transition-colors cursor-pointer"
          title="Gov Hex Sim &amp; 3D Subcontinent"
        >
          <span className="material-symbols-outlined text-xs">view_in_ar</span>
          <span>3D &amp; 2D</span>
        </Link>
        <Link
          href="/relocation"
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-citron bg-citron/10 border border-citron/40 transition-colors cursor-pointer font-semibold"
          title="Relocation Solver Grid"
        >
          <span className="material-symbols-outlined text-xs">moving</span>
          <span>Relocation</span>
        </Link>
        <Link
          href="/stories"
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-surface-1 dark:hover:bg-white/5 border border-line dark:border-white/10 transition-colors cursor-pointer"
          title="Assess &amp; Advisory Corridors"
        >
          <span className="material-symbols-outlined text-xs">auto_stories</span>
          <span>Assess</span>
        </Link>
        <Link
          href="/stats"
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-surface-1 dark:hover:bg-white/5 border border-line dark:border-white/10 transition-colors cursor-pointer"
          title="Disaster History &amp; Stats"
        >
          <span className="material-symbols-outlined text-xs">query_stats</span>
          <span>Stats</span>
        </Link>
      </div>

      {/* 3. Right Action Tools */}
      <div className="flex items-center gap-2 min-w-0 md:min-w-[170px] lg:min-w-[200px] justify-end" data-header-item>
        {actionSlot || (
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        )}

        {/* Retract Top Panel Button */}
        <button
          type="button"
          onClick={handleCollapse}
          title="Retract Top Command Panel"
          aria-label="Retract Top Command Panel"
          className="p-1 rounded-lg text-text-muted hover:text-citron hover:bg-surface-2 dark:hover:bg-white/10 border border-line dark:border-white/10 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">expand_less</span>
        </button>
      </div>
    </header>
  );
};
