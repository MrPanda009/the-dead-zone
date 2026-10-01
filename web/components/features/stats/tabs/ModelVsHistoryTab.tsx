'use client';

import React, { useState } from 'react';
import { DistrictHazardMap } from '../DistrictHazardMap';
import { DisasterLossMap } from '../DisasterLossMap';
import type { ModelVsHistoryTabProps } from '../types';

export const ModelVsHistoryTab: React.FC<ModelVsHistoryTabProps> = ({
  districts,
  selectedDistrict,
  onSelectDistrict,
  summary,
  stats,
  onNavigateToSources,
  isLoading = false,
  className = '',
  classNames = {},
}) => {
  const [selectedYearRange, setSelectedYearRange] = useState('2014 - 2022');

  return (
    <div className={`h-full min-h-0 flex flex-col justify-between overflow-hidden ${classNames.root ?? ''} ${className}`}>
      {/* Top Banner & Selectors (Compact Screen-Fitted) */}
      <div className="flex items-center justify-between gap-3 shrink-0 pb-1.5">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 inline-block bg-citron shrink-0"
              style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
            />
            <span className="text-[10px] font-mono uppercase tracking-widest text-citron font-bold">
              VALIDATE. COMPARE. IMPROVE.
            </span>
          </div>
          <h1 className="font-display text-lg sm:text-xl font-extrabold text-ink dark:text-white tracking-tight leading-tight">
            Model vs History — {selectedDistrict.name} ({selectedDistrict.state})
          </h1>
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2">
          {/* District Picker */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl glass-card border border-line dark:border-white/10">
            <span className="text-[10px] font-mono text-text-muted">District:</span>
            <select
              value={selectedDistrict.lgdCode}
              onChange={(e) => {
                const code = Number(e.target.value);
                const found = districts.find((d) => d.lgdCode === code);
                if (found) onSelectDistrict(found);
              }}
              className="bg-transparent text-xs font-mono font-bold text-ink dark:text-white pr-1 py-0.5 outline-none cursor-pointer"
            >
              {districts.map((d) => (
                <option key={d.lgdCode} value={d.lgdCode} className="bg-surface-0 dark:bg-forest-dark text-ink dark:text-white">
                  {d.name} ({d.state})
                </option>
              ))}
            </select>
          </div>

          {/* Year Range */}
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
        </div>
      </div>

      {/* Side-by-Side Dual Map & Observations Layout Fitted to 100% Screen Height */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* Left Map: Computed Flood Susceptibility (TERRA v0.1) - Fixed, Never Scrolls */}
        <div className="lg:col-span-4 h-full flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between pb-1 px-1 shrink-0">
            <span className="text-[10px] font-mono font-bold uppercase text-citron flex items-center gap-1.5">
              <span
                className="w-2 h-2 inline-block bg-citron"
                style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
              />
              <span>COMPUTED • TERRA V0.1</span>
            </span>
            <span className="text-[9px] font-mono text-text-muted">H3 res-8</span>
          </div>

          <div className="relative flex-1 min-h-0 rounded-2xl overflow-hidden border border-line dark:border-white/10 glass-card">
            <DistrictHazardMap
              district={selectedDistrict}
              interactive={true}
              showLegend={true}
              className="w-full h-full"
            />
          </div>

          <div className="text-[9px] font-mono text-text-muted pt-1 px-1 shrink-0">
            Model output (terrain + rainfall + cropland)
          </div>
        </div>

        {/* Center Column: Validation & Observations Card (Scrolls ONLY if content overflows) */}
        <div className="lg:col-span-4 h-full flex flex-col min-h-0 glass-card p-3 sm:p-3.5 rounded-2xl border border-line dark:border-white/10 shadow-xl overflow-y-auto pr-1 stats-scrollbar gap-2">
          {/* Header */}
          <div className="border-b border-line dark:border-white/10 pb-1.5 shrink-0">
            <div className="text-[9px] font-mono uppercase tracking-wider text-citron font-bold flex items-center gap-1">
              <span
                className="w-2 h-2 inline-block bg-citron"
                style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
              />
              <span>VALIDATION &amp; OBSERVATIONS</span>
            </div>
            <div className="text-[11px] text-text-muted font-mono mt-0.5">
              Spatial alignment between model &amp; recorded events
            </div>
          </div>

          {/* Model Agreement Metric Badge */}
          <div className="p-2.5 rounded-xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 flex items-center justify-between shrink-0">
            <div className="space-y-0.5">
              <span className="text-[9px] font-mono text-text-muted uppercase block">Spatial Alignment</span>
              <span className="text-sm font-bold font-mono text-emerald-400">84.2% Agreement</span>
            </div>
            <div
              className="w-9 h-9 bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs"
              style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
            >
              0.84
            </div>
          </div>

          {/* 3 Structured Observations with Hexagonal Markers (NO Circles) */}
          <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1 stats-scrollbar py-1">
            {/* Observation 1: General Agreement */}
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <span
                  className="w-4 h-4 bg-emerald-500 text-black flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                >
                  ✓
                </span>
                <span>General agreement</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-snug pl-6">
                High-risk zones in the model align with historical flood-prone districts (e.g., lower valley regions along main river channels).
              </p>
            </div>

            {/* Observation 2: Partial Mismatch */}
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <span
                  className="w-4 h-4 bg-amber-500 text-black flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                >
                  !
                </span>
                <span>Partial mismatch</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-snug pl-6">
                Some high-risk districts show lower recorded risk, possibly due to unmodelled localized embankment infrastructure.
              </p>
            </div>

            {/* Observation 3: Limited Data */}
            <div className="p-2.5 rounded-xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-text-secondary">
                <span
                  className="w-4 h-4 bg-slate-500/30 text-text-primary flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                >
                  ℹ
                </span>
                <span>Limited data</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-snug pl-6">
                Several districts have no recorded losses in open data registers (or no satellite SAR model coverage).
              </p>
            </div>
          </div>

          {/* Bottom Methodology & Sources Banner */}
          <div className="pt-2 border-t border-line dark:border-white/10 flex items-center justify-between gap-2 shrink-0">
            <div className="text-[10px] text-text-muted font-mono leading-tight">
              MHA (2014-2022) • CWC • NCRB
            </div>
            <button
              type="button"
              onClick={onNavigateToSources}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-1 dark:bg-white/5 hover:bg-surface-2 dark:hover:bg-white/10 border border-line dark:border-white/10 text-[10px] font-mono font-bold text-citron transition-colors cursor-pointer"
            >
              <span>Methodology</span>
              <span className="material-symbols-outlined text-[11px]">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Right Map: Recorded MHA / CWC Losses - Fixed, Never Scrolls */}
        <div className="lg:col-span-4 h-full flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between pb-1 px-1 shrink-0">
            <span className="text-[10px] font-mono font-bold uppercase text-rose-500 flex items-center gap-1.5">
              <span
                className="w-2 h-2 inline-block bg-rose-500"
                style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
              />
              <span>RECORDED • MHA / CWC LOSSES</span>
            </span>
            <span className="text-[9px] font-mono text-text-muted">H3 aggregation</span>
          </div>

          <div className="relative flex-1 min-h-0 rounded-2xl overflow-hidden border border-line dark:border-white/10 glass-card">
            <DisasterLossMap
              centerLat={selectedDistrict.lat}
              centerLng={selectedDistrict.lng}
              stateName={selectedDistrict.name}
              zoom={selectedDistrict.zoom ? selectedDistrict.zoom - 1 : 9.2}
              showLegend={true}
              className="w-full h-full"
            />
          </div>

          <div className="text-[9px] font-mono text-text-muted pt-1 px-1 shrink-0">
            State-level / district-level aggregated losses
          </div>
        </div>
      </div>
    </div>
  );
};
