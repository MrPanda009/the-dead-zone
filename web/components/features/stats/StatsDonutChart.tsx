'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { EmptyState } from '@/components/common/EmptyState';
import { HexMarker } from '@/components/common/HexMarker';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import { formatInteger, formatYearRange } from '@/lib/stats/format';
import {
  hazardBreakdownFromNcrb,
  yearlyTrendFromLosses,
  type YearTrendPoint,
} from '@/lib/stats/history';

import { HazardBreakdownRow } from './HazardBreakdownRow';
import { StatsDonutChartSkeleton } from './StatsDonutChartSkeleton';
import type { StatsDonutChartProps } from './types';
import { YearTrendColumn } from './YearTrendColumn';

/**
 * Casualties by hazard (NCRB) and per-year lives lost (MHA) for one state.
 *
 * Everything shown is computed from the API payload. With no records the chart says so;
 * there is no default split and no default timeline.
 */
export const StatsDonutChart: React.FC<StatsDonutChartProps> = ({
  stats,
  isLoading = false,
  className = '',
  classNames = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotion();
  const [hoveredHazard, setHoveredHazard] = useState<string | null>(null);
  const [hoveredYear, setHoveredYear] = useState<YearTrendPoint | null>(null);

  const ncrb = stats?.ncrb_hazard_breakdown;
  const losses = stats?.loss_time_series;
  const breakdown = useMemo(() => hazardBreakdownFromNcrb(ncrb), [ncrb]);
  const trend = useMemo(() => yearlyTrendFromLosses(losses), [losses]);
  const maxDeaths = Math.max(...trend.map((p) => p.deaths), 0);

  useGSAP(
    () => {
      const root = containerRef.current;
      if (!root || reduceMotion) return;
      const bars = root.querySelectorAll('.hazard-hex-bar');
      if (bars.length > 0) {
        gsap.fromTo(
          bars,
          { width: 0 },
          { width: (_i: number, target: HTMLElement) => target.dataset.width ?? '0%', duration: 0.7, stagger: 0.05, ease: 'power3.out' },
        );
      }
      const columns = root.querySelectorAll('.trend-col-bar');
      if (columns.length > 0) {
        gsap.fromTo(
          columns,
          { scaleY: 0 },
          { scaleY: 1, transformOrigin: 'bottom', duration: 0.6, stagger: 0.04, ease: 'back.out(1.2)' },
        );
      }
    },
    { scope: containerRef, dependencies: [stats?.state_name, breakdown?.total, trend.length, reduceMotion, isLoading] },
  );

  if (isLoading) return <StatsDonutChartSkeleton className={className} />;

  if (!breakdown && trend.length === 0) {
    return (
      <EmptyState
        title={`No NCRB or MHA records for ${stats?.state_name ?? 'this state'}`}
        description="The recorded-loss tables returned nothing for the selected state and years."
        className={className}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`glass-card p-3.5 sm:p-4 rounded-2xl border border-line dark:border-white/10 space-y-3 shadow-lg select-none ${classNames.root ?? ''} ${className}`}
    >
      {breakdown ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-citron font-bold flex items-center gap-1.5">
                <HexMarker size="md" />
                <span>NATURAL-HAZARD DEATHS BY TYPE</span>
              </div>
              <div className="text-[11px] text-text-muted font-mono mt-0.5">
                {formatYearRange(breakdown.fromYear, breakdown.toYear)} · NCRB Forces of Nature
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-1 dark:bg-white/5 border border-line dark:border-white/10 text-right">
              <span className="text-xs sm:text-sm font-bold font-mono text-ink dark:text-white">
                {formatInteger(breakdown.total)}
              </span>
              <span className="text-[9px] font-mono text-text-muted uppercase">Deaths</span>
            </div>
          </div>

          <div className="space-y-1.5">
            {breakdown.items.map((item) => (
              <HazardBreakdownRow
                key={item.id}
                item={item}
                isHovered={hoveredHazard === item.id}
                onHover={setHoveredHazard}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyState title="No NCRB hazard breakdown" description="NCRB has no rows for this state." />
      )}

      {trend.length > 0 ? (
        <div className="pt-2 border-t border-line dark:border-white/10">
          <div className="flex items-center justify-between text-[10px] font-mono text-text-muted mb-1.5">
            <span className="uppercase font-bold tracking-wider text-text-secondary flex items-center gap-1">
              <HexMarker size="sm" colorClass="bg-text-muted" />
              LIVES LOST PER YEAR, ALL HAZARDS (MHA {trend[0].key} – {trend[trend.length - 1].key})
            </span>
            <span className="text-citron font-semibold">
              {hoveredYear ? `${hoveredYear.key}: ${formatInteger(hoveredYear.deaths)}` : 'Hover a year'}
            </span>
          </div>
          <div className="h-14 flex items-end justify-between gap-1.5 px-1 bg-surface-1/40 dark:bg-black/20 rounded-xl p-1.5 border border-line/50 dark:border-white/5">
            {trend.map((point) => (
              <YearTrendColumn
                key={point.key}
                point={point}
                max={maxDeaths}
                isHovered={hoveredYear?.key === point.key}
                onHover={setHoveredYear}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
