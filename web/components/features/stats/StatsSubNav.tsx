'use client';

import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { StatsSubNavProps, StatsTabId } from './types';

interface TabConfig {
  id: StatsTabId;
  number: string;
  label: string;
  icon: string;
  description: string;
}

const TABS: TabConfig[] = [
  {
    id: 'history',
    number: '01',
    label: 'Disaster History & Stats',
    icon: 'query_stats',
    description: 'Casualty graphs, exposure, and loss points',
  },
  {
    id: 'brief',
    number: '02',
    label: 'Flood Exposure / District Brief',
    icon: 'map',
    description: '2D navigable MapLibre & district dossier',
  },
  {
    id: 'comparison',
    number: '03',
    label: 'Model vs History',
    icon: 'compare',
    description: 'Computed susceptibility vs recorded damages',
  },
  {
    id: 'sources',
    number: '04',
    label: 'Sources & Data Provenance',
    icon: 'verified',
    description: 'Transparent dataset matrix & limitations',
  },
];

export const StatsSubNav: React.FC<StatsSubNavProps> = ({
  activeTab,
  onSelectTab,
  className = '',
  classNames = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      gsap.fromTo(
        '.subnav-pill',
        { opacity: 0, y: -6 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          stagger: 0.04,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
        }
      );
    },
    { scope: containerRef }
  );

  return (
    <nav
      ref={containerRef}
      aria-label="Disaster Analytics Sections"
      className={`w-full flex justify-center py-2 ${classNames.root ?? ''} ${className}`}
    >
      <div className="flex items-center justify-center gap-2 p-1.5 rounded-2xl glass-card border border-line dark:border-white/10 mx-auto max-w-full overflow-x-auto no-scrollbar">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`subnav-pill group relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer select-none whitespace-nowrap ${
                isActive
                  ? 'bg-citron text-black font-bold shadow-md shadow-citron/20 scale-[1.01]'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2 dark:hover:bg-white/5'
              }`}
              title={tab.description}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>

              <span>{tab.label}</span>

              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-black ml-0.5 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
