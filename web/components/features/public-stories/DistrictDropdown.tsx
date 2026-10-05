'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ZoneId } from './storyData';

export interface DistrictDropdownItem {
  id: ZoneId;
  name: string;
  state: string;
  badgeText: string;
  badgeVariant: 'normal' | 'monitored' | 'warning' | 'critical';
}

export const DROPDOWN_DISTRICTS: DistrictDropdownItem[] = [
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

export interface DistrictDropdownProps {
  /** Currently selected zone */
  selectedZone: ZoneId;
  /** Callback when user selects a zone */
  onSelectZone: (zone: ZoneId) => void;
  /** Optional resolver function for live forecast status */
  getDistrictStatus?: (keyOrId: string | number) => import('@/lib/api/types').DistrictForecastStatus | undefined;
  /** Optional live forecast telemetry map from useDistrictForecastTelemetry */
  weatherMap?: Record<string, import('@/lib/api/types').DistrictForecastStatus>;
  /** Custom root className */
  className?: string;
}

export const DistrictDropdown: React.FC<DistrictDropdownProps> = ({
  selectedZone,
  onSelectZone,
  getDistrictStatus,
  weatherMap,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Normalize zone id
  const normalizedZone: ZoneId =
    selectedZone === 'South'
      ? 'Wayanad'
      : selectedZone === 'Barpeta'
      ? 'East'
      : selectedZone;

  const activeDistrictBase =
    DROPDOWN_DISTRICTS.find((d) => d.id === normalizedZone) ||
    DROPDOWN_DISTRICTS[0];

  // Helper to resolve live badge
  const getBadgeDetails = (item: DistrictDropdownItem) => {
    const liveStatus = getDistrictStatus
      ? getDistrictStatus(item.id)
      : weatherMap?.[item.id] || weatherMap?.[item.id.toLowerCase()];

    if (liveStatus) {
      const state = liveStatus.weather_state || (liveStatus as unknown as { weatherState?: string }).weatherState;
      if (state === 'CLEAR') {
        return { variant: 'normal' as const, text: 'Clear (0 Alerts)' };
      }
      if (state === 'ALERT_ACTIVE') {
        return { variant: 'critical' as const, text: 'High Hazard' };
      }
    }
    return { variant: item.badgeVariant, text: item.badgeText };
  };

  const activeBadge = getBadgeDetails(activeDistrictBase);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useGSAP(
    () => {
      if (!menuRef.current) return;
      if (isOpen) {
        gsap.fromTo(
          menuRef.current,
          { opacity: 0, y: -8, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' }
        );
      }
    },
    { dependencies: [isOpen] }
  );

  return (
    <div
      ref={containerRef}
      className={`relative select-none z-30 ${className}`}
    >
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 sm:py-3 rounded-2xl bg-surface-0/95 dark:bg-[#071912]/95 border border-line dark:border-white/10 shadow-sm hover:border-emerald-500/50 dark:hover:border-citron/50 transition-all cursor-pointer backdrop-blur-md group"
      >
        <div className="flex items-center gap-2.5 text-left">
          <div className="w-8 h-8 rounded-xl bg-surface-1 dark:bg-white/5 border border-line/50 dark:border-white/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg text-yellow-500 dark:text-citron">
              verified_user
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[9px] font-mono uppercase tracking-wider text-ink-muted dark:text-cream/50 leading-tight">
              CHOOSE DISTRICT
            </span>
            <span className="text-xs sm:text-sm font-bold text-ink dark:text-cream leading-tight mt-0.5">
              {activeDistrictBase.name} ({activeDistrictBase.state})
            </span>
          </div>
        </div>

        {/* Status Pill & Chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium flex items-center gap-1 border ${
              activeBadge.variant === 'normal'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                : activeBadge.variant === 'critical'
                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                activeBadge.variant === 'normal'
                  ? 'bg-emerald-500'
                  : activeBadge.variant === 'critical'
                  ? 'bg-red-500 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            {activeBadge.text}
          </span>

          <span
            className={`material-symbols-outlined text-base text-ink-muted dark:text-cream/50 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-emerald-600 dark:text-citron' : ''
            }`}
          >
            expand_more
          </span>
        </div>
      </button>

      {/* Floating Popover Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1.5 p-1.5 rounded-2xl bg-surface-0/98 dark:bg-[#0b1f17]/98 border border-line dark:border-white/15 shadow-2xl backdrop-blur-xl flex flex-col gap-1 z-50 max-h-72 overflow-y-auto"
        >
          <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-ink-muted dark:text-cream/40 font-semibold border-b border-line/40 dark:border-white/10 flex items-center justify-between">
            <span>{DROPDOWN_DISTRICTS.length} OPERATIONAL CORRIDORS</span>
            <span>STATUS</span>
          </div>

          {DROPDOWN_DISTRICTS.map((item) => {
            const isSelected = normalizedZone === item.id;
            const itemBadge = getBadgeDetails(item);
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelectZone(item.id);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500/15 dark:bg-[#16382a] text-emerald-800 dark:text-white font-bold'
                    : 'hover:bg-surface-1 dark:hover:bg-white/5 text-ink dark:text-cream/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      itemBadge.variant === 'normal'
                        ? 'bg-emerald-500'
                        : itemBadge.variant === 'critical'
                        ? 'bg-red-500'
                        : 'bg-amber-500'
                    }`}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold leading-tight">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-mono text-ink-muted dark:text-cream/50">
                      {item.state}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                      itemBadge.variant === 'normal'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                        : itemBadge.variant === 'critical'
                        ? 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                    }`}
                  >
                    {itemBadge.text}
                  </span>
                  {isSelected && (
                    <span className="material-symbols-outlined text-sm text-emerald-600 dark:text-citron">
                      check
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DistrictDropdown;
