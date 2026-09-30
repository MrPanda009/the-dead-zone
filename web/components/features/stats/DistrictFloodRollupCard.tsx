'use client';

import React from 'react';
import type { DistrictFloodRollupCardProps } from './types';

export const DistrictFloodRollupCard: React.FC<DistrictFloodRollupCardProps> = ({
  summary,
  isLoading = false,
  districtName,
  className = '',
  classNames = {},
}) => {
  if (isLoading) {
    return (
      <div className={`glass-card p-6 rounded-3xl border border-line dark:border-white/10 animate-pulse space-y-4 ${className}`}>
        <div className="h-5 w-48 bg-surface-2 dark:bg-white/10 rounded" />
        <div className="h-20 bg-surface-2 dark:bg-white/10 rounded-2xl" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-surface-2 dark:bg-white/10 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const isComputed = summary?.model_status === 'computed';
  const bands = summary?.band_distribution;
  const drivers = summary?.drivers_summary;

  return (
    <div
      className={`glass-card p-5 sm:p-6 rounded-3xl border border-line dark:border-white/10 space-y-4 ${classNames.root ?? ''} ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-bold text-ink dark:text-white">
              {districtName} Flood Model Rollup
            </h3>
            {isComputed ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Computed (SAR + HAND v0.1)</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/15 text-amber-500 border border-amber-500/30">
                Flood Model Not Computed
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Empirical Sentinel-1 SAR inundation frequency & Copernicus HAND at H3 res-8.
          </p>
        </div>

        {isComputed && (
          <div className="text-right text-xs font-mono text-text-secondary">
            <span>{summary?.total_cells?.toLocaleString()} H3 Cells</span>
          </div>
        )}
      </div>

      {!isComputed ? (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">info</span>
            <span>No Empirical SAR Flood Model for {districtName}</span>
          </div>
          <p className="text-[11px] leading-relaxed opacity-90">
            A calibrated Sentinel-1 SAR and hydrodynamic model is published for Dholpur, Morena, and Barpeta. For {districtName}, hazard screening relies on historical disaster tallies and terrain slope proxies.
          </p>
        </div>
      ) : (
        <>
          {/* Headline Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10">
              <div className="text-[10px] font-mono uppercase text-text-muted">Habitations at Risk</div>
              <div className="text-lg font-bold font-mono text-rose-500">
                {summary?.habitations_at_risk_count ?? 0}
              </div>
              <div className="text-[9px] text-text-muted font-mono">Susceptibility ≥ 0.50</div>
            </div>

            <div className="p-3 rounded-2xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10">
              <div className="text-[10px] font-mono uppercase text-text-muted">Citizens Exposed</div>
              <div className="text-lg font-bold font-mono text-amber-500">
                {summary?.population_at_risk_sum?.toLocaleString() ?? 0}
              </div>
              <div className="text-[9px] text-text-muted font-mono">WorldPop Dasymetric</div>
            </div>

            <div className="p-3 rounded-2xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10">
              <div className="text-[10px] font-mono uppercase text-text-muted">Peak Susceptibility</div>
              <div className="text-lg font-bold font-mono text-ink dark:text-white">
                {summary?.max_susceptibility?.toFixed(2) ?? '0.00'}
              </div>
              <div className="text-[9px] text-text-muted font-mono">Mean: {summary?.mean_susceptibility?.toFixed(2)}</div>
            </div>

            <div className="p-3 rounded-2xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10">
              <div className="text-[10px] font-mono uppercase text-text-muted">Unmeasured Cells</div>
              <div className="text-lg font-bold font-mono text-text-secondary">
                {summary?.unmeasured_cells_count ?? 0}
              </div>
              <div className="text-[9px] text-rose-400 font-mono">Treated as No Data</div>
            </div>
          </div>

          {/* Susceptibility Band Breakdown Bar */}
          {bands && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-text-muted">Susceptibility Band Share</span>
                <span className="text-[10px] text-text-muted">
                  High+Very High: {Math.round(((bands.high + bands.very_high) * 100))}%
                </span>
              </div>
              <div className="h-3 w-full bg-surface-2 dark:bg-white/5 rounded-full overflow-hidden flex">
                <div title={`Very Low (<0.2): ${Math.round(bands.very_low * 100)}%`} style={{ width: `${bands.very_low * 100}%` }} className="bg-emerald-400 h-full" />
                <div title={`Low (0.2-0.4): ${Math.round(bands.low * 100)}%`} style={{ width: `${bands.low * 100}%` }} className="bg-emerald-500 h-full" />
                <div title={`Moderate (0.4-0.6): ${Math.round(bands.moderate * 100)}%`} style={{ width: `${bands.moderate * 100}%` }} className="bg-amber-400 h-full" />
                <div title={`High (0.6-0.8): ${Math.round(bands.high * 100)}%`} style={{ width: `${bands.high * 100}%` }} className="bg-rose-500 h-full" />
                <div title={`Very High (>=0.8): ${Math.round(bands.very_high * 100)}%`} style={{ width: `${bands.very_high * 100}%` }} className="bg-purple-600 h-full" />
              </div>
            </div>
          )}

          {/* Physical Drivers Snippet */}
          {drivers && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono text-text-secondary">
              <div className="px-2.5 py-1.5 rounded-xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10">
                Mean HAND: <strong className="text-ink dark:text-white">{drivers.mean_hand_m} m</strong>
              </div>
              <div className="px-2.5 py-1.5 rounded-xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10">
                Mean Slope: <strong className="text-ink dark:text-white">{drivers.mean_slope_deg}°</strong>
              </div>
              <div className="px-2.5 py-1.5 rounded-xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10">
                Cropland: <strong className="text-ink dark:text-white">{Math.round((drivers.mean_cropland_fraction ?? 0) * 100)}%</strong>
              </div>
              <div className="px-2.5 py-1.5 rounded-xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10">
                Inundation Freq: <strong className="text-ink dark:text-white">{Math.round((drivers.mean_inundation_frequency ?? 0) * 100)}%</strong>
              </div>
            </div>
          )}
        </>
      )}

      {/* Objective Decision Prompt */}
      {summary?.officer_decision_prompt && (
        <div className="p-3.5 rounded-2xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 text-xs space-y-1">
          <div className="font-semibold font-mono uppercase text-[10px] text-citron flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">gavel</span>
            <span>Officer Decision Brief (Objective Facts)</span>
          </div>
          <p className="text-text-secondary leading-relaxed font-sans">
            {summary.officer_decision_prompt}
          </p>
        </div>
      )}
    </div>
  );
};
