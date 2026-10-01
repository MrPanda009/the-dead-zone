'use client';

import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { DistrictHazardMap } from '../DistrictHazardMap';
import type { DistrictBriefTabProps } from '../types';

export const DistrictBriefTab: React.FC<DistrictBriefTabProps> = ({
  districts,
  selectedDistrict,
  onSelectDistrict,
  summary,
  isLoading = false,
  className = '',
  classNames = {},
}) => {
  const dossierRef = useRef<HTMLDivElement>(null);

  // Compute real highShare from summary.band_distribution if available
  const computedHighShare = summary?.band_distribution
    ? Math.round(
        ((summary.band_distribution.high ?? 0) + (summary.band_distribution.very_high ?? 0)) * 100
      )
    : null;

  const highShare =
    computedHighShare !== null && summary?.model_status === 'computed'
      ? computedHighShare
      : selectedDistrict.highSharePct;

  const habitationsAtRisk = summary?.habitations_at_risk_count ?? selectedDistrict.habitationsAtRisk;
  const populationAtRisk = summary?.population_at_risk_sum ?? selectedDistrict.populationAtRisk;
  const nearestPhc = selectedDistrict.nearestPhcKm;
  const infrastructure = {
    highways: selectedDistrict.highwaysDamaged,
    bridges: selectedDistrict.bridgesDamaged,
    schools: selectedDistrict.schoolsDamaged,
  };

  // Bind drivers_summary (HAND, slope, cropland, SAR frequency) directly
  const ds = summary?.drivers_summary;
  const drivers = {
    hand: {
      label: 'HAND (low relative elevation)',
      value: ds?.mean_hand_m != null ? `${ds.mean_hand_m.toFixed(1)}m` : `${selectedDistrict.drivers.handPct}%`,
      // For HAND, lower elevation has higher flood susceptibility (normalized inverse scale 0-15m)
      pct: ds?.mean_hand_m != null
        ? Math.max(6, Math.min(100, Math.round((1 - Math.min(ds.mean_hand_m, 15) / 15) * 100)))
        : selectedDistrict.drivers.handPct,
      color: 'bg-teal-400',
    },
    slope: {
      label: 'Slope gradient',
      value: ds?.mean_slope_deg != null ? `${ds.mean_slope_deg.toFixed(1)}°` : `${selectedDistrict.drivers.slopePct}%`,
      // For slope, flatter terrain (<15 deg) collects runoff and has higher pooling exposure
      pct: ds?.mean_slope_deg != null
        ? Math.max(6, Math.min(100, Math.round((1 - Math.min(ds.mean_slope_deg, 15) / 15) * 100)))
        : selectedDistrict.drivers.slopePct,
      color: 'bg-emerald-400',
    },
    cropland: {
      label: 'Cropland & Inundated soils',
      value: ds?.mean_cropland_fraction != null
        ? `${(ds.mean_cropland_fraction * 100).toFixed(1)}%`
        : `${selectedDistrict.drivers.croplandPct}%`,
      pct: ds?.mean_cropland_fraction != null
        ? Math.max(6, Math.min(100, Math.round(ds.mean_cropland_fraction * 100)))
        : selectedDistrict.drivers.croplandPct,
      color: 'bg-amber-400',
    },
    sarFrequency: {
      label: 'SAR Inundation frequency',
      value: ds?.mean_inundation_frequency != null
        ? `${(ds.mean_inundation_frequency * 100).toFixed(1)}%`
        : `${selectedDistrict.drivers.rainfallPct}%`,
      // Empirical Sentinel-1 annual inundation frequency F [0, 1] scaled against 25% chronic ceiling
      pct: ds?.mean_inundation_frequency != null
        ? Math.max(6, Math.min(100, Math.round(Math.min(1, ds.mean_inundation_frequency / 0.25) * 100)))
        : selectedDistrict.drivers.rainfallPct,
      color: 'bg-sky-400',
    },
  };

  useGSAP(
    () => {
      if (!dossierRef.current) return;
      gsap.fromTo(
        '.driver-progress',
        { width: 0 },
        {
          width: (i, target) => target.dataset.width,
          duration: 0.8,
          stagger: 0.08,
          ease: 'power3.out',
        }
      );
    },
    { scope: dossierRef, dependencies: [selectedDistrict.lgdCode, highShare, summary?.admin_id] }
  );

  // Deterministic number formatting to avoid SSR/client locale mismatch
  const formatCount = (n: number) => new Intl.NumberFormat('en-US').format(n);

  return (
    <div className={`h-full min-h-0 flex flex-col justify-between overflow-hidden ${classNames.root ?? ''} ${className}`}>
      {/* Top Banner & Header Controls (Compact Screen-Fitted) */}
      <div className="flex items-center justify-between gap-3 shrink-0 pb-1.5">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 inline-block bg-citron shrink-0"
              style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
            />
            <span className="text-[10px] font-mono uppercase tracking-widest text-citron font-bold">
              RISK WHERE WATER RISES.
            </span>
          </div>
          <h1 className="font-display text-lg sm:text-xl font-extrabold text-ink dark:text-white tracking-tight leading-tight">
            Flood Exposure / District Brief — {selectedDistrict.name}
          </h1>
        </div>

        {/* Top Right Status Badge & District Selector */}
        <div className="flex items-center gap-2">
          {/* District Picker Dropdown */}
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

          {/* Model Status Tag */}
          <div
            className={`hidden sm:flex px-2.5 py-1 rounded-xl glass-card border text-[10px] font-mono items-center gap-1.5 ${
              summary?.model_status === 'not_computed'
                ? 'border-amber-500/30 text-amber-500'
                : 'border-emerald-500/30 text-emerald-500'
            }`}
          >
            <span
              className={`w-2 h-2 inline-block ${
                summary?.model_status === 'not_computed' ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'
              }`}
              style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
            />
            <span className="font-bold">
              {summary?.model_status === 'not_computed' ? 'UNCOMPUTED CORRIDOR' : 'COMPUTED • TERRA V0.1'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Layout: Fixed 2D Map on Left + Scrollable Data Dossier on Right */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* Navigable 2D View Map Container (Pure H3 Hexagons, No Opacity/Resolution, No Legend - Stays Fixed Without Scrolling) */}
        <div className="lg:col-span-7 h-full flex flex-col min-h-0 overflow-hidden">
          <div className="relative flex-1 min-h-0 rounded-2xl overflow-hidden border border-line dark:border-white/10 glass-card shadow-2xl">
            <DistrictHazardMap
              district={selectedDistrict}
              interactive={true}
              showLegend={true}
              className="w-full h-full"
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-text-muted pt-1 px-1 shrink-0">
            <span>H3 Hexagonal grid: res-8 • High resolution SAR &amp; Copernicus HAND</span>
            <span>Navigable 2D View</span>
          </div>
        </div>

        {/* Right Side Panel: District Dossier (Scrolls ONLY if data does not fit on screen) */}
        <div
          ref={dossierRef}
          className="lg:col-span-5 h-full flex flex-col min-h-0 glass-card p-3.5 sm:p-4 rounded-2xl border border-line dark:border-white/10 shadow-xl overflow-y-auto pr-1.5 stats-scrollbar gap-2.5"
        >
          {/* Dossier Header */}
          <div className="flex items-center justify-between border-b border-line dark:border-white/10 pb-2 shrink-0">
            <div>
              <div className="text-[9px] font-mono uppercase tracking-wider text-citron font-bold flex items-center gap-1">
                <span
                  className="w-2 h-2 inline-block bg-citron"
                  style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                />
                <span>DISTRICT DOSSIER</span>
              </div>
              <h2 className="font-display text-base sm:text-lg font-bold text-ink dark:text-white mt-0.5">
                {selectedDistrict.name} ({selectedDistrict.state})
              </h2>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono text-text-muted block">LGD Code</span>
              <span className="text-xs font-mono font-bold text-ink dark:text-white">
                #{selectedDistrict.lgdCode}
              </span>
            </div>
          </div>

          {/* Hexagonal Risk Badge (Replaced Circular Gauge) */}
          <div className="p-3 rounded-xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 flex items-center gap-3.5 shrink-0">
            {/* SVG Hexagonal Risk Gauge */}
            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
              <svg width="64" height="64" viewBox="0 0 64 64" className="drop-shadow-sm">
                {/* Background Hexagon track */}
                <polygon
                  points="32,4 58,19 58,45 32,60 6,45 6,19"
                  fill="rgba(239,68,68,0.08)"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-surface-2 dark:text-white/15"
                />
                {/* Dynamic Hexagon perimeter */}
                <polygon
                  points="32,4 58,19 58,45 32,60 6,45 6,19"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="3.2"
                  strokeDasharray="180"
                  strokeDashoffset={180 * (1 - highShare / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-sm font-bold font-mono text-ink dark:text-white leading-none">
                  {highShare}%
                </span>
                <span className="text-[7px] font-mono text-rose-500 font-bold uppercase tracking-tighter mt-0.5">
                  SHARE
                </span>
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-xs font-bold text-ink dark:text-white flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 inline-block bg-rose-500"
                  style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                />
                <span>High susceptibility share</span>
              </div>
              <div className="text-[10px] text-text-muted font-mono leading-tight">
                Percentage of modelled H3 cells categorized as high/critical flood risk.
              </div>
            </div>
          </div>

          {/* 4 Key Numbers Grid */}
          <div className="grid grid-cols-2 gap-2 shrink-0">
            <div className="p-2.5 rounded-xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 space-y-0.5">
              <div className="flex items-center gap-1 text-text-muted text-[9px] font-mono uppercase">
                <span className="material-symbols-outlined text-[11px]">home</span>
                <span>Habitations at Risk</span>
              </div>
              <div className="text-sm sm:text-base font-bold font-mono text-rose-500">
                {formatCount(habitationsAtRisk)}
              </div>
              <div className="text-[8px] text-text-muted font-mono">In high-risk cells</div>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 space-y-0.5">
              <div className="flex items-center gap-1 text-text-muted text-[9px] font-mono uppercase">
                <span className="material-symbols-outlined text-[11px]">groups</span>
                <span>Population at Risk</span>
              </div>
              <div className="text-sm sm:text-base font-bold font-mono text-amber-500">
                {formatCount(populationAtRisk)}
              </div>
              <div className="text-[8px] text-text-muted font-mono">WorldPop Dasymetric</div>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 space-y-0.5">
              <div className="flex items-center gap-1 text-text-muted text-[9px] font-mono uppercase">
                <span className="material-symbols-outlined text-[11px]">local_hospital</span>
                <span>Nearest PHC</span>
              </div>
              <div className="text-sm sm:text-base font-bold font-mono text-ink dark:text-white">
                {nearestPhc} km
              </div>
              <div className="text-[8px] text-text-muted font-mono">Emergency transit</div>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 space-y-0.5">
              <div className="flex items-center gap-1 text-text-muted text-[9px] font-mono uppercase">
                <span className="material-symbols-outlined text-[11px]">construction</span>
                <span>Infrastructure</span>
              </div>
              <div className="text-[11px] font-mono font-bold text-ink dark:text-white space-x-1">
                <span>H:{infrastructure.highways}</span>
                <span>B:{infrastructure.bridges}</span>
                <span>S:{infrastructure.schools}</span>
              </div>
              <div className="text-[8px] text-text-muted font-mono">Highways / Bridges / Sch</div>
            </div>
          </div>

          {/* Key Drivers for Inundation Frequency */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[9px] font-mono uppercase tracking-wider text-text-muted font-bold flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 inline-block bg-text-muted"
                style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
              />
              <span>KEY DRIVERS FOR INUNDATION FREQUENCY</span>
            </div>

            <div className="space-y-1.5">
              {/* HAND */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-text-secondary">{drivers.hand.label}</span>
                  <span className="font-bold text-ink dark:text-white">{drivers.hand.value}</span>
                </div>
                <div className="h-1.5 w-full bg-surface-2 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    data-width={`${drivers.hand.pct}%`}
                    className={`driver-progress h-full ${drivers.hand.color} rounded-full`}
                    style={{ width: `${drivers.hand.pct}%` }}
                  />
                </div>
              </div>

              {/* Slope */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-text-secondary">{drivers.slope.label}</span>
                  <span className="font-bold text-ink dark:text-white">{drivers.slope.value}</span>
                </div>
                <div className="h-1.5 w-full bg-surface-2 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    data-width={`${drivers.slope.pct}%`}
                    className={`driver-progress h-full ${drivers.slope.color} rounded-full`}
                    style={{ width: `${drivers.slope.pct}%` }}
                  />
                </div>
              </div>

              {/* Cropland */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-text-secondary">{drivers.cropland.label}</span>
                  <span className="font-bold text-ink dark:text-white">{drivers.cropland.value}</span>
                </div>
                <div className="h-1.5 w-full bg-surface-2 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    data-width={`${drivers.cropland.pct}%`}
                    className={`driver-progress h-full ${drivers.cropland.color} rounded-full`}
                    style={{ width: `${drivers.cropland.pct}%` }}
                  />
                </div>
              </div>

              {/* SAR Inundation Frequency */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-text-secondary">{drivers.sarFrequency.label}</span>
                  <span className="font-bold text-ink dark:text-white">{drivers.sarFrequency.value}</span>
                </div>
                <div className="h-1.5 w-full bg-surface-2 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    data-width={`${drivers.sarFrequency.pct}%`}
                    className={`driver-progress h-full ${drivers.sarFrequency.color} rounded-full`}
                    style={{ width: `${drivers.sarFrequency.pct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footnote */}
          <div className="pt-1.5 border-t border-line dark:border-white/10 text-[9px] font-mono text-text-muted flex items-center justify-between">
            <span>Model: {summary?.model_version ?? 'TERRA v0.1 (empirical SAR)'}</span>
            <span>Elevation: FABDEM 30m / Copernicus</span>
          </div>
        </div>
      </div>
    </div>
  );
};
