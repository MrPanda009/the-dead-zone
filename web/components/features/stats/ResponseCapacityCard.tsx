'use client';

import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { ResponseCapacityCardProps } from './types';
import type { ReliefAllocationDTO } from '@/lib/api/stats';

export const ResponseCapacityCard: React.FC<ResponseCapacityCardProps> = ({
  stats,
  isLoading = false,
  className = '',
  classNames = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current || isLoading) return;
      const tiles = containerRef.current.querySelectorAll('.animate-tile');
      if (tiles.length === 0) return;
      gsap.from(tiles, {
        opacity: 0,
        y: 10,
        duration: 0.35,
        stagger: 0.04,
        ease: 'power2.out',
      });
    },
    { scope: containerRef, dependencies: [stats, isLoading] }
  );

  if (isLoading) {
    return (
      <div className={`glass-card p-6 rounded-3xl border border-line dark:border-white/10 animate-pulse space-y-4 ${className}`}>
        <div className="h-5 w-52 bg-surface-2 dark:bg-white/10 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-surface-2 dark:bg-white/10 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const reliefList: ReliefAllocationDTO[] = stats?.response_funding ?? [];
  const highway = stats?.highway_damage;

  const latestRelief = reliefList.length > 0 ? reliefList[reliefList.length - 1] : null;
  const totalSdrf = latestRelief
    ? (latestRelief.sdrf_central_share_cr ?? 0) + (latestRelief.sdrf_state_share_cr ?? 0)
    : 0;

  return (
    <div
      ref={containerRef}
      className={`glass-card p-5 sm:p-6 rounded-3xl border border-line dark:border-white/10 space-y-5 ${classNames.root ?? ''} ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-bold text-ink dark:text-white">
              Financial Relief & Infrastructure Restoration
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
              15th FC / MoRTH
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            SDRF statutory allocation matrix, NDRF additional releases, and national highway restoration outlays.
          </p>
        </div>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="animate-tile p-4 rounded-2xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10">
          <div className="text-[10px] font-mono uppercase text-text-muted">Total SDRF Allocation</div>
          <div className="text-xl font-bold font-mono text-emerald-500 mt-1">
            {latestRelief ? `₹${totalSdrf.toFixed(1)} Cr` : 'N/A'}
          </div>
          <div className="text-[10px] text-text-muted font-mono mt-0.5">
            {latestRelief ? `FY ${latestRelief.fiscal_year} (Centre: ₹${latestRelief.sdrf_central_share_cr.toFixed(1)} Cr)` : 'No records'}
          </div>
        </div>

        <div className="animate-tile p-4 rounded-2xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10">
          <div className="text-[10px] font-mono uppercase text-text-muted">NDRF Additional Release</div>
          <div className="text-xl font-bold font-mono text-ink dark:text-white mt-1">
            {latestRelief && latestRelief.ndrf_releases_cr !== null && latestRelief.ndrf_releases_cr !== undefined
              ? `₹${latestRelief.ndrf_releases_cr.toFixed(1)} Cr`
              : 'N/A'}
          </div>
          <div className="text-[10px] text-text-muted font-mono mt-0.5">
            {latestRelief ? `${latestRelief.lives_saved_count ?? 0} Lives Saved Logged` : 'Severe Calamity Release'}
          </div>
        </div>

        <div className="animate-tile p-4 rounded-2xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10">
          <div className="text-[10px] font-mono uppercase text-text-muted">Highway Damage Restoration</div>
          <div className="text-xl font-bold font-mono text-amber-500 mt-1">
            {highway ? `${highway.damaged_length_km} km` : 'N/A'}
          </div>
          <div className="text-[10px] text-text-muted font-mono mt-0.5">
            {highway ? `${highway.disaster_triggers} (${highway.reporting_period})` : 'No highway damage logged'}
          </div>
        </div>
      </div>

      {/* Allocation Breakdown Table if multiple records */}
      {reliefList.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-line dark:border-white/10">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-surface-2 dark:bg-forest-surface text-text-muted uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Financial Year</th>
                <th className="py-2.5 px-3">Central Share (₹ Cr)</th>
                <th className="py-2.5 px-3">State Share (₹ Cr)</th>
                <th className="py-2.5 px-3">Total SDRF (₹ Cr)</th>
                <th className="py-2.5 px-3">NDRF Released (₹ Cr)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line dark:divide-white/5 text-ink dark:text-white">
              {reliefList.map((row: ReliefAllocationDTO, idx: number) => {
                const rowTotal = (row.sdrf_central_share_cr ?? 0) + (row.sdrf_state_share_cr ?? 0);
                return (
                  <tr key={idx} className="hover:bg-surface-1 dark:hover:bg-white/5 transition-colors">
                    <td className="py-2 px-3 font-semibold">{row.fiscal_year}</td>
                    <td className="py-2 px-3">{row.sdrf_central_share_cr?.toFixed(1) ?? '—'}</td>
                    <td className="py-2 px-3">{row.sdrf_state_share_cr?.toFixed(1) ?? '—'}</td>
                    <td className="py-2 px-3 font-bold text-emerald-500">{rowTotal.toFixed(1)}</td>
                    <td className="py-2 px-3">{row.ndrf_releases_cr ? row.ndrf_releases_cr.toFixed(1) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
