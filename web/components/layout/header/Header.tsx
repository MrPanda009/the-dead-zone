'use client';

import React from 'react';
import Link from 'next/link';

export interface HeaderProps {
  /** Active view mode */
  viewMode?: 'landing' | 'login';
  /** Target link for the brand pill (default '/') */
  homeHref?: string;
  /** Target link for portal access (default '/login') */
  portalHref?: string;
  /** Optional callback for backward compatibility */
  onToggleViewMode?: (mode: 'landing' | 'login') => void;
  /** Whether radar sweep is active */
  isRadarActive?: boolean;
  /** Callback to toggle atmospheric radar */
  onToggleRadar?: () => void;
  /** Whether globe auto-rotation is active */
  isAutoRotating?: boolean;
  /** Callback to toggle earth rotation */
  onToggleRotation?: () => void;
  /** Custom root className */
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode = 'landing',
  homeHref = '/',
  portalHref = '/login',
  onToggleViewMode,
  isRadarActive = true,
  onToggleRadar,
  isAutoRotating = true,
  onToggleRotation,
  className = '',
}) => {
  return (
    <header
      id="app-header"
      className={`fixed top-5 left-0 right-0 z-40 px-6 sm:px-12 flex items-center justify-between pointer-events-none ${className}`}
    >
      {/* Top Left: Elsa Nills / Brand Pill Style (Matching Reference Image 1) */}
      <div className="pointer-events-auto">
        <Link
          href={homeHref}
          onClick={() => onToggleViewMode && onToggleViewMode('landing')}
          className="capsule-pill px-4 py-2 rounded-full flex items-center space-x-2 text-xs font-mono text-text-secondary cursor-pointer hover:bg-white/10 transition-all select-none"
        >
          <span className="text-citron font-bold">*</span>
          <span className="text-text-muted">::</span>
          <span className="font-semibold text-text-primary tracking-wider">SETU-DRR</span>
          <span className="w-1.5 h-1.5 rounded-full bg-citron animate-ping ml-1" />
        </Link>
      </div>

      {/* Center Top Capsule Pill (Matching Reference Image 2) */}
      <div className="pointer-events-auto hidden md:block">
        <Link
          href="/workspace"
          className="capsule-pill px-10 py-2.5 rounded-full shadow-lg border border-white/15 hover:border-citron/40 transition-all flex items-center gap-2 group"
          title="Open SETU-DRR Command Workspace"
        >
          <span className="font-display text-sm font-bold tracking-[0.25em] text-text-primary uppercase select-none group-hover:text-citron transition-colors">
            SETU-DRR
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-text-muted group-hover:text-citron group-hover:bg-citron/15 transition-colors">
            WORKSPACE
          </span>
        </Link>
      </div>

      {/* Right Controls Pill */}
      <div className="pointer-events-auto flex items-center space-x-2.5">
        {onToggleRadar && (
          <button
            onClick={onToggleRadar}
            title="Toggle Atmospheric Radar"
            className={`capsule-pill p-2 rounded-full text-xs font-mono transition-colors flex items-center justify-center cursor-pointer ${
              isRadarActive ? 'text-citron border-citron/30' : 'text-text-muted'
            }`}
          >
            <span className="material-symbols-outlined text-base">radar</span>
          </button>
        )}

        {onToggleRotation && (
          <button
            onClick={onToggleRotation}
            title="Toggle Earth Auto-Rotation"
            className={`capsule-pill p-2 rounded-full text-xs font-mono transition-colors flex items-center justify-center cursor-pointer ${
              isAutoRotating ? 'text-citron border-citron/30' : 'text-text-muted'
            }`}
          >
            <span className="material-symbols-outlined text-base">sync</span>
          </button>
        )}

        {onToggleViewMode ? (
          <button
            onClick={() => onToggleViewMode(viewMode === 'landing' ? 'login' : 'landing')}
            className="capsule-pill px-4 py-2 rounded-full text-xs font-mono font-medium text-text-secondary hover:text-text-primary hover:bg-white/10 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">
              {viewMode === 'landing' ? 'login' : 'public'}
            </span>
            <span>{viewMode === 'landing' ? 'Portal Access' : 'Earth View'}</span>
          </button>
        ) : (
          <Link
            href={viewMode === 'landing' ? portalHref : homeHref}
            className="capsule-pill px-4 py-2 rounded-full text-xs font-mono font-medium text-text-secondary hover:text-text-primary hover:bg-white/10 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">
              {viewMode === 'landing' ? 'login' : 'public'}
            </span>
            <span>{viewMode === 'landing' ? 'Portal Access' : 'Earth View'}</span>
          </Link>
        )}
      </div>
    </header>
  );
};
