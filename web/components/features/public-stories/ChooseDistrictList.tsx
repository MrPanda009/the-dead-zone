'use client';

import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ZoneId } from './storyData';

export interface DistrictListItem {
  id: ZoneId;
  name: string;
  state: string;
  badgeText: string;
  badgeVariant: 'normal' | 'monitored' | 'warning' | 'critical';
}

export interface ChooseDistrictListProps {
  /** The currently selected zone */
  selectedZone: ZoneId;
  /** Callback triggered when user clicks a district */
  onSelectZone: (zone: ZoneId) => void;
  /** Optional custom root className */
  className?: string;
}

export const DISTRICT_LIST_ITEMS: DistrictListItem[] = [
  {
    id: 'North',
    name: 'Joshimath',
    state: 'Uttarakhand',
    badgeText: 'Subsidence',
    badgeVariant: 'warning',
  },
  {
    id: 'West',
    name: 'Kachchh',
    state: 'Gujarat',
    badgeText: 'Seismic',
    badgeVariant: 'monitored',
  },
  {
    id: 'Central',
    name: 'Satpura',
    state: 'Madhya Pradesh',
    badgeText: 'Monitored',
    badgeVariant: 'monitored',
  },
  {
    id: 'East',
    name: 'Barpeta',
    state: 'Assam',
    badgeText: 'Flood Alert',
    badgeVariant: 'warning',
  },
  {
    id: 'Kodagu',
    name: 'Kodagu',
    state: 'Karnataka',
    badgeText: 'Normal',
    badgeVariant: 'normal',
  },
  {
    id: 'Wayanad',
    name: 'Wayanad',
    state: 'Kerala',
    badgeText: 'High Hazard',
    badgeVariant: 'critical',
  },
  {
    id: 'Rudraprayag',
    name: 'Rudraprayag',
    state: 'Uttarakhand',
    badgeText: 'Hillslope',
    badgeVariant: 'warning',
  },
  {
    id: 'Srinagar',
    name: 'Srinagar',
    state: 'Uttarakhand',
    badgeText: 'Alaknanda',
    badgeVariant: 'monitored',
  },
  {
    id: 'Dholpur',
    name: 'Dholpur',
    state: 'Rajasthan',
    badgeText: 'Chambal',
    badgeVariant: 'normal',
  },
  {
    id: 'Morena',
    name: 'Morena',
    state: 'Madhya Pradesh',
    badgeText: 'Pluvial',
    badgeVariant: 'normal',
  },
];

export const ChooseDistrictList: React.FC<ChooseDistrictListProps> = ({
  selectedZone,
  onSelectZone,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize zone id for matching
  const normalizedZone: ZoneId =
    selectedZone === 'South'
      ? 'Wayanad'
      : selectedZone === 'Barpeta'
      ? 'East'
      : selectedZone;

  useGSAP(
    () => {
      if (!containerRef.current) return;
      gsap.fromTo(
        '.district-row-item',
        { opacity: 0.7, x: 4 },
        { opacity: 1, x: 0, duration: 0.25, stagger: 0.03, ease: 'power2.out' }
      );
    },
    { scope: containerRef, dependencies: [normalizedZone] }
  );

  return (
    <div
      ref={containerRef}
      className={`glass-card p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-line dark:border-white/10 bg-surface-0/90 dark:bg-[#0e261d]/90 shadow-md flex flex-col gap-2 text-ink dark:text-cream select-none transition-all ${className}`}
    >
      {/* Header with Title & Info Icon */}
      <div className="flex items-center justify-between pb-1.5 px-1 border-b border-line/50 dark:border-white/10">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono tracking-wider font-semibold uppercase text-ink-muted dark:text-cream/60">
            CHOOSE DISTRICT
          </span>
          <button
            type="button"
            title="Select a district corridor to view localized hazard intelligence, 72h radar, and emergency passes"
            className="text-ink-muted hover:text-ink dark:text-cream/50 dark:hover:text-cream transition-colors cursor-help"
          >
            <span className="material-symbols-outlined text-xs">info</span>
          </button>
        </div>
        <span className="text-[10px] font-mono text-ink-faint dark:text-cream/40">
          6 Active Corridors
        </span>
      </div>

      {/* District List Rows */}
      <div className="flex flex-col gap-1.5">
        {DISTRICT_LIST_ITEMS.map((item) => {
          const isSelected = normalizedZone === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectZone(item.id)}
              className={`district-row-item group relative flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-emerald-500/10 dark:bg-[#16382a] border-emerald-500/40 dark:border-citron/40 shadow-xs ring-1 ring-emerald-500/20 dark:ring-citron/20'
                  : 'bg-surface-1/60 dark:bg-white/5 border-line/60 dark:border-white/5 hover:bg-surface-2 dark:hover:bg-white/10 hover:border-line dark:hover:border-white/15'
              }`}
            >
              {/* Active Selection Indicator Pill */}
              {isSelected && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-600 dark:bg-citron rounded-r-full" />
              )}

              {/* District Identity */}
              <div className="flex flex-col pl-1">
                <span
                  className={`text-xs sm:text-sm font-semibold tracking-tight leading-snug transition-colors ${
                    isSelected
                      ? 'text-emerald-800 dark:text-white font-bold'
                      : 'text-ink dark:text-cream/90 group-hover:text-ink dark:group-hover:text-white'
                  }`}
                >
                  {item.name}
                </span>
                <span className="text-[10px] font-mono text-ink-muted dark:text-cream/50 mt-0.5">
                  {item.state}
                </span>
              </div>

              {/* Status Badge & Chevron */}
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold tracking-wide flex items-center gap-1 border ${
                    item.badgeVariant === 'normal'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                      : item.badgeVariant === 'critical'
                      ? 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30'
                      : item.badgeVariant === 'warning'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                      : 'bg-black/5 dark:bg-white/10 text-ink-muted dark:text-cream/60 border-transparent'
                  }`}
                >
                  {item.badgeVariant === 'normal' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                  {item.badgeVariant === 'critical' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  )}
                  {item.badgeText}
                </span>

                <span
                  className={`material-symbols-outlined text-sm transition-transform duration-200 ${
                    isSelected
                      ? 'text-emerald-700 dark:text-citron translate-x-0.5'
                      : 'text-ink-muted/50 dark:text-white/30 group-hover:translate-x-0.5 group-hover:text-ink dark:group-hover:text-cream'
                  }`}
                >
                  chevron_right
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ChooseDistrictList;
