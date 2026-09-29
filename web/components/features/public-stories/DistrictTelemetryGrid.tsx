'use client';

import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { BackendHabitationRecord } from './districtBackendService';

export interface DistrictTelemetryGridProps {
  /** The currently inspected settlement spot */
  spot: BackendHabitationRecord;
  /** Primary district hazard */
  fallbackHazard?: string;
  /** Custom root className */
  className?: string;
}

export const DistrictTelemetryGrid: React.FC<DistrictTelemetryGridProps> = ({
  spot,
  fallbackHazard = 'Landslide & Hillslope Debris Flow',
  className = '',
}) => {
  const gridRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!gridRef.current) return;
    const items = gridRef.current.children;
    if (!items || items.length === 0) return;

    gsap.fromTo(
      items,
      { y: 14, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        stagger: 0.07,
        duration: 0.45,
        ease: 'power2.out',
        clearProps: 'opacity,transform',
      }
    );
  }, { scope: gridRef, dependencies: [spot.id], revertOnUpdate: true });

  const isHighDanger =
    spot.tier.toLowerCase().includes('tier 1') ||
    (spot.przOverlapPct !== undefined && spot.przOverlapPct > 70);

  const hazardName = spot.hazardType || fallbackHazard;

  // Derive civilian-readable road & travel conditions
  const roadCondition = isHighDanger
    ? 'Winding Ghat Road • Caution'
    : spot.type === 'town'
    ? 'Paved Highway • Normal Transit'
    : 'Local Estate Road • Drive <30 km/h';

  const safeBase =
    spot.name === 'Sunil Ward' || spot.name === 'Manohar Bagh' || spot.name.includes('Joshimath')
      ? 'Bhatoli Plateau Sanctuary'
      : spot.name.includes('Dhordo') || spot.name.includes('Bhuj') || spot.name.includes('Habo')
      ? 'Habo Hill & Bhuj High Ridge'
      : spot.name.includes('Pachmarhi') || spot.name.includes('Pipariya')
      ? 'Pachmarhi High Plateau'
      : spot.name === 'Chooralmala' || spot.name === 'Mundakkai' || spot.name === 'Meppadi'
      ? 'Kalpetta East & Sulthan Bathery'
      : spot.name === 'Bhagamandala' || spot.name === 'Madikeri' || spot.name === 'Somwarpet'
      ? 'Kushalnagar Plain & Madikeri Hub'
      : spot.name === 'Mandia Char Cluster' || spot.name === 'Baghbar Riparian Reach'
      ? 'Barpeta Road & Howly Plateau'
      : 'District Emergency Safe Base';

  return (
    <div
      ref={gridRef}
      className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${className}`}
    >
      {/* 1. Travel Safety Status */}
      <div className="p-3.5 rounded-2xl bg-surface-1 dark:bg-white/5 border border-line dark:border-white/10 flex flex-col justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted dark:text-cream/60">
          Travel Safety Status
        </span>
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isHighDanger ? 'bg-red-500 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span
            className={`text-sm sm:text-base font-sans font-bold leading-tight ${
              isHighDanger
                ? 'text-red-600 dark:text-red-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {isHighDanger ? 'High Hazard Zone' : 'Caution Advised'}
          </span>
        </div>
        <span className="text-[10px] text-ink-faint dark:text-cream/50 mt-1.5 leading-tight">
          {isHighDanger
            ? 'Avoid steep slopes & hiking trails'
            : 'Precaution during heavy rainfall'}
        </span>
      </div>

      {/* 2. Primary Terrain Hazard */}
      <div className="p-3.5 rounded-2xl bg-surface-1 dark:bg-white/5 border border-line dark:border-white/10 flex flex-col justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted dark:text-cream/60">
          Primary Hazard
        </span>
        <div className="mt-2 flex flex-col">
          <span
            className="text-xs sm:text-sm font-sans font-bold text-ink dark:text-cream leading-tight line-clamp-2"
            title={hazardName}
          >
            {hazardName}
          </span>
        </div>
        <span className="text-[10px] text-ink-faint dark:text-cream/50 mt-1.5 leading-tight">
          Monsoon saturation corridor
        </span>
      </div>

      {/* 3. Road & Transit Condition */}
      <div className="p-3.5 rounded-2xl bg-surface-1 dark:bg-white/5 border border-line dark:border-white/10 flex flex-col justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted dark:text-cream/60">
          Roads & Transit
        </span>
        <div className="mt-2 flex flex-col">
          <span className="text-xs sm:text-sm font-sans font-bold text-ink dark:text-cream leading-tight">
            {roadCondition}
          </span>
        </div>
        <span className="text-[10px] text-ink-faint dark:text-cream/50 mt-1.5 leading-tight">
          Daytime transit recommended
        </span>
      </div>

      {/* 4. Safe Haven & Emergency Base */}
      <div className="p-3.5 rounded-2xl bg-surface-1 dark:bg-white/5 border border-line dark:border-white/10 flex flex-col justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted dark:text-cream/60">
          Nearest Safe Refuge
        </span>
        <div className="mt-2 flex flex-col">
          <span className="text-xs sm:text-sm font-sans font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
            {safeBase}
          </span>
        </div>
        <span className="text-[10px] font-mono text-ink-faint dark:text-cream/50 mt-1.5 leading-tight">
          Emergency Desk: 112 / 1070
        </span>
      </div>
    </div>
  );
};

export default DistrictTelemetryGrid;
