'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Badge } from '@/components/ui/Badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { HAZARD_LABELS } from '@/lib/map/constants';
import type { HazardType } from '@/lib/api/types';

import { useAuth } from '@/lib/hooks/useAuth';
import { useLayoutContext } from '@/components/layout/ThreePanelLayout';

export interface GovWorkspaceHeaderProps {
  viewMode: '3d' | 'gis';
  onViewModeChange: (mode: '3d' | 'gis') => void;
  hazardType: HazardType;
  isLoading?: boolean;
  homeHref?: string;
  storiesHref?: string;
  officerId?: string;
  onToggleCollapse?: () => void;
  className?: string;
}

export const GovWorkspaceHeader: React.FC<GovWorkspaceHeaderProps> = ({
  viewMode,
  onViewModeChange,
  hazardType,
  isLoading = false,
  homeHref = '/',
  storiesHref = '/stories',
  officerId = 'NDRF-OFFICER-894',
  onToggleCollapse,
  className = '',
}) => {
  const rootRef = useRef<HTMLElement>(null);
  const { user, logout } = useAuth();
  const { toggleTop } = useLayoutContext();
  const handleCollapse = onToggleCollapse ?? toggleTop;

  const sanitizeName = (name: string) =>
    name.replace(/SETU[-_\s]*DRR/gi, 'TERRA').replace(/SETU/gi, 'TERRA');

  const rawName = user?.full_name ? sanitizeName(user.full_name) : officerId;
  const rawJurisdiction = user?.jurisdiction?.name ? sanitizeName(user.jurisdiction.name) : '';
  const displayName = sanitizeName(
    user
      ? `${rawName}${rawJurisdiction ? ` · ${rawJurisdiction}` : ''}`
      : rawName
  );

  useGSAP(() => {
    if (!rootRef.current) return;
    gsap.fromTo(
      '[data-header-elem]',
      { y: -10, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.35,
        stagger: 0.04,
        ease: 'power3.out',
        clearProps: 'opacity,transform',
      }
    );
  }, []);

  return (
    <header
      ref={rootRef}
      className={`flex h-13 shrink-0 items-center justify-between gap-3 border-b border-line dark:border-[#1e2d45] bg-surface-0/95 dark:bg-[#0c1524]/95 backdrop-blur-xl px-4 text-ink dark:text-text-primary transition-colors duration-200 ${className}`}
    >
      {/* 1. Left Platform Identity */}
      <div className="flex items-center gap-3" data-header-elem>
        <Link
          href={homeHref}
          className="flex items-center gap-2 group cursor-pointer"
          title="Return to Global Overview"
        >
          <span className="material-symbols-outlined text-citron text-xl group-hover:rotate-90 transition-transform">
            emergency
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold tracking-wider text-citron">
              TERRA
            </span>
            <span className="text-[9px] font-mono text-text-muted tracking-tight">
              TERRAIN RISK & RELOCATION ANALYTICS
            </span>
          </div>
        </Link>

        {/* Hazard Layer Cyan Pill Badge */}
        <div className="hidden sm:flex items-center ml-1">
          <span className="px-2.5 py-0.5 rounded-full border border-[#00e5ff] text-[#00e5ff] bg-[#00e5ff]/10 font-mono text-[10px] font-bold tracking-wider uppercase shadow-[0_0_8px_rgba(0,229,255,0.2)]">
            {HAZARD_LABELS[hazardType] ?? hazardType}
          </span>
        </div>
      </div>

      {/* 2. Center View Switcher & Nav Links */}
      <div className="flex items-center gap-2" data-header-elem>
        {/* Mode Switcher (3D Subcontinent vs 2D View) */}
        <div className="flex items-center p-0.5 rounded-xl bg-surface-1 dark:bg-[#070d18] border border-line dark:border-white/10 shadow-inner">
          <button
            type="button"
            onClick={() => onViewModeChange('3d')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
              viewMode === '3d'
                ? 'bg-citron text-black font-bold shadow-md'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-2 dark:hover:bg-white/5'
            }`}
            title="Switch to 3D Subcontinent View"
            aria-label="Switch to 3D Subcontinent View"
          >
            <span className="material-symbols-outlined text-sm">view_in_ar</span>
            <span className="hidden sm:inline">3D SUBCONTINENT</span>
            <span className="sm:hidden">3D</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange('gis')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
              viewMode === 'gis'
                ? 'bg-citron text-black font-bold shadow-md'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-2 dark:hover:bg-white/5'
            }`}
            title="Switch to 2D View"
            aria-label="Switch to 2D View"
          >
            <span className="material-symbols-outlined text-sm">map</span>
            <span className="hidden sm:inline">2D VIEW</span>
            <span className="sm:hidden">2D</span>
          </button>
        </div>

        {/* Portal Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Portal Navigation">
          <Link
            href={homeHref}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-surface-1 dark:hover:bg-white/5 border border-line dark:border-white/10 transition-colors cursor-pointer"
            title="Return to Home Overview"
          >
            <span className="material-symbols-outlined text-xs">home</span>
            <span>Home</span>
          </Link>

          <Link
            href="/relocation"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-surface-1 dark:hover:bg-white/5 border border-line dark:border-white/10 transition-colors cursor-pointer"
            title="Relocation Solver Grid"
          >
            <span className="material-symbols-outlined text-xs">moving</span>
            <span>Relocation</span>
          </Link>

          <Link
            href={storiesHref}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-surface-1 dark:hover:bg-white/5 border border-line dark:border-white/10 transition-colors cursor-pointer"
            title="Tourist & Citizen Advisory Stories"
          >
            <span className="material-symbols-outlined text-xs">auto_stories</span>
            <span>Stories</span>
          </Link>
        </nav>
      </div>

      {/* 3. Right Action Tools */}
      <div className="flex items-center gap-2" data-header-elem>
        {/* Universal Theme Toggle */}
        <ThemeToggle />

        {/* Officer Identity Badge */}
        <span
          className="hidden xl:inline-block text-[11px] font-mono text-text-secondary border-l border-line dark:border-white/10 pl-2 max-w-[200px] truncate"
          title={displayName}
        >
          {displayName}
        </span>

        {/* Logout Action */}
        {user && (
          <button
            type="button"
            onClick={() => logout()}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono text-text-muted hover:text-red-400 hover:bg-red-500/10 border border-line dark:border-white/10 transition-colors cursor-pointer"
            title="Log out of government workspace"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span className="hidden md:inline">Logout</span>
          </button>
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

