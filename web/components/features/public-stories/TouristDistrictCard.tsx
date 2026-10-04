'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ZoneId, REGIONAL_STORIES } from './storyData';
import { getBackendProfileForZone } from './districtBackendService';
import { getEmergencyProfile } from './touristEmergencyData';

export interface TouristDistrictCardProps {
  /** The selected zone/district ID */
  zone: ZoneId;
  /** Callback to open the full risk modal */
  onOpenDetails: () => void;
  /** Callback to open the offline tourist emergency pass */
  onOpenOfflinePass?: () => void;
  /** Custom root className */
  className?: string;
}

export const TouristDistrictCard: React.FC<TouristDistrictCardProps> = ({
  zone,
  onOpenDetails,
  onOpenOfflinePass,
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

  const isCritical = emergency.currentAlertLevel === 'High Hazard';
  const isMonitored = emergency.currentAlertLevel === 'Monitored';

  return (
    <div
      ref={containerRef}
      className={`glass-card w-full p-3 sm:p-3.5 lg:p-4 rounded-2xl sm:rounded-3xl border border-line dark:border-white/10 bg-surface-0/95 dark:bg-[#071912]/95 shadow-md flex flex-col gap-2.5 text-ink dark:text-cream select-none pointer-events-auto transition-all ${className}`}
    >
      {/* 1. Header: Category & Alert Status Pill */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono tracking-[0.18em] text-ink-muted dark:text-cream/50 uppercase font-semibold">
            TERRA TOURIST HAZARD ADVISORY
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase font-bold border ${
              isCritical
                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                : isMonitored
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isCritical
                  ? 'bg-red-500 animate-pulse'
                  : isMonitored
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
            />
            {emergency.currentAlertLevel.toUpperCase()} ALERT
          </span>
        </div>

        {/* District Name */}
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink dark:text-cream tracking-tight leading-none mt-1">
          {profile.districtName}
        </h2>

        {/* Location Subtitle matching screenshot */}
        <div className="flex items-center gap-1 text-xs font-mono text-ink-muted dark:text-cream/70 mt-1">
          <span className="material-symbols-outlined text-sm text-yellow-500 dark:text-citron">
            location_on
          </span>
          <span>{profile.state}</span>
        </div>
      </div>

      {/* 2. Authentic Photographic Preview */}
      <div
        className="relative w-full h-32 sm:h-36 rounded-xl sm:rounded-2xl overflow-hidden border border-line dark:border-white/10 group cursor-pointer"
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
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-white pointer-events-none">
          <span className="text-[10px] sm:text-[11px] font-sans font-medium drop-shadow-md truncate max-w-[70%] bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded-full border border-white/15">
            {emergency.dominantHazardLabel}
          </span>
          <span className="text-[9px] font-mono text-white/90 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-full border border-white/20 shrink-0">
            Click to expand
          </span>
        </div>
      </div>

      {/* 3. Dynamic Status Pill */}
      <div
        onClick={onOpenOfflinePass}
        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
          isCritical
            ? 'bg-red-500/10 hover:bg-red-500/15 border-red-500/30'
            : isMonitored
            ? 'bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/30'
            : 'bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/30'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              isCritical
                ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse'
                : isMonitored
                ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
            }`}
          />
          <div className="flex flex-col text-left">
            <span
              className={`text-xs sm:text-[13px] font-semibold leading-tight ${
                isCritical
                  ? 'text-red-700 dark:text-red-300'
                  : isMonitored
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {emergency.statusPillText}
            </span>
            <span className="text-[10px] text-ink-muted dark:text-cream/70 leading-none mt-0.5">
              {emergency.statusPillSubtext}
            </span>
          </div>
        </div>

        <span className="material-symbols-outlined text-sm text-ink-muted dark:text-cream/50">
          chevron_right
        </span>
      </div>

      {/* 4. Popular Localities / Destinations */}
      <div className="flex flex-col gap-1.5 pt-0.5">
        <span className="text-[9px] font-mono uppercase text-ink-muted dark:text-cream/50 tracking-wider">
          POPULAR VISITOR SPOTS & CORRIDORS
        </span>
        <div className="flex flex-wrap gap-1.5">
          {profile.habitations
            .filter((h) => !/^settlement\s*\d+/i.test(h.name.trim()))
            .slice(0, 3)
            .map((h) => (
              <span
                key={h.id}
                className="px-3 py-1 rounded-xl text-xs font-sans bg-surface-1 dark:bg-white/5 border border-line dark:border-white/10 text-ink dark:text-cream font-medium shadow-2xs"
              >
                {h.name}
              </span>
            ))}
        </div>
      </div>

      {/* 5. Civilian Safety Snapshot (Road + Safe Haven) */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-surface-1 dark:bg-white/5 border border-line/70 dark:border-white/10 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase text-ink-muted dark:text-cream/50">
            <span className="material-symbols-outlined text-xs">directions_car</span>
            <span>ROAD TRANSIT ADVICE</span>
          </div>
          <span className="text-[10px] sm:text-[11px] font-sans font-medium text-ink dark:text-cream/90 leading-snug mt-1">
            {emergency.roadConditionNotice}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-surface-1 dark:bg-white/5 border border-line/70 dark:border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[9px] font-mono uppercase text-ink-muted dark:text-cream/50">
            <span>SAFE HAVEN BASE</span>
            <span className="material-symbols-outlined text-sm text-yellow-500 dark:text-citron">
              verified_user
            </span>
          </div>
          <span className="text-[10px] sm:text-[11px] font-sans font-semibold text-emerald-700 dark:text-emerald-400 leading-snug mt-1">
            {emergency.safeHavenGuidanceSummary}
          </span>
        </div>
      </div>

      {/* 6. Primary Action: Download Offline Tourist Emergency Pass */}
      <button
        type="button"
        onClick={onOpenOfflinePass}
        className="w-full py-2.5 px-3 rounded-xl bg-surface-1 hover:bg-surface-2 dark:bg-white/5 dark:hover:bg-white/10 border border-line dark:border-white/10 text-ink dark:text-cream transition-all flex items-center justify-between cursor-pointer group shadow-2xs active:scale-98"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-base">download</span>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs sm:text-[12px] font-bold leading-tight text-ink dark:text-cream group-hover:text-emerald-700 dark:group-hover:text-citron transition-colors">
              Download Offline Tourist Emergency Pass
            </span>
            <span className="text-[9px] font-mono text-ink-muted dark:text-cream/60 mt-0.5">
              PDF / Card • Save before you travel
            </span>
          </div>
        </div>

        <span className="material-symbols-outlined text-sm text-ink-muted dark:text-cream/40 group-hover:translate-x-0.5 transition-transform">
          chevron_right
        </span>
      </button>
    </div>
  );
};

export default TouristDistrictCard;
