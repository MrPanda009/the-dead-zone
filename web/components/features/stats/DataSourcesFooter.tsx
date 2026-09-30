'use client';

import React from 'react';
import type { DataSourcesFooterProps } from './types';

export const DataSourcesFooter: React.FC<DataSourcesFooterProps> = ({
  caveats = [],
  lastUpdated = 'September 2026',
  className = '',
  classNames = {},
}) => {
  const sources = [
    {
      ministry: 'MHA / NCRB',
      title: 'Accidental Deaths & Suicides in India (ADSI) — Causes of Natural Disasters',
      period: '2019 – 2023',
      identifier: 'Table 1.1',
    },
    {
      ministry: 'MHA DM Division',
      title: 'Loss of Lives & Properties due to Hydro-Meteorological Disasters',
      period: '2014 – 2022',
      identifier: 'Rajya Sabha USQ #1522',
    },
    {
      ministry: 'MoJS / CWC',
      title: 'Central Water Commission Annual Flood Damage Statistics in India',
      period: '2015 – 2021',
      identifier: 'CWC Hydrological Studies',
    },
    {
      ministry: 'MoRTH',
      title: 'Damages to National Highways due to Floods & Landslides & Restoration Sanction',
      period: '2018 – 2024',
      identifier: 'MoRTH Annual Reports',
    },
    {
      ministry: 'Finance Commission',
      title: '15th FC State Disaster Risk Management Fund (SDRF) & NDRF Allocations',
      period: '2021 – 2026',
      identifier: 'XV-FC Chapter 8',
    },
  ];

  return (
    <div
      className={`glass-card p-5 sm:p-6 rounded-3xl border border-line dark:border-white/10 space-y-4 ${classNames.root ?? ''} ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line dark:border-white/10 pb-3">
        <div>
          <h4 className="font-display text-sm font-bold text-ink dark:text-white flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base text-accent">verified_user</span>
            <span>Data Provenance & Open Government Data (OGD) Compliance</span>
          </h4>
          <p className="text-xs text-text-muted mt-0.5">
            Official government statistical baselines ingested into PostgreSQL. Zero external runtime dependencies.
          </p>
        </div>
        <div className="text-xs font-mono text-text-muted">
          Last Synchronized: <span className="text-ink dark:text-white font-semibold">{lastUpdated}</span>
        </div>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {sources.map((src, idx) => (
          <div
            key={idx}
            className="p-3 rounded-2xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 space-y-1"
          >
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="font-bold text-accent">{src.ministry}</span>
              <span className="text-text-muted">{src.period}</span>
            </div>
            <div className="text-xs font-medium text-ink dark:text-white line-clamp-1">
              {src.title}
            </div>
            <div className="text-[10px] font-mono text-text-secondary">
              Ref: {src.identifier}
            </div>
          </div>
        ))}
      </div>

      {/* Caveats / Legal */}
      <div className="p-3 rounded-2xl bg-surface-0 dark:bg-forest-dark border border-line dark:border-white/5 text-[11px] text-text-muted space-y-1 font-mono">
        <div className="font-semibold text-text-secondary flex items-center gap-1">
          <span className="material-symbols-outlined text-xs">info</span>
          <span>Methodological Notice</span>
        </div>
        <p className="leading-relaxed">
          State tallies represent aggregated government-recorded incident returns and unstarred parliamentary questions. Unreported rural events or differing district administrative boundaries across census periods may cause variance. Flood physical susceptibility is computed from Sentinel-1 SAR backscatter & HAND, presented as physical predisposition independent of administrative tallies.
        </p>
        {caveats.map((c, i) => (
          <p key={i} className="text-amber-500/80">• {c}</p>
        ))}
      </div>
    </div>
  );
};
