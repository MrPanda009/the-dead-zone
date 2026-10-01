'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { StatsDonutChart } from '../StatsDonutChart';
import { DisasterLossMap } from '../DisasterLossMap';
import { STATE_EXPOSURE_PROFILES } from '../statsData';
import type { DisasterHistoryTabProps } from '../types';

export const DisasterHistoryTab: React.FC<DisasterHistoryTabProps> = ({
  stats,
  selectedState,
  onSelectState,
  availableStates,
  caseStudy,
  isLoading = false,
  onOpenCaseStudyModal,
  className = '',
  classNames = {},
}) => {
  const [selectedYearRange, setSelectedYearRange] = useState('2014 - 2022');

  const exposure =
    STATE_EXPOSURE_PROFILES[selectedState] ??
    STATE_EXPOSURE_PROFILES['Manipur'] ?? {
      population: '3.2 M',
      scStShare: '26%',
      kutchaHousing: '32%',
      totalFatalities: 28612,
    };

  const stateCoordinates: Record<string, { lat: number; lng: number; zoom?: number }> = {
    'All India': { lat: 22.8, lng: 79.5, zoom: 4.6 },
    'Jammu & Kashmir': { lat: 33.778, lng: 76.576, zoom: 7.2 },
    Ladakh: { lat: 34.152, lng: 77.577, zoom: 6.8 },
    Manipur: { lat: 24.817, lng: 93.936, zoom: 7.5 },
    Assam: { lat: 26.200, lng: 92.937, zoom: 7.2 },
    Kerala: { lat: 10.850, lng: 76.271, zoom: 7.5 },
    Uttarakhand: { lat: 30.066, lng: 79.019, zoom: 7.4 },
    'Himachal Pradesh': { lat: 31.104, lng: 77.173, zoom: 7.4 },
    Rajasthan: { lat: 27.023, lng: 74.217, zoom: 6.8 },
    'Madhya Pradesh': { lat: 22.973, lng: 78.656, zoom: 6.8 },
    Karnataka: { lat: 15.317, lng: 75.713, zoom: 7.0 },
    Bihar: { lat: 25.096, lng: 85.313, zoom: 7.2 },
    'West Bengal': { lat: 22.986, lng: 87.855, zoom: 7.2 },
    Maharashtra: { lat: 19.751, lng: 75.713, zoom: 6.8 },
  };

  const center = stateCoordinates[selectedState] ?? { lat: 24.817, lng: 93.936, zoom: 7.5 };

  return (
    <div className={`h-full min-h-0 flex flex-col justify-between overflow-hidden ${classNames.root ?? ''} ${className}`}>
      {/* Top Banner & Filter Controls (Compact & Screen-Fitted) */}
      <div className="flex items-center justify-between gap-3 shrink-0 pb-1.5">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 inline-block bg-citron shrink-0"
              style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
            />
            <span className="text-[10px] font-mono uppercase tracking-widest text-citron font-bold">
              PAST EVENTS. REAL IMPACT.
            </span>
          </div>
          <h1 className="font-display text-lg sm:text-xl font-extrabold text-ink dark:text-white tracking-tight leading-tight">
            Disaster History &amp; Stats — {selectedState}
          </h1>
        </div>

        {/* Dropdowns & Official Reports Tag */}
        <div className="flex items-center gap-2">
          {/* State Dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl glass-card border border-line dark:border-white/10">
            <span className="text-[10px] font-mono text-text-muted">State:</span>
            <select
              value={selectedState}
              onChange={(e) => onSelectState(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-ink dark:text-white pr-1 py-0.5 outline-none cursor-pointer"
            >
              {availableStates.map((st) => (
                <option key={st} value={st} className="bg-surface-0 dark:bg-forest-dark text-ink dark:text-white">
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Year Range Dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl glass-card border border-line dark:border-white/10">
            <span className="text-[10px] font-mono text-text-muted">Years:</span>
            <select
              value={selectedYearRange}
              onChange={(e) => setSelectedYearRange(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-ink dark:text-white pr-1 py-0.5 outline-none cursor-pointer"
            >
              <option value="2014 - 2022" className="bg-surface-0 dark:bg-forest-dark text-ink dark:text-white">
                2014 – 2022
              </option>
              <option value="2014 - 2024" className="bg-surface-0 dark:bg-forest-dark text-ink dark:text-white">
                2014 – 2024
              </option>
            </select>
          </div>

          {/* Official Tag */}
          <div className="hidden sm:flex px-2.5 py-1 rounded-xl glass-card border border-emerald-500/30 text-emerald-500 text-[10px] font-mono items-center gap-1.5">
            <span
              className="w-2 h-2 inline-block bg-emerald-500 animate-pulse"
              style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
            />
            <span className="font-bold">RECORDED</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Layout Fitted to 100% Available Screen Height */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* Left Column: Interactive Loss Hexagon Map (Stays Fixed, Never Scrolls) */}
        <div className="lg:col-span-7 h-full flex flex-col min-h-0 overflow-hidden">
          <div className="relative flex-1 min-h-0 rounded-2xl overflow-hidden border border-line dark:border-white/10 glass-card">
            <DisasterLossMap
              centerLat={center.lat}
              centerLng={center.lng}
              stateName={selectedState}
              zoom={center.zoom ?? 7.5}
              showLegend={true}
              className="w-full h-full"
            >
              {/* Floating Case Study Card (Bottom Left) */}
              <div className="absolute bottom-3 left-3 z-20 max-w-xs w-[calc(100%-1.5rem)] sm:w-auto">
                <div className="glass-card p-2.5 sm:p-3 rounded-xl border border-line dark:border-white/20 shadow-xl flex items-center gap-2.5 backdrop-blur-xl">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-surface-2">
                    <Image
                      src="/stories/east.jpg"
                      alt="Noney Landslide"
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1">
                      <span
                        className="w-2 h-2 inline-block bg-citron"
                        style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                      />
                      <span className="text-[8px] font-mono uppercase tracking-wider text-citron font-bold">
                        CASE STUDY
                      </span>
                    </div>
                    <div className="text-[11px] font-bold font-display text-ink dark:text-white truncate">
                      Noney, Manipur (Landslide)
                    </div>
                    <div className="text-[9px] text-text-muted font-mono leading-none">
                      61 fatalities • 18 injured
                    </div>
                    <button
                      type="button"
                      onClick={() => caseStudy && onOpenCaseStudyModal?.(caseStudy)}
                      className="text-[10px] font-mono text-citron hover:underline flex items-center gap-0.5 cursor-pointer pt-0.5"
                    >
                      <span>View details</span>
                      <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            </DisasterLossMap>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-text-muted pt-1 px-1 shrink-0">
            <span>H3 Hexagonal aggregation of recorded losses</span>
            <span>Data: MHA, NDMA, CWC</span>
          </div>
        </div>

        {/* Right Column: Graphs + Exposure + Key Insights (Scrollable data column with visible scrollbar) */}
        <div className="lg:col-span-5 h-full flex flex-col min-h-0 gap-2.5 overflow-y-auto pr-1.5 stats-scrollbar">
          {/* Better Graphs: Hexagonal Casualties Breakdown + Yearly Timeline */}
          <StatsDonutChart
            stats={stats}
            totalLives={exposure.totalFatalities}
            isLoading={isLoading}
          />

          {/* Exposure Card (State, latest available) */}
          <div className="glass-card p-3 rounded-2xl border border-line dark:border-white/10 space-y-1.5 shrink-0">
            <div className="text-[9px] font-mono uppercase tracking-wider text-text-muted font-bold flex items-center gap-1.5">
              <span
                className="w-2 h-2 inline-block bg-text-muted"
                style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
              />
              <span>EXPOSURE ({selectedState}, latest available)</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 text-center space-y-0.5">
                <div className="text-xs sm:text-sm font-bold font-mono text-ink dark:text-white">
                  {exposure.population}
                </div>
                <div className="text-[9px] text-text-muted font-mono">Population</div>
              </div>

              <div className="p-2 rounded-xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 text-center space-y-0.5">
                <div className="text-xs sm:text-sm font-bold font-mono text-ink dark:text-white">
                  {exposure.scStShare}
                </div>
                <div className="text-[9px] text-text-muted font-mono">SC/ST share</div>
              </div>

              <div className="p-2 rounded-xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 text-center space-y-0.5">
                <div className="text-xs sm:text-sm font-bold font-mono text-ink dark:text-white">
                  {exposure.kutchaHousing}
                </div>
                <div className="text-[9px] text-text-muted font-mono">Kutcha housing</div>
              </div>
            </div>
          </div>

          {/* Key Insights Card */}
          <div className="glass-card p-3 rounded-2xl border border-line dark:border-white/10 space-y-1.5 shrink-0">
            <div className="text-[9px] font-mono uppercase tracking-wider text-citron font-bold flex items-center gap-1.5">
              <span
                className="w-2 h-2 inline-block bg-citron"
                style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
              />
              <span>KEY INSIGHTS</span>
            </div>

            <ul className="space-y-1 text-[11px] text-text-secondary font-sans leading-tight">
              <li className="flex items-start gap-1.5">
                <span
                  className="w-1.5 h-1.5 inline-block bg-citron shrink-0 mt-1"
                  style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                />
                <span>
                  <strong>Floods</strong> account for over 50% of cumulative casualties across monsoon cycles.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span
                  className="w-1.5 h-1.5 inline-block bg-citron shrink-0 mt-1"
                  style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                />
                <span>
                  <strong>Landslides</strong> show rising intensity in terrain corridors post-2018.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span
                  className="w-1.5 h-1.5 inline-block bg-citron shrink-0 mt-1"
                  style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                />
                <span>
                  Losses remain concentrated in high-precipitation windows (Jun–Sep).
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
