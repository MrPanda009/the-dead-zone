'use client';

import React, { useState, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { LossChartSkeleton } from './LossChartSkeleton';
import type { LossTimeSeriesChartProps } from './types';

export const LossTimeSeriesChart: React.FC<LossTimeSeriesChartProps> = ({
  stats,
  isLoading = false,
  selectedMetric = 'lives',
  onMetricChange,
  className = '',
  classNames = {},
}) => {
  const [metric, setMetric] = useState<'lives' | 'houses' | 'cattle' | 'crop'>(selectedMetric);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMetricSelect = (m: 'lives' | 'houses' | 'cattle' | 'crop') => {
    setMetric(m);
    onMetricChange?.(m);
  };

  const records = stats?.loss_time_series ?? [];

  useGSAP(
    () => {
      if (!containerRef.current || records.length === 0) return;
      gsap.fromTo(
        '.loss-bar',
        { scaleY: 0, opacity: 0 },
        { scaleY: 1, opacity: 1, duration: 0.45, stagger: 0.04, ease: 'power2.out' },
      );
    },
    { scope: containerRef, dependencies: [metric, records.length, stats?.state_name] },
  );

  if (isLoading) {
    return <LossChartSkeleton className={className} />;
  }

  const metricConfig = {
    lives: { label: 'Lives Lost', unit: 'casualties', color: 'bg-rose-500', hoverColor: 'hover:bg-rose-400' },
    houses: { label: 'Houses Damaged', unit: 'units', color: 'bg-amber-500', hoverColor: 'hover:bg-amber-400' },
    cattle: { label: 'Cattle Lost', unit: 'heads', color: 'bg-orange-500', hoverColor: 'hover:bg-orange-400' },
    crop: { label: 'Crop Area Affected', unit: 'hectares', color: 'bg-emerald-500', hoverColor: 'hover:bg-emerald-400' },
  };

  const currentCfg = metricConfig[metric];

  const getMetricValue = (r: (typeof records)[0]) => {
    switch (metric) {
      case 'lives':
        return r.lives_lost;
      case 'houses':
        return r.houses_damaged;
      case 'cattle':
        return r.cattle_lost;
      case 'crop':
        return r.crop_area_affected_ha;
    }
  };

  const maxValue = Math.max(...records.map(getMetricValue), 1);

  return (
    <div
      ref={containerRef}
      className={`glass-card p-5 sm:p-6 rounded-3xl border border-line dark:border-white/10 space-y-5 ${classNames.root ?? ''} ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-ink dark:text-white">
              Annual Disaster Impact Time-Series
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-surface-2 dark:bg-white/10 text-text-secondary">
              MHA / Rajya Sabha
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Reported annual hydro-meteorological damages in {stats?.state_name ?? 'selected state'}.
          </p>
        </div>

        {/* Metric Selector Toggles */}
        <div className="flex items-center gap-1 bg-surface-1 dark:bg-forest-surface p-1 rounded-2xl border border-line dark:border-white/10 shrink-0">
          {(['lives', 'houses', 'cattle', 'crop'] as const).map((m) => {
            const isSelected = metric === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => handleMetricSelect(m)}
                className={`px-3 py-1 rounded-xl text-[11px] font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-ink dark:bg-white text-white dark:text-forest-dark font-semibold shadow-sm'
                    : 'text-text-muted hover:text-ink dark:hover:text-white'
                }`}
              >
                {metricConfig[m].label}
              </button>
            );
          })}
        </div>
      </div>

      {records.length === 0 ? (
        <div className="h-56 flex flex-col items-center justify-center text-center p-6 border border-dashed border-line dark:border-white/10 rounded-2xl">
          <span className="material-symbols-outlined text-3xl text-text-muted mb-1">history_toggle_off</span>
          <span className="text-xs font-semibold text-text-secondary">No recorded loss data published</span>
          <span className="text-[11px] text-text-muted mt-0.5 max-w-sm">
            Official annual reports for this state are not published in the central open data archive for the requested years.
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Chart Viewport */}
          <div className="h-52 flex items-end gap-2 sm:gap-3 pt-6 px-1 relative">
            {records.map((r, i) => {
              const val = getMetricValue(r);
              const heightPct = Math.max(6, Math.round((val / maxValue) * 100));
              const isHovered = hoveredIdx === i;

              return (
                <div
                  key={r.year_label}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Tooltip on Hover */}
                  {isHovered && (
                    <div className="absolute -top-14 z-30 px-3 py-1.5 rounded-xl bg-forest-dark text-white text-[11px] font-mono shadow-xl border border-white/20 whitespace-nowrap pointer-events-none">
                      <div className="font-bold text-citron">
                        {val.toLocaleString()} {currentCfg.unit}
                      </div>
                      <div className="text-[9px] text-white/70">
                        {r.year_label} • {r.hazard_types_included}
                      </div>
                    </div>
                  )}

                  {/* Value on top of bar */}
                  <span className="text-[10px] font-mono text-text-muted mb-1 group-hover:text-ink dark:group-hover:text-white transition-colors">
                    {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                  </span>

                  {/* Animated Bar */}
                  <div className="w-full bg-surface-2 dark:bg-white/5 rounded-t-xl h-full flex items-end overflow-hidden">
                    <div
                      className={`loss-bar w-full rounded-t-xl transition-all duration-150 origin-bottom ${currentCfg.color} ${currentCfg.hoverColor} ${
                        isHovered ? 'brightness-125' : ''
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>

                  {/* X Axis Label */}
                  <span className="text-[10px] font-mono text-text-muted mt-2 tracking-tight">
                    {r.year_label.replace('20', "'")}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-text-muted pt-2 border-t border-line dark:border-white/10 font-mono">
            <span>* MHA tallies aggregate multiple hazard triggers (flood/rain/landslide)</span>
            <span>Peak: {maxValue.toLocaleString()} {currentCfg.unit}</span>
          </div>
        </div>
      )}
    </div>
  );
};
