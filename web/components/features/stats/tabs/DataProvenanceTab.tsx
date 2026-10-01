'use client';

import React, { useState, useMemo } from 'react';
import { DATASET_PROVENANCE_ROWS } from '../statsData';
import type { DataProvenanceTabProps } from '../types';

export const DataProvenanceTab: React.FC<DataProvenanceTabProps> = ({
  datasets = DATASET_PROVENANCE_ROWS,
  lastUpdated = 'Sep 2024',
  onSelectDataset,
  className = '',
  classNames = {},
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDatasets = useMemo(() => {
    if (!searchQuery.trim()) return datasets;
    const q = searchQuery.toLowerCase();
    return datasets.filter(
      (d) =>
        d.dataset.toLowerCase().includes(q) ||
        d.ministry.toLowerCase().includes(q) ||
        d.limitations.toLowerCase().includes(q)
    );
  }, [datasets, searchQuery]);

  return (
    <div className={`h-full min-h-0 flex flex-col justify-between overflow-hidden ${classNames.root ?? ''} ${className}`}>
      {/* Top Banner & Search Filter (Compact Screen-Fitted) */}
      <div className="flex items-center justify-between gap-3 shrink-0 pb-1.5">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 inline-block bg-citron shrink-0"
              style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
            />
            <span className="text-[10px] font-mono uppercase tracking-widest text-citron font-bold">
              TRANSPARENT DATA. STRONGER DECISIONS.
            </span>
          </div>
          <h1 className="font-display text-lg sm:text-xl font-extrabold text-ink dark:text-white tracking-tight leading-tight">
            Sources &amp; Data Provenance — {lastUpdated}
          </h1>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl glass-card border border-line dark:border-white/10 w-64">
          <span className="material-symbols-outlined text-text-muted text-base">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter datasets or ministries..."
            className="w-full bg-transparent text-xs font-mono text-ink dark:text-white placeholder:text-text-muted outline-none pr-1"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-text-muted hover:text-text-primary text-[10px] font-mono cursor-pointer"
            >
              clear
            </button>
          )}
        </div>
      </div>

      {/* Authoritative Datasets Matrix Table (Scrolls cleanly inside container only, zero page scroll) */}
      <div className="flex-1 min-h-0 glass-card rounded-2xl border border-line dark:border-white/10 overflow-hidden shadow-xl flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead className="sticky top-0 z-10 bg-surface-1/90 dark:bg-forest-surface/90 backdrop-blur-md">
              <tr className="border-b border-line dark:border-white/10 text-[10px] text-text-muted uppercase tracking-wider">
                <th className="py-2.5 px-4 font-bold">Dataset / Source</th>
                <th className="py-2.5 px-3 font-bold">Ministry / Source</th>
                <th className="py-2.5 px-3 font-bold">Years</th>
                <th className="py-2.5 px-3 font-bold">Granularity</th>
                <th className="py-2.5 px-3 font-bold">Freshness</th>
                <th className="py-2.5 px-4 font-bold">Limitations</th>
                <th className="py-2.5 px-3 text-center font-bold">API</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line dark:divide-white/5">
              {filteredDatasets.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onSelectDataset?.(row)}
                  className="hover:bg-surface-2/40 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                >
                  {/* Dataset Name & Hexagonal Icon */}
                  <td className="py-2.5 px-4 font-bold text-ink dark:text-white">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 bg-surface-2 dark:bg-white/10 flex items-center justify-center text-citron shrink-0 group-hover:scale-110 transition-transform"
                        style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                      >
                        <span className="material-symbols-outlined text-xs">{row.icon}</span>
                      </div>
                      <span className="group-hover:text-citron transition-colors text-xs">{row.dataset}</span>
                    </div>
                  </td>

                  {/* Ministry */}
                  <td className="py-2.5 px-3 text-text-secondary text-[11px]">{row.ministry}</td>

                  {/* Years */}
                  <td className="py-2.5 px-3 text-text-secondary font-medium text-[11px]">{row.years}</td>

                  {/* Granularity */}
                  <td className="py-2.5 px-3 text-text-muted text-[11px]">{row.granularity}</td>

                  {/* Freshness */}
                  <td className="py-2.5 px-3 text-[11px]">
                    <span className="inline-flex items-center gap-1 text-text-secondary">
                      {row.freshness === 'Real-time' && (
                        <span
                          className="w-1.5 h-1.5 inline-block bg-emerald-500 animate-pulse"
                          style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                        />
                      )}
                      <span>{row.freshness}</span>
                    </span>
                  </td>

                  {/* Limitations */}
                  <td className="py-2.5 px-4 text-text-muted text-[10px] leading-tight max-w-xs">{row.limitations}</td>

                  {/* API Badge */}
                  <td className="py-2.5 px-3 text-center">
                    {row.hasApi ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-citron/15 text-citron text-[9px] font-bold border border-citron/30">
                        LIVE
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-surface-2 dark:bg-white/5 text-text-muted text-[9px]">
                        STATIC
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Warning / Transparency Banner */}
        <div className="p-2 px-4 border-t border-line dark:border-white/10 bg-surface-1/40 dark:bg-black/20 flex items-center justify-between text-[10px] font-mono text-text-muted shrink-0">
          <span>Data verified against official parliamentary records and open government datasets.</span>
          <span>Showing {filteredDatasets.length} authoritative sources</span>
        </div>
      </div>
    </div>
  );
};
