'use client';

import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { StateSelector } from './StateSelector';
import type { StatsHeaderProps } from './types';

export const StatsHeader: React.FC<StatsHeaderProps> = ({
  title = 'Disaster History & Recorded Impact',
  subtitle = 'Decadal hydro-meteorological loss analysis, casualty distributions, and empirical flood model alignment.',
  selectedState,
  onSelectState,
  availableStates,
  fromYear,
  toYear,
  isLoading = false,
  className = '',
  classNames = {},
}) => {
  const headerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!headerRef.current) return;
      gsap.from('.header-elem', {
        y: -8,
        opacity: 0,
        duration: 0.4,
        stagger: 0.05,
        ease: 'power2.out',
      });
    },
    { scope: headerRef },
  );

  return (
    <header
      ref={headerRef}
      className={`glass-card p-5 sm:p-6 rounded-3xl border border-line dark:border-white/10 space-y-4 ${classNames.root ?? ''} ${className}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="header-elem px-2.5 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider font-semibold bg-citron/15 text-citron border border-citron/30">
              Historical Registry
            </span>
            <span className="header-elem px-2.5 py-0.5 rounded-md text-[10px] font-mono text-text-muted border border-line dark:border-white/10 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Coverage: {fromYear}–{toYear}</span>
            </span>
            {isLoading && (
              <span className="header-elem text-[11px] font-mono text-citron flex items-center gap-1">
                <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                <span>Updating records...</span>
              </span>
            )}
          </div>
          <h1 className="header-elem font-display text-2xl sm:text-3xl font-extrabold text-ink dark:text-white tracking-tight">
            {title}
          </h1>
          <p className="header-elem text-xs sm:text-sm text-text-secondary max-w-3xl leading-relaxed">
            {subtitle}
          </p>
        </div>

        <div className="header-elem shrink-0 flex items-center gap-2">
          <div className="px-3 py-2 rounded-2xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 text-right">
            <div className="text-[10px] font-mono uppercase text-text-muted">Primary Sources</div>
            <div className="text-xs font-semibold text-ink dark:text-white">NCRB • MHA • CWC</div>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-line dark:border-white/10">
        <StateSelector
          selectedState={selectedState}
          onSelectState={onSelectState}
          availableStates={availableStates}
          disabled={isLoading}
        />
      </div>
    </header>
  );
};
