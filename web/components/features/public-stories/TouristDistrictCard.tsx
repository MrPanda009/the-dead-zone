'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ZoneId, REGIONAL_STORIES } from './storyData';
import { getBackendProfileForZone } from './districtBackendService';

export interface TouristDistrictCardProps {
  /** The selected zone/district ID */
  zone: ZoneId;
  /** Callback to open the full risk modal */
  onOpenDetails: () => void;
  /** Custom root className */
  className?: string;
}

export const TouristDistrictCard: React.FC<TouristDistrictCardProps> = ({
  zone,
  onOpenDetails,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const story = REGIONAL_STORIES[zone] || REGIONAL_STORIES.Wayanad;
  const profile = getBackendProfileForZone(zone);

  useGSAP(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current,
      { opacity: 0.5, y: 8 },
      { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', clearProps: 'opacity,transform' }
    );
  }, { dependencies: [zone] });

  const isCritical = profile.dangerLevel === 'Critical';

  // Civilian road condition summary for all 5 regions
  const roadSummary =
    zone === 'North' || profile.districtName.includes('Joshimath')
      ? 'NH 7 (Badrinath Highway) open • Rockfall & fissure watch near Sunil ward'
      : zone === 'West' || profile.districtName.includes('Kachchh')
      ? 'NH 341 & Bhuj-Khavda road clear • Caution on tidal salt-flat creek crossings'
      : zone === 'Central' || profile.districtName.includes('Satpura')
      ? 'Pachmarhi Ghat & Pipariya road clear • Watch river causeways during rain'
      : zone === 'East' || zone === 'Barpeta' || profile.districtName.includes('Barpeta')
      ? 'NH 31 & SH 2 clear • Char river ferry crossings restricted during flood surges'
      : zone === 'Kodagu'
      ? 'Madikeri-Mangalore highway open • Avoid remote off-road trails in rain'
      : 'Thamarassery Ghat (NH 766) rockfall caution • Daytime speed <30 km/h';

  return (
    <div
      ref={containerRef}
      className={`glass-card max-w-md w-full p-4 sm:p-5 rounded-3xl border border-line dark:border-white/15 bg-surface-0/90 dark:bg-[#0e261d]/90 shadow-xl flex flex-col gap-3.5 text-ink dark:text-cream select-none pointer-events-auto transition-all ${className}`}
    >
      {/* 1. Header: Category & District Identity */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono tracking-[0.2em] text-ink-muted dark:text-cream/60 uppercase">
            TERRA TOURIST HAZARD ADVISORY
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase font-bold border ${
              isCritical
                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isCritical ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            {profile.dangerLevel} Alert
          </span>
        </div>

        <div className="flex items-baseline justify-between gap-2 mt-0.5">
          <h2 className="font-display text-2xl font-bold text-ink dark:text-cream tracking-tight">
            {profile.districtName}
          </h2>
          <span className="text-xs font-mono text-ink-muted dark:text-cream/60">
            {profile.state}
          </span>
        </div>
      </div>

      {/* 2. Authentic Photographic Preview */}
      <div className="relative w-full h-36 sm:h-40 rounded-2xl overflow-hidden border border-line dark:border-white/10 group cursor-pointer"
        onClick={onOpenDetails}
      >
        <Image
          src={story.previewImage}
          alt={`${profile.districtName} landscape`}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          priority
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white pointer-events-none">
          <span className="text-[11px] font-sans font-medium drop-shadow-md">
            {profile.primaryHazard}
          </span>
          <span className="text-[10px] font-mono text-white/80 bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-full border border-white/15">
            Click to expand
          </span>
        </div>
      </div>

      {/* 3. Plain Language Travel Summary */}
      <p className="text-xs sm:text-[13px] font-sans text-ink-secondary dark:text-cream/80 leading-relaxed">
        {story.shortSummary}
      </p>

      {/* 4. Popular Localities / Destinations */}
      <div className="flex flex-col gap-1.5 pt-1 border-t border-line/60 dark:border-white/10">
        <span className="text-[10px] font-mono uppercase text-ink-muted dark:text-cream/50 tracking-wider">
          POPULAR VISITOR SPOTS & CORRIDORS
        </span>
        <div className="flex flex-wrap gap-1.5">
          {profile.habitations.slice(0, 4).map((h) => (
            <span
              key={h.id}
              className="px-2 py-0.5 rounded-lg text-[11px] font-sans bg-surface-2 dark:bg-white/10 border border-line dark:border-white/10 text-ink dark:text-cream"
            >
              {h.name}
            </span>
          ))}
        </div>
      </div>

      {/* 5. Civilian Safety Snapshot */}
      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
        <div className="p-2 rounded-xl bg-surface-1 dark:bg-white/5 border border-line/70 dark:border-white/10 flex flex-col justify-between">
          <span className="text-[9px] font-mono uppercase text-ink-muted dark:text-cream/50">
            Road Transit Advice
          </span>
          <span className="text-[11px] font-sans font-semibold text-ink dark:text-cream leading-snug mt-1">
            {roadSummary}
          </span>
        </div>

        <div className="p-2 rounded-xl bg-surface-1 dark:bg-white/5 border border-line/70 dark:border-white/10 flex flex-col justify-between">
          <span className="text-[9px] font-mono uppercase text-ink-muted dark:text-cream/50">
            Safe Haven Base
          </span>
          <span className="text-[11px] font-sans font-semibold text-emerald-600 dark:text-emerald-400 leading-snug mt-1">
            {profile.safeHavenGuidance.split('.')[0]}
          </span>
        </div>
      </div>

      {/* 6. Expand Button */}
      <button
        type="button"
        onClick={onOpenDetails}
        className="w-full py-2.5 px-4 rounded-xl bg-citron text-[#06100c] font-display font-bold text-xs tracking-wide shadow-md hover:bg-citron/90 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer mt-0.5"
      >
        <span className="material-symbols-outlined text-base">travel_explore</span>
        <span>Inspect Complete Travel Advisory & Photos</span>
      </button>
    </div>
  );
};

export default TouristDistrictCard;
