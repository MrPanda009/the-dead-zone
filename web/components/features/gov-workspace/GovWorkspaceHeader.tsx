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

export interface GovWorkspaceHeaderProps {
  viewMode: '3d' | 'gis';
  onViewModeChange: (mode: '3d' | 'gis') => void;
  hazardType: HazardType;
  isLoading?: boolean;
  homeHref?: string;
  storiesHref?: string;
  officerId?: string;
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
  className = '',
}) => {
  const rootRef = useRef<HTMLElement>(null);
  const { user, logout } = useAuth();

  const displayName = user
    ? `${user.full_name}${user.jurisdiction?.name ? ` · ${user.jurisdiction.name}` : ''}`
    : officerId;

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
      className={`flex h-13 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface-0 px-4 transition-colors duration-200 ${className}`}
    >
      {/* 1. Left Platform Identity */}
      <div className="flex items-center gap-3" data-header-elem>
        <Link
          href={homeHref}
          className="flex items-center gap-2 group cursor-pointer"
          title="Return to Global Overview"
        >
          <span className="material-symbols-outlined text-citron text-lg group-hover:rotate-90 transition-transform">
            emergency
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold tracking-wider text-citron">
              TERRA
            </span>
            <span className="text-[10px] font-mono text-text-muted">
              RELOCATION DECISION SUPPORT
            </span>
          </div>
        </Link>

        <span className="hidden md:inline-block w-px h-6 bg-line mx-1" />

        {/* Hazard Layer Badge */}
        <div className="hidden sm:flex items-center gap-1.5">
          <Badge variant="info">
            {HAZARD_LABELS[hazardType] ?? hazardType}
          </Badge>
        </div>
      </div>

      {/* 2. Center View Switcher (3D Subcontinent vs High-Res GIS) */}
      <div
        className="flex items-center p-0.5 rounded-xl bg-surface-1 border border-line shadow-inner"
        data-header-elem
      >
        <button
          onClick={() => onViewModeChange('3d')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
            viewMode === '3d'
              ? 'bg-citron text-[#0b1c15] font-semibold shadow-md'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
          }`}
        >
          <span className="material-symbols-outlined text-sm">view_in_ar</span>
          <span>3D SUBCONTINENT</span>
        </button>

        <button
          onClick={() => onViewModeChange('gis')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
            viewMode === 'gis'
              ? 'bg-citron text-[#0b1c15] font-semibold shadow-md'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
          }`}
        >
          <span className="material-symbols-outlined text-sm">map</span>
          <span>HIGH-RES GIS</span>
        </button>
      </div>

      {/* 3. Right Action Tools */}
      <div className="flex items-center gap-2.5" data-header-elem>
        {/* Portal Navigation Links */}
        <nav className="flex items-center gap-1.5" aria-label="Portal Navigation">
          <Link
            href={homeHref}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-surface-1 border border-line transition-colors cursor-pointer"
            title="Return to Home Overview"
          >
            <span className="material-symbols-outlined text-xs">home</span>
            <span className="hidden sm:inline">Home</span>
          </Link>

          <Link
            href="/relocation"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-surface-1 border border-line transition-colors cursor-pointer"
            title="Relocation Solver Grid"
          >
            <span className="material-symbols-outlined text-xs">moving</span>
            <span>Relocation</span>
          </Link>

          <Link
            href={storiesHref}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-surface-1 border border-line transition-colors cursor-pointer"
            title="Tourist & Citizen Advisory Stories"
          >
            <span className="material-symbols-outlined text-xs">auto_stories</span>
            <span>Stories</span>
          </Link>
        </nav>

        {/* Universal Theme Toggle */}
        <ThemeToggle />

        {/* Officer Identity Badge */}
        <span
          className="hidden xl:inline-block text-[11px] font-mono text-text-secondary border-l border-line pl-2.5 max-w-[220px] truncate"
          title={displayName}
        >
          {displayName}
        </span>

        {/* Logout Action */}
        {user && (
          <button
            onClick={() => logout()}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono text-text-muted hover:text-red-500 hover:bg-red-500/10 border border-line transition-colors cursor-pointer"
            title="Log out of government workspace"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span className="hidden md:inline">Logout</span>
          </button>
        )}
      </div>
    </header>
  );
};

