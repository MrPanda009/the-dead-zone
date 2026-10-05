'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ZoneId, REGIONAL_STORIES } from './storyData';
import { getBackendProfileForZone } from './districtBackendService';
import { getEmergencyProfile } from './touristEmergencyData';
import { DistrictWeatherBadge } from './DistrictWeatherBadge';
import { ForecastTriggerButton } from './ForecastTriggerButton';

import { WeatherState } from '@/lib/api/types';

export interface TouristDistrictCardProps {
  /** The selected zone/district ID */
  zone: ZoneId;
  /** Callback to open the full risk modal */
  onOpenDetails: () => void;
  /** Callback to open the offline tourist emergency pass */
  onOpenOfflinePass?: () => void;
  /** Optional live weather state from telemetry */
  weatherState?: WeatherState;
  /** Optional live danger cells count from telemetry */
  dangerCellsCount?: number;
  /** Optional live last cycle timestamp */
  lastCycleAt?: string;
  /** Custom root className */
  className?: string;
}

export const TouristDistrictCard: React.FC<TouristDistrictCardProps> = ({
  zone,
  onOpenDetails,
  onOpenOfflinePass,
  weatherState: propWeatherState,
  dangerCellsCount: propDangerCellsCount,
  lastCycleAt: propLastCycleAt,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const story = REGIONAL_STORIES[zone] || REGIONAL_STORIES.Wayanad;
  const profile = getBackendProfileForZone(zone);
  const emergency = getEmergencyProfile(zone);

  useGSAP(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current,
      { opacity: 0.6, y: 8 },
      { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', clearProps: 'opacity,transform' }
    );
  }, { dependencies: [zone] });

  const weatherState =
    propWeatherState ||
    profile.weatherState ||
    (emergency.currentAlertLevel === 'High Hazard' ? 'ALERT_ACTIVE' : 'CLEAR');
  const isClear = weatherState === 'CLEAR';
  const isCritical = !isClear && emergency.currentAlertLevel === 'High Hazard';
  const isMonitored = !isClear && emergency.currentAlertLevel === 'Monitored';

  const statusTitle = isClear
    ? 'Clear Weather (0 Alerts) • Verified Safe Window'
    : emergency.statusPillText;
  const statusSubtitle = isClear
    ? 'ECMWF IFS 72h forecast confirms calm corridor ($MHI < 0.45)'
    : emergency.statusPillSubtext;

  return (
    <div
      ref={containerRef}
      className={`glass-card w-full p-2 sm:p-2.5 xl:p-3.5 rounded-xl sm:rounded-2xl xl:rounded-3xl border border-line dark:border-white/10 bg-surface-0/95 dark:bg-[#071912]/95 shadow-md flex flex-col gap-1.5 sm:gap-2 xl:gap-2.5 text-ink dark:text-cream select-none pointer-events-auto transition-all ${className}`}
    >
      {/* 1. Header: Category, Alert Status Pill & Forecast Trigger */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <span className="text-[8px] sm:text-[9px] xl:text-[10px] font-mono tracking-[0.16em] text-ink-muted dark:text-cream/50 uppercase font-semibold">
            TERRA TOURIST HAZARD ADVISORY
          </span>
          <div className="flex items-center gap-1.5">
            <DistrictWeatherBadge
              weatherState={weatherState}
              dangerCellsCount={propDangerCellsCount ?? profile.dangerCellsCount}
              lastCycleAt={propLastCycleAt ?? profile.lastCycleAt}
              size="sm"
            />
            <ForecastTriggerButton district={profile.key} size="sm" />
          </div>
        </div>

        {/* District Name */}
        <h2 className="font-display text-lg sm:text-xl xl:text-2xl 2xl:text-3xl font-bold text-ink dark:text-cream tracking-tight leading-none mt-0.5">
          {profile.districtName}
        </h2>

        {/* Location Subtitle */}
        <div className="flex items-center gap-1 text-[10px] sm:text-[11px] xl:text-xs font-mono text-ink-muted dark:text-cream/70 mt-0.5">
          <span className="material-symbols-outlined text-xs sm:text-sm text-yellow-500 dark:text-citron">
            location_on
          </span>
          <span>{profile.state}</span>
          <span className="text-ink-muted dark:text-cream/40">&bull;</span>
          <span className="text-[9.5px] sm:text-[10px] xl:text-[11px] font-mono text-ink-muted dark:text-cream/60">
            {profile.terrainTypology === 'alluvial_plain' ? 'Alluvial Basin' : 'Mountain Hillslope'}
          </span>
        </div>
      </div>

      {/* 2. Authentic Photographic Preview (Compact & responsive on laptops) */}
      <div
        className="relative w-full h-20 sm:h-24 lg:h-20 xl:h-26 2xl:h-32 rounded-lg sm:rounded-xl xl:rounded-2xl overflow-hidden border border-line dark:border-white/10 group cursor-pointer shrink-0"
        onClick={onOpenDetails}
        title="Click to view full scientific risk breakdown & field photos"
      >
        <Image
          src={story.previewImage}
          alt={`${profile.districtName} landscape`}
          fill
          sizes="(max-width: 768px) 100vw, 500px"
          priority
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
        <div className="absolute bottom-1 sm:bottom-1.5 left-1.5 right-1.5 sm:left-2 sm:right-2 flex items-center justify-between text-white pointer-events-none">
          <span className="text-[9.5px] sm:text-[10.5px] font-sans font-medium drop-shadow-md truncate max-w-[70%] bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded-full border border-white/15">
            {emergency.dominantHazardLabel}
          </span>
          <span className="text-[8.5px] sm:text-[9px] font-mono text-white/90 bg-black/60 backdrop-blur-xs px-1.5 sm:px-2 py-0.5 rounded-full border border-white/20 shrink-0">
            Click to expand
          </span>
        </div>
      </div>

      {/* 3. Dynamic Status Pill */}
      <div
        onClick={onOpenOfflinePass}
        className={`flex items-center justify-between p-1.5 sm:p-2 xl:p-2.5 rounded-lg sm:rounded-xl border cursor-pointer transition-all ${
          isCritical
            ? 'bg-red-500/10 hover:bg-red-500/15 border-red-500/30'
            : isMonitored
            ? 'bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/30'
            : 'bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/30'
        }`}
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span
            className={`w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full shrink-0 ${
              isCritical
                ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse'
                : isMonitored
                ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
            }`}
          />
          <div className="flex flex-col text-left">
            <span
              className={`text-[11px] sm:text-xs xl:text-[12.5px] font-semibold leading-tight ${
                isCritical
                  ? 'text-red-700 dark:text-red-300'
                  : isMonitored
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {statusTitle}
            </span>
            <span className="text-[8.5px] sm:text-[9px] xl:text-[10px] text-ink-muted dark:text-cream/70 leading-none mt-0.5">
              {statusSubtitle}
            </span>
          </div>
        </div>

        <span className="material-symbols-outlined text-xs sm:text-sm text-ink-muted dark:text-cream/50">
          chevron_right
        </span>
      </div>

      {/* 4. Popular Localities / Destinations */}
      <div className="flex flex-col gap-0.5 pt-0.5">
        <span className="text-[8px] sm:text-[8.5px] xl:text-[9px] font-mono uppercase text-ink-muted dark:text-cream/50 tracking-wider">
          POPULAR VISITOR SPOTS & CORRIDORS
        </span>
        <div className="flex flex-wrap gap-1 sm:gap-1.5">
          {profile.habitations
            .filter((h) => !/^settlement\s*\d+/i.test(h.name.trim()))
            .slice(0, 3)
            .map((h) => (
              <span
                key={h.id}
                className="px-2 py-0.5 sm:px-2.5 sm:py-0.5 xl:px-3 xl:py-1 rounded-md sm:rounded-lg xl:rounded-xl text-[10px] sm:text-[11px] xl:text-xs font-sans bg-surface-1 dark:bg-white/5 border border-line dark:border-white/10 text-ink dark:text-cream font-medium shadow-2xs"
              >
                {h.name}
              </span>
            ))}
        </div>
      </div>

      {/* 5. Civilian Safety Snapshot (Road + Safe Haven) */}
      <div className="grid grid-cols-2 gap-1 sm:gap-1.5 xl:gap-2 text-xs">
        <div className="p-1.5 sm:p-2 xl:p-2.5 rounded-lg sm:rounded-xl bg-surface-1 dark:bg-white/5 border border-line/70 dark:border-white/10 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[8px] sm:text-[8.5px] xl:text-[9px] font-mono uppercase text-ink-muted dark:text-cream/50">
            <span className="material-symbols-outlined text-xs">directions_car</span>
            <span>ROAD TRANSIT</span>
          </div>
          <span className="text-[9px] sm:text-[9.5px] xl:text-[10.5px] font-sans font-medium text-ink dark:text-cream/90 leading-snug mt-0.5">
            {isClear
              ? 'All Corridors Open • Normal Transit'
              : profile.terrainTypology === 'alluvial_plain'
              ? 'Low-Lying Causeway • Check Flood Plain'
              : emergency.roadConditionNotice}
          </span>
        </div>

        <div className="p-1.5 sm:p-2 xl:p-2.5 rounded-lg sm:rounded-xl bg-surface-1 dark:bg-white/5 border border-line/70 dark:border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[8px] sm:text-[8.5px] xl:text-[9px] font-mono uppercase text-ink-muted dark:text-cream/50">
            <span>SAFE HAVEN</span>
            <span className="material-symbols-outlined text-xs sm:text-sm text-yellow-500 dark:text-citron">
              verified_user
            </span>
          </div>
          <span className="text-[9px] sm:text-[9.5px] xl:text-[10.5px] font-sans font-semibold text-emerald-700 dark:text-emerald-400 leading-snug mt-0.5">
            {emergency.safeHavenGuidanceSummary}
          </span>
        </div>
      </div>

      {/* 6. Primary Action: Download Offline Tourist Emergency Pass */}
      <button
        type="button"
        onClick={onOpenOfflinePass}
        className="w-full py-1.5 sm:py-2 xl:py-2.5 px-2 sm:px-2.5 xl:px-3 rounded-lg sm:rounded-xl bg-surface-1 hover:bg-surface-2 dark:bg-white/5 dark:hover:bg-white/10 border border-line dark:border-white/10 text-ink dark:text-cream transition-all flex items-center justify-between cursor-pointer group shadow-2xs active:scale-98"
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-5 h-5 sm:w-6 sm:h-6 xl:w-7 xl:h-7 rounded-md sm:rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xs sm:text-sm xl:text-base">download</span>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10.5px] sm:text-[11px] xl:text-[12px] font-bold leading-tight text-ink dark:text-cream group-hover:text-emerald-700 dark:group-hover:text-citron transition-colors">
              Download Offline Tourist Emergency Pass
            </span>
            <span className="text-[8px] sm:text-[8.5px] xl:text-[9px] font-mono text-ink-muted dark:text-cream/60 mt-0.5">
              PDF / Card • Save before you travel
            </span>
          </div>
        </div>

        <span className="material-symbols-outlined text-xs sm:text-sm text-ink-muted dark:text-cream/40 group-hover:translate-x-0.5 transition-transform">
          chevron_right
        </span>
      </button>
    </div>
  );
};

export default TouristDistrictCard;
