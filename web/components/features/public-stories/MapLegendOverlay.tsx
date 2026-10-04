'use client';

import React from 'react';

export interface MapLegendOverlayProps {
  /** Optional custom root className */
  className?: string;
}

export const MapLegendOverlay: React.FC<MapLegendOverlayProps> = ({
  className = '',
}) => {
  return (
    <div
      className={`inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 xl:gap-4 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-surface-0/90 dark:bg-[#071912]/90 border border-line dark:border-white/10 shadow-sm backdrop-blur-md text-[9px] sm:text-[10px] xl:text-[11px] font-mono text-ink-muted dark:text-cream/80 select-none ${className}`}
    >
      {/* 1. Safe Haven */}
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
        <span>Safe Haven (verified)</span>
      </div>

      {/* 2. Monitored Advisory */}
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
        <span>Monitored Advisory</span>
      </div>

      {/* 3. High Hazard */}
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
        <span>High Hazard</span>
      </div>

      {/* 4. District Boundary */}
      <div className="flex items-center gap-1.5">
        <span className="w-3.5 h-[1.5px] bg-cyan-400 rounded-full inline-block" />
        <span>District Boundary</span>
      </div>
    </div>
  );
};

export default MapLegendOverlay;
