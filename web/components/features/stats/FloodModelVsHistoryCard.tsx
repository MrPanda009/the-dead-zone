'use client';

import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { FloodModelVsHistoryCardProps } from './types';

export const FloodModelVsHistoryCard: React.FC<FloodModelVsHistoryCardProps> = ({
  summary,
  stats,
  isLoading = false,
  className = '',
  classNames = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current || isLoading) return;
      gsap.from(containerRef.current.querySelectorAll('.animate-fade'), {
        opacity: 0,
        y: 8,
        duration: 0.35,
        stagger: 0.05,
        ease: 'power2.out',
      });
    },
    { scope: containerRef, dependencies: [summary, stats, isLoading] }
  );

  if (isLoading) {
    return (
      <div className={`glass-card p-6 rounded-3xl border border-line dark:border-white/10 animate-pulse space-y-4 ${className}`}>
        <div className="h-5 w-60 bg-surface-2 dark:bg-white/10 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-44 bg-surface-2 dark:bg-white/10 rounded-2xl" />
          <div className="h-44 bg-surface-2 dark:bg-white/10 rounded-2xl" />
        </div>
      </div>
    );
  }

  const isComputed = summary?.model_status === 'computed';
  const cwcDamages = stats?.cwc_flood_history ?? [];
  const latestCwc = cwcDamages.length > 0 ? cwcDamages[cwcDamages.length - 1] : null;

  return (
    <div
      ref={containerRef}
      className={`glass-card p-5 sm:p-6 rounded-3xl border border-line dark:border-white/10 space-y-4 ${classNames.root ?? ''} ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-bold text-ink dark:text-white">
              Model Calibration vs Recorded Reality
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-accent/10 text-accent font-semibold border border-accent/20">
              Cross-Validation
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Juxtaposing empirical SAR flood susceptibility against verified CWC and MHA damage logs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Computed Physical Model */}
        <div className="animate-fade p-4 rounded-2xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase font-semibold text-text-muted">
              Computed Susceptibility
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-2 dark:bg-white/5 text-text-secondary">
              SAR + Hydro-DEM
            </span>
          </div>

          {isComputed ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-line dark:border-white/5">
                <span className="text-text-secondary">Habitations at Risk:</span>
                <span className="font-mono font-bold text-rose-500">
                  {summary?.habitations_at_risk_count ?? 0}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-line dark:border-white/5">
                <span className="text-text-secondary">Mean Inundation Predisposition:</span>
                <span className="font-mono font-bold text-ink dark:text-white">
                  {(summary?.mean_susceptibility ?? 0).toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-line dark:border-white/5">
                <span className="text-text-secondary">Population In High-Zone:</span>
                <span className="font-mono font-bold text-amber-500">
                  {summary?.population_at_risk_sum?.toLocaleString() ?? 0}
                </span>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed pt-1">
                Derived from multi-temporal Sentinel-1 C-band SAR amplitude variance and Copernicus 30m HAND.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-surface-0 dark:bg-forest-dark border border-line dark:border-white/5 text-xs text-text-muted space-y-1">
              <p className="font-medium text-text-secondary">No Empirical SAR Grid for Current Selection</p>
              <p className="text-[11px]">
                SAR model layer requires dual-pass Sentinel-1 coverage and hydro-flattened DEM. Historical logs provide primary guidance.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Historical Ground Logs */}
        <div className="animate-fade p-4 rounded-2xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase font-semibold text-text-muted">
              Ground Truth Records
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-2 dark:bg-white/5 text-text-secondary">
              CWC & MHA Annual Logs
            </span>
          </div>

          {latestCwc ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-line dark:border-white/5">
                <span className="text-text-secondary">Latest Logged Year:</span>
                <span className="font-mono font-bold text-ink dark:text-white">
                  {latestCwc.calendar_year}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-line dark:border-white/5">
                <span className="text-text-secondary">Human Lives Lost (CWC):</span>
                <span className="font-mono font-bold text-rose-500">
                  {latestCwc.human_lives_lost ?? 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-line dark:border-white/5">
                <span className="text-text-secondary">Area Affected:</span>
                <span className="font-mono font-bold text-amber-500">
                  {latestCwc.area_affected_mha ? `${latestCwc.area_affected_mha} Mha` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-line dark:border-white/5">
                <span className="text-text-secondary">Direct Economic Damage:</span>
                <span className="font-mono font-bold text-emerald-500">
                  {latestCwc.total_damage_crores ? `₹${latestCwc.total_damage_crores} Cr` : 'N/A'}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-surface-0 dark:bg-forest-dark border border-line dark:border-white/5 text-xs text-text-muted space-y-1">
              <p className="font-medium text-text-secondary">No CWC State Entry Recorded</p>
              <p className="text-[11px]">
                Ground tally relies on MHA unstarred questions and NCRB natural disaster series.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
