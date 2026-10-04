'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export interface StoriesHeaderCoordinatesProps {
  /** Latitude display string */
  latitude: string;
  /** Longitude display string */
  longitude: string;
  /** Target link for Government Official portal (default '/gov') */
  govHref?: string;
  /** Target link for returning to landing overview (default '/') */
  overviewHref?: string;
  /** Optional callback to switch to Government Official Portal */
  onSwitchToGovPortal?: () => void;
  /** Optional callback to return to landing overview */
  onBackToOverview?: () => void;
  /** Custom root className */
  className?: string;
}

export const StoriesHeaderCoordinates: React.FC<StoriesHeaderCoordinatesProps> = ({
  latitude = 'N 12° 25\' 26.400"',
  longitude = 'E 75° 44\' 16.800"',
  govHref = '/gov',
  overviewHref = '/',
  onSwitchToGovPortal,
  onBackToOverview,
  className = '',
}) => {
  const coordRef = useRef<HTMLDivElement>(null);
  const centerTextRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!coordRef.current) return;
    gsap.fromTo(
      coordRef.current,
      { opacity: 0.4, scale: 0.98 },
      { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' }
    );
  }, { dependencies: [latitude, longitude] });

  return (
    <header
      className={`w-full flex flex-col md:flex-row items-center justify-between gap-3 pointer-events-auto select-none ${className}`}
    >
      {/* 1. Left Action Navigation Dock */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <button
          type="button"
          aria-label="Menu"
          className="p-1.5 sm:p-2 rounded-xl bg-surface-0/90 dark:bg-black/35 border border-line dark:border-white/10 shadow-xs hover:bg-surface-1 dark:hover:bg-white/10 transition-all flex items-center justify-center cursor-pointer backdrop-blur-md"
        >
          <span className="material-symbols-outlined text-base text-ink dark:text-cream">menu</span>
        </button>

        {onBackToOverview ? (
          <button
            type="button"
            onClick={onBackToOverview}
            className="text-xs font-mono font-medium tracking-wide text-ink hover:text-ink-primary dark:text-cream/80 dark:hover:text-cream px-3 py-1.5 rounded-xl bg-surface-0/90 dark:bg-black/25 border border-line dark:border-white/10 shadow-xs hover:bg-surface-1 dark:hover:bg-white/5 transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Overview</span>
          </button>
        ) : (
          <Link
            href={overviewHref}
            className="text-xs font-mono font-medium tracking-wide text-ink hover:text-ink-primary dark:text-cream/80 dark:hover:text-cream px-3 py-1.5 rounded-xl bg-surface-0/90 dark:bg-black/25 border border-line dark:border-white/10 shadow-xs hover:bg-surface-1 dark:hover:bg-white/5 transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Overview</span>
          </Link>
        )}

        {onSwitchToGovPortal ? (
          <button
            type="button"
            onClick={onSwitchToGovPortal}
            className="text-xs font-mono font-semibold tracking-wide text-emerald-700 dark:text-citron px-3 py-1.5 rounded-xl bg-emerald-500/10 dark:bg-[#162e24] border border-emerald-500/30 dark:border-citron/30 shadow-xs hover:bg-emerald-500/15 dark:hover:bg-[#1a382c] transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
          >
            <span className="material-symbols-outlined text-sm">verified_user</span>
            <span>Official Hex Map</span>
          </button>
        ) : (
          <Link
            href={govHref}
            className="text-xs font-mono font-semibold tracking-wide text-emerald-700 dark:text-citron px-3 py-1.5 rounded-xl bg-emerald-500/10 dark:bg-[#162e24] border border-emerald-500/30 dark:border-citron/30 shadow-xs hover:bg-emerald-500/15 dark:hover:bg-[#1a382c] transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
          >
            <span className="material-symbols-outlined text-sm">verified_user</span>
            <span>Official Hex Map</span>
          </Link>
        )}

        <ThemeToggle variant="button" size="sm" showLabel={false} />
      </div>

      {/* 2. Center Prominent Page Title matching Reference Image */}
      <div
        ref={centerTextRef}
        className="flex flex-col items-center text-center px-2 py-0.5"
      >
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-ink dark:text-cream leading-tight">
          Explore hazard intelligence across India
        </h1>
        <p className="text-xs sm:text-xs text-ink-muted dark:text-cream/70 font-sans mt-0.5">
          Select a district to view advisory details and travel guidance.
        </p>
      </div>

      {/* 3. Top Right Coordinate Pill Readout */}
      <div
        ref={coordRef}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-0/90 dark:bg-black/25 border border-line dark:border-white/10 shadow-xs font-mono text-xs tracking-wider text-ink dark:text-cream/90 backdrop-blur-md"
      >
        <span className="material-symbols-outlined text-base text-yellow-500 dark:text-citron">
          location_on
        </span>
        <div className="flex flex-col text-left leading-tight text-[11px] sm:text-xs font-medium">
          <span>{latitude}</span>
          <span>{longitude}</span>
        </div>
        <span className="material-symbols-outlined text-sm text-ink-muted dark:text-cream/40 ml-0.5">
          expand_more
        </span>
      </div>
    </header>
  );
};

export default StoriesHeaderCoordinates;
