'use client';

import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { HazardCasualtyBreakdownProps } from './types';

export const HazardCasualtyBreakdown: React.FC<HazardCasualtyBreakdownProps> = ({
  stats,
  isLoading = false,
  className = '',
  classNames = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const ncrb = stats?.ncrb_hazard_breakdown ?? [];

  // Sum casualties across monitored NCRB years for this state
  const sums = ncrb.reduce(
    (acc, r) => ({
      landslide: acc.landslide + r.landslide_deaths,
      flood: acc.flood + r.flood_deaths + r.flash_flood_deaths + r.cloudburst_deaths,
      lightning: acc.lightning + r.lightning_deaths,
      cyclone: acc.cyclone + r.cyclone_deaths,
      cold_heat: acc.cold_heat + r.cold_heat_wave_deaths,
      other: acc.other + r.other_nature_deaths + r.avalanche_deaths,
      total: acc.total + r.total_deaths,
    }),
    { landslide: 0, flood: 0, lightning: 0, cyclone: 0, cold_heat: 0, other: 0, total: 0 },
  );

  const total = Math.max(sums.total, 1);

  const hazardCategories = [
    { label: 'Floods & Flash Floods', count: sums.flood, color: 'bg-blue-500', barColor: 'bg-blue-500' },
    { label: 'Lightning Strikes', count: sums.lightning, color: 'bg-amber-400', barColor: 'bg-amber-400' },
    { label: 'Landslides & Debris', count: sums.landslide, color: 'bg-rose-500', barColor: 'bg-rose-500' },
    { label: 'Cold / Heat Waves', count: sums.cold_heat, color: 'bg-indigo-400', barColor: 'bg-indigo-400' },
    { label: 'Cyclones & Surges', count: sums.cyclone, color: 'bg-teal-500', barColor: 'bg-teal-500' },
    { label: 'Other Forces of Nature', count: sums.other, color: 'bg-slate-400', barColor: 'bg-slate-400' },
  ].sort((a, b) => b.count - a.count);

  useGSAP(
    () => {
      if (!containerRef.current || ncrb.length === 0) return;
      gsap.fromTo(
        '.cat-bar',
        { width: 0 },
        { width: (i, target) => target.dataset.width, duration: 0.5, stagger: 0.05, ease: 'power2.out' },
      );
    },
    { scope: containerRef, dependencies: [stats?.state_name, ncrb.length] },
  );

  if (isLoading) {
    return (
      <div className={`glass-card p-6 rounded-3xl border border-line dark:border-white/10 animate-pulse space-y-4 ${className}`}>
        <div className="h-4 w-44 bg-surface-2 dark:bg-white/10 rounded" />
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-6 w-full bg-surface-2 dark:bg-white/10 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`glass-card p-5 sm:p-6 rounded-3xl border border-line dark:border-white/10 space-y-4 ${classNames.root ?? ''} ${className}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-bold text-ink dark:text-white">
              Casualties by Hazard Trigger
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-rose-500/15 text-rose-500 border border-rose-500/30">
              NCRB Forces of Nature
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Segregated fatalities across 2019–2023 for {stats?.state_name ?? 'selected state'}.
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold font-mono text-ink dark:text-white">
            {sums.total.toLocaleString()}
          </div>
          <div className="text-[10px] text-text-muted font-mono">Total Recorded Deaths</div>
        </div>
      </div>

      {ncrb.length === 0 ? (
        <div className="py-8 text-center text-xs text-text-muted">
          No NCRB casualty breakdown available for this state.
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          {hazardCategories.map((cat) => {
            const sharePct = Math.round((cat.count / total) * 100);
            return (
              <div key={cat.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                    <span className="text-text-secondary">{cat.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink dark:text-white">{cat.count.toLocaleString()}</span>
                    <span className="text-text-muted text-[11px] w-9 text-right">({sharePct}%)</span>
                  </div>
                </div>
                <div className="h-2 w-full bg-surface-2 dark:bg-white/5 rounded-full overflow-hidden">
                  <div
                    data-width={`${sharePct}%`}
                    className={`cat-bar h-full rounded-full ${cat.barColor}`}
                    style={{ width: `${sharePct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-[10px] text-text-muted font-mono pt-2 border-t border-line dark:border-white/10">
        * NCRB is the sole national repository distinguishing landslides from broader flood casualties.
      </div>
    </div>
  );
};
