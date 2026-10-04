'use client';

import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { DistrictBackendProfile } from './districtBackendService';
import { DistrictWeatherBadge } from './DistrictWeatherBadge';

export interface DistrictRiskHeaderProps {
  /** The district profile from backend or baseline */
  profile: DistrictBackendProfile;
  /** Whether the data was loaded live from backend */
  isLive?: boolean;
  /** Close callback */
  onClose: () => void;
  /** Custom root className */
  className?: string;
}

export const DistrictRiskHeader: React.FC<DistrictRiskHeaderProps> = ({
  profile,
  isLive = false,
  onClose,
  className = '',
}) => {
  const headerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!headerRef.current) return;
    gsap.fromTo(
      headerRef.current.children,
      { y: -10, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        stagger: 0.07,
        duration: 0.45,
        ease: 'power2.out',
        clearProps: 'opacity,transform',
      }
    );
  }, { scope: headerRef, dependencies: [profile.districtName, profile.weatherState], revertOnUpdate: true });

  const weatherState = profile.weatherState || (profile.dangerLevel === 'Critical' ? 'ALERT_ACTIVE' : 'CLEAR');
  const isClear = weatherState === 'CLEAR';
  const isAlluvial = profile.terrainTypology === 'alluvial_plain';

  return (
    <div
      ref={headerRef}
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line dark:border-white/10 pb-4 ${className}`}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-ink dark:text-cream">
            {profile.districtName}
          </h2>
          <span className="text-xs font-mono text-ink-muted dark:text-cream/60">
            {profile.state} &bull; {profile.riverBasin}
          </span>

          {/* Dynamic Weather & Alert Status Pill */}
          <DistrictWeatherBadge
            weatherState={weatherState}
            dangerCellsCount={profile.dangerCellsCount}
            lastCycleAt={profile.lastCycleAt}
            size="sm"
          />

          {/* Hydrological Terrain Typology Badge */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-ink-muted dark:text-cream/70 bg-surface-1 dark:bg-white/5 border border-line dark:border-white/10">
            <span className="text-xs">{isAlluvial ? '🌊' : '⛰️'}</span>
            {isAlluvial ? 'Alluvial Drainage' : 'Mountain Hillslope'}
          </span>

          {/* Live Backend Telemetry Indicator */}
          {isLive && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live API
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-ink-faint dark:text-cream/50 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isClear ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
            {isClear
              ? 'Clear Weather Clearance • Route 1 Calm ($MHI < 0.45)'
              : 'Active Hazard Advisory • Route 1 Peak Envelope'}
          </span>
          <span>&bull;</span>
          <span className="text-[11px] text-ink-muted dark:text-cream/60">
            Model: ECMWF IFS HRES 0.1° (72h Forecast)
          </span>
          <span>&bull;</span>
          <span>Helpline: 112 / 1070</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="self-end sm:self-center w-8 h-8 rounded-full bg-surface-1 hover:bg-surface-2 dark:bg-white/10 dark:hover:bg-white/20 text-ink-muted hover:text-ink dark:text-cream/80 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
        aria-label="Close District Assessment"
      >
        ✕
      </button>
    </div>
  );
};

export default DistrictRiskHeader;

