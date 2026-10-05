'use client';

import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ZoneId } from './storyData';
import type { WeatherState } from '@/lib/api/types';

export interface DistrictItem {
  id: ZoneId;
  name: string;
  state: string;
  riskTag: string;
  backendKey: string;
}

export interface ZoneTickSelectorProps {
  /** Currently selected zone */
  selectedZone: ZoneId;
  /** Callback when zone changes */
  onSelectZone: (zone: ZoneId) => void;
  /** Live weather states indexed by district key */
  districtWeatherMap?: Record<string, WeatherState>;
  /** Custom root className */
  className?: string;
}

const DISTRICT_ITEMS: DistrictItem[] = [
  { id: 'Wayanad', name: 'Wayanad', state: 'Kerala', riskTag: 'Hillslope', backendKey: 'wayanad' },
  { id: 'Kodagu', name: 'Kodagu', state: 'Karnataka', riskTag: 'Slope', backendKey: 'kodagu' },
  { id: 'Barpeta', name: 'Barpeta', state: 'Assam', riskTag: 'Alluvial', backendKey: 'barpeta' },
  { id: 'Rudraprayag', name: 'Rudraprayag', state: 'Uttarakhand', riskTag: 'Mandakini', backendKey: 'rudraprayag' },
  { id: 'Srinagar', name: 'Srinagar', state: 'Uttarakhand', riskTag: 'Alaknanda', backendKey: 'srinagar' },
  { id: 'Dholpur', name: 'Dholpur', state: 'Rajasthan', riskTag: 'Chambal', backendKey: 'dholpur' },
  { id: 'Morena', name: 'Morena', state: 'Madhya Pradesh', riskTag: 'Pluvial', backendKey: 'morena' },
  { id: 'North', name: 'Joshimath', state: 'Uttarakhand', riskTag: 'Subsidence', backendKey: 'joshimath' },
];

export const ZoneTickSelector: React.FC<ZoneTickSelectorProps> = ({
  selectedZone,
  onSelectZone,
  districtWeatherMap = {},
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTickRef = useRef<HTMLDivElement>(null);

  const normalizedZone: ZoneId =
    selectedZone === 'South' ? 'Wayanad' : selectedZone === 'East' ? 'Barpeta' : selectedZone;

  const selectedIndex = Math.max(
    0,
    DISTRICT_ITEMS.findIndex((d) => d.id === normalizedZone)
  );

  useGSAP(() => {
    if (!activeTickRef.current) return;
    const targetY = selectedIndex * 46 + 6;
    gsap.to(activeTickRef.current, {
      y: targetY,
      duration: 0.35,
      ease: 'power3.out',
    });
  }, { dependencies: [selectedIndex] });

  return (
    <div
      ref={containerRef}
      className={`select-none pointer-events-auto flex flex-col items-end ${className}`}
    >
      <span className="text-[10px] sm:text-xs font-mono tracking-[0.25em] text-ink-muted/80 dark:text-cream/50 uppercase mb-3">
        OPERATIONAL DISTRICTS
      </span>

      <div className="relative flex items-center gap-3">
        <div className="flex flex-col gap-1.5 text-right">
          {DISTRICT_ITEMS.map((district) => {
            const isSelected = district.id === normalizedZone;
            const weather = districtWeatherMap[district.backendKey];
            const isClear = weather === 'CLEAR';
            const isAlert = weather === 'ALERT_ACTIVE';

            return (
              <button
                key={district.id}
                type="button"
                onClick={() => onSelectZone(district.id)}
                onMouseEnter={() => onSelectZone(district.id)}
                className={`group flex flex-col items-end px-3 py-1 rounded-lg transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-surface-2 dark:bg-white/10 shadow-sm scale-105'
                    : 'hover:bg-surface-1 dark:hover:bg-white/5 hover:translate-x-[-2px]'
                }`}
              >
                <div className="flex items-center gap-2">
                  {weather && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isClear
                          ? 'bg-emerald-500'
                          : isAlert
                          ? 'bg-red-500 animate-pulse'
                          : 'bg-amber-400'
                      }`}
                      title={`Weather status: ${weather}`}
                    />
                  )}
                  <span
                    className={`text-sm sm:text-base font-sans tracking-wide transition-colors ${
                      isSelected
                        ? 'text-ink dark:text-cream font-semibold'
                        : 'text-ink-muted dark:text-cream/60 group-hover:text-ink dark:group-hover:text-cream'
                    }`}
                  >
                    {district.name}
                  </span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'bg-m3-accent-foliage/20 text-m3-accent-foliage font-bold'
                        : 'bg-black/5 dark:bg-white/10 text-ink-faint dark:text-white/40'
                    }`}
                  >
                    {district.riskTag}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-ink-faint dark:text-cream/40">
                  {district.state}
                </span>
              </button>
            );
          })}
        </div>

        {/* Vertical Tick-Mark Ruler */}
        <div className="relative h-[370px] w-4 flex flex-col justify-between py-1">
          <div className="absolute top-1 bottom-1 right-[2px] w-[1px] bg-ink/15 dark:bg-cream/15" />
          {Array.from({ length: 32 }).map((_, i) => (
            <div
              key={i}
              className={`h-[1px] ml-auto ${
                i % 4 === 0
                  ? 'w-3 bg-ink/35 dark:bg-cream/35'
                  : 'w-1.5 bg-ink/15 dark:bg-cream/15'
              }`}
            />
          ))}
          <div
            ref={activeTickRef}
            className="absolute top-0 right-0 w-3.5 h-[2px] bg-m3-accent-foliage shadow-[0_0_8px_currentColor] transition-transform"
          />
        </div>
      </div>
    </div>
  );
};

export default ZoneTickSelector;

