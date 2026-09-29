'use client';

import React from 'react';
import { SUPPORTED_RESOLUTIONS } from '@/lib/map/constants';

export interface MapTopControlBarProps {
  resolution: number;
  onResolutionChange?: (resolution: number) => void;
  opacity: number;
  onOpacityChange?: (opacity: number) => void;
  showConfidenceHatch: boolean;
  onConfidenceHatchChange?: (show: boolean) => void;
  className?: string;
}

/**
 * Floating horizontal capsule bar docked at the top-center of the map viewport.
 * Controls H3 Resolution (R6, R7, R8), Layer Opacity slider, and Confidence Hatch toggle.
 */
export const MapTopControlBar: React.FC<MapTopControlBarProps> = ({
  resolution,
  onResolutionChange,
  opacity,
  onOpacityChange,
  showConfidenceHatch,
  onConfidenceHatchChange,
  className = '',
}) => {
  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 sm:gap-4 px-3.5 sm:px-4 py-2 rounded-2xl border border-line dark:border-[#1e2d45] bg-surface-0/95 dark:bg-[#0c1524]/92 backdrop-blur-xl shadow-2xl text-xs font-mono text-ink dark:text-text-primary z-20 select-none ${className}`}
    >
      {/* 1. H3 Resolution Segmented Pills */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-sky-400">
          <span className="material-symbols-outlined text-base">hexagon</span>
          <span className="text-[10px] font-bold tracking-wider text-text-secondary uppercase hidden md:inline">
            H3 Resolution
          </span>
        </div>
        <div className="flex items-center p-0.5 rounded-xl bg-surface-1 dark:bg-[#070d18] border border-line dark:border-white/10 shadow-inner">
          {SUPPORTED_RESOLUTIONS.map((res) => {
            const isActive = resolution === res;
            return (
              <button
                key={res}
                type="button"
                onClick={() => onResolutionChange?.(res)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/20'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-2 dark:hover:bg-white/5'
                }`}
                title={`H3 Resolution R${res}`}
              >
                R{res}
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-line dark:bg-white/10" />

      {/* 2. Layer Opacity Slider */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-sky-400">
          <span className="material-symbols-outlined text-base">layers</span>
          <span className="text-[10px] font-bold tracking-wider text-text-secondary uppercase hidden lg:inline">
            Layer Opacity
          </span>
        </div>
        <input
          type="range"
          min={0.15}
          max={1}
          step={0.05}
          value={opacity}
          onChange={(e) => onOpacityChange?.(parseFloat(e.target.value))}
          className="w-16 sm:w-20 md:w-24 h-1.5 bg-surface-2 dark:bg-white/15 rounded-lg appearance-none cursor-pointer accent-sky-400"
          title={`Opacity: ${Math.round(opacity * 100)}%`}
        />
        <span className="text-[11px] font-mono text-text-secondary w-8 text-right tabular-nums">
          {Math.round(opacity * 100)}%
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-line dark:bg-white/10" />

      {/* 3. Confidence Hatch Switch */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          role="switch"
          aria-checked={showConfidenceHatch}
          onClick={() => onConfidenceHatchChange?.(!showConfidenceHatch)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            showConfidenceHatch ? 'bg-sky-500' : 'bg-surface-2 dark:bg-white/20'
          }`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
              showConfidenceHatch ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
        <div className="flex flex-col text-left">
          <span className="text-[11px] font-semibold text-text-primary leading-tight">
            Confidence hatch
          </span>
          <span className="text-[9px] font-mono text-text-muted leading-tight hidden sm:inline">
            Marks provisional cells (FR-9.3)
          </span>
        </div>
      </div>
    </div>
  );
};
