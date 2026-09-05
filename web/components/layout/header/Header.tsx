'use client';

import React from 'react';

export interface HeaderProps {
  /** Active view mode */
  viewMode?: 'landing' | 'login';
  /** Toggle between Landing and Login view */
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
        <div
          onClick={() => onToggleViewMode && onToggleViewMode('landing')}
          className="capsule-pill px-4 py-2 rounded-full flex items-center space-x-2 text-xs font-mono text-text-secondary cursor-pointer hover:bg-white/10 transition-all select-none"
        >
          <span className="text-citron font-bold">*</span>
          <span className="text-text-muted">::</span>
          <span className="font-semibold text-text-primary tracking-wider">SETU-DRR</span>
          <span className="w-1.5 h-1.5 rounded-full bg-citron animate-ping ml-1" />
        </div>
      </div>

      {/* Center Top Capsule Pill (Matching Reference Image 2) */}
      <div className="pointer-events-auto hidden md:block">
        <div className="capsule-pill px-10 py-2.5 rounded-full shadow-lg border border-white/15">
          <span className="font-display text-sm font-bold tracking-[0.25em] text-text-primary uppercase select-none">
            SETU-DRR
          </span>
        </div>
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

        {onToggleViewMode && (
          <button
            onClick={() => onToggleViewMode(viewMode === 'landing' ? 'login' : 'landing')}
            className="capsule-pill px-4 py-2 rounded-full text-xs font-mono font-medium text-text-secondary hover:text-text-primary hover:bg-white/10 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">
              {viewMode === 'landing' ? 'login' : 'public'}
            </span>
            <span>{viewMode === 'landing' ? 'Portal Access' : 'Earth View'}</span>
          </button>
        )}
      </div>
    </header>
  );
};
