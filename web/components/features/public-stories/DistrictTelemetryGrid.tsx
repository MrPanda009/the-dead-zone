'use client';

import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { BackendHabitationRecord } from './districtBackendService';
import type { WeatherState } from '@/lib/api/types';

export interface DistrictTelemetryGridProps {
  /** The currently inspected settlement spot */
  spot: BackendHabitationRecord;
  /** Primary district hazard */
  fallbackHazard?: string;
  /** Live weather and hazard status */
  weatherState?: WeatherState;
  /** District hydrological terrain typology */
  terrainTypology?: 'hillslope' | 'alluvial_plain' | 'hillslope_debris_flow' | 'alluvial_pluvial_waterlogging';
  /** Custom root className */
  className?: string;
}

export const DistrictTelemetryGrid: React.FC<DistrictTelemetryGridProps> = ({
  spot,
  fallbackHazard = 'Landslide & Hillslope Debris Flow',
  weatherState,
  terrainTypology = 'hillslope',
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
  }, { scope: gridRef, dependencies: [spot.id, weatherState], revertOnUpdate: true });

  const isClear = weatherState === 'CLEAR';
  const isHighDanger =
    !isClear &&
    (spot.tier.toLowerCase().includes('tier 1') ||
      (spot.przOverlapPct !== undefined && spot.przOverlapPct > 70) ||
      weatherState === 'ALERT_ACTIVE');

  const hazardName = spot.hazardType || fallbackHazard;
  const isAlluvial = terrainTypology === 'alluvial_plain' || terrainTypology === 'alluvial_pluvial_waterlogging';

  // Road & transit dynamic guidance
  const roadCondition = isClear
    ? 'All Corridors Open • Normal Transit'
    : isHighDanger
    ? isAlluvial
      ? 'Submerged Causeway • Bypass Flood Plain'
      : 'Ghat Debris Alert • Caution'
    : isAlluvial
    ? 'Alluvial Road • Minor Waterlogging'
    : 'Winding Ghat Road • Drive <30 km/h';

  // Refuge bases for all 7 operational districts + historical zones
  const safeBase =
    spot.name.includes('Kedarnath') || spot.name.includes('Rudraprayag') || spot.name.includes('Gaurikund')
      ? 'Agastyamuni Ridge Hub'
      : spot.name.includes('Srinagar') || spot.name.includes('Pauri') || spot.name.includes('Kirtinagar')
      ? 'Chhapania High Terrace'
      : spot.name.includes('Dholpur') || spot.name.includes('Bari') || spot.name.includes('Rajakhera')
      ? 'Dholpur City High Ground'
      : spot.name.includes('Morena') || spot.name.includes('Ambah') || spot.name.includes('Jora')
      ? 'Morena High Plain Sanctuary'
      : spot.name.includes('Chooralmala') || spot.name.includes('Mundakkai') || spot.name.includes('Meppadi')
      ? 'Kalpetta East & Sulthan Bathery'
      : spot.name.includes('Bhagamandala') || spot.name.includes('Madikeri')
      ? 'Kushalnagar Plain & Madikeri Hub'
      : spot.name.includes('Mandia') || spot.name.includes('Baghbar') || spot.name.includes('Barpeta')
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
              isClear
                ? 'bg-emerald-500'
                : isHighDanger
                ? 'bg-red-500 animate-pulse'
                : 'bg-amber-400'
            }`}
          />
          <span
            className={`text-sm sm:text-base font-sans font-bold leading-tight ${
              isClear
                ? 'text-emerald-600 dark:text-emerald-400'
                : isHighDanger
                ? 'text-red-600 dark:text-red-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {isClear ? 'Clear Weather' : isHighDanger ? 'High Hazard Zone' : 'Caution Advised'}
          </span>
        </div>
        <span className="text-[10px] text-ink-faint dark:text-cream/50 mt-1.5 leading-tight">
          {isClear
            ? '0 alerts across 72h window • Route 1 calm'
            : isHighDanger
            ? 'Avoid steep slopes & saturated cuts'
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
          {isAlluvial ? 'Pluvial drainage screening' : 'Hillslope debris threshold'}
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
          {isClear ? 'Verified safe travel window' : 'Daytime transit recommended'}
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

