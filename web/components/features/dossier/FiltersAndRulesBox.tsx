'use client';

import React from 'react';

export interface FiltersAndRulesBoxProps {
  confidenceThreshold: number;
  onConfidenceThresholdChange?: (threshold: number) => void;
  showHardZero: boolean;
  onShowHardZeroChange?: (show: boolean) => void;
  showNoCoverage: boolean;
  onShowNoCoverageChange?: (show: boolean) => void;
  hatchedCount?: number;
  className?: string;
}

/**
 * Right panel "FILTERS & RULES" card:
 * Controls confidence hatch threshold, safe by terrain (hard-zero),
 * and unobserved no-data cells visibility.
 */
export const FiltersAndRulesBox: React.FC<FiltersAndRulesBoxProps> = ({
  confidenceThreshold,
  onConfidenceThresholdChange,
  showHardZero,
  onShowHardZeroChange,
  showNoCoverage,
  onShowNoCoverageChange,
  hatchedCount,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border border-line/80 dark:border-[#1e2d45] bg-surface-1/60 dark:bg-[#070d18]/60 p-3 text-xs font-mono ${className}`}
    >
      {/* 1. Header */}
      <div className="flex items-center gap-2 text-text-primary">
        <span className="material-symbols-outlined text-base text-sky-600 dark:text-sky-400">tune</span>
        <span className="font-bold tracking-wider uppercase text-[11px]">FILTERS & RULES</span>
      </div>

      {/* 2. Hatch Below Slider */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-text-secondary uppercase tracking-wider font-semibold">
            Hatch below
          </span>
          <span className="text-text-primary font-bold tabular-nums">
            {confidenceThreshold.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={confidenceThreshold}
          onChange={(e) => onConfidenceThresholdChange?.(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-surface-2 dark:bg-white/15 rounded-lg appearance-none cursor-pointer accent-sky-400"
          title={`Hatch below ${confidenceThreshold.toFixed(2)}`}
        />
        <p className="text-[10px] text-text-muted leading-tight">
          Normalised against the layer&apos;s confidence ceiling.
        </p>
      </div>

      {/* 3. Safe by Terrain Toggle */}
      <div className="flex items-center justify-between gap-2.5 pt-1">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-sm text-text-muted mt-0.5">
            warning
          </span>
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-text-primary leading-tight">
              Safe by terrain
            </span>
            <span className="text-[9px] text-text-muted leading-tight">
              HAND &gt; 30 m or slope &gt; 15° (FR-3.17)
            </span>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={showHardZero}
          onClick={() => onShowHardZeroChange?.(!showHardZero)}
          className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            showHardZero ? 'bg-sky-500' : 'bg-surface-2 dark:bg-white/20'
          }`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
              showHardZero ? 'translate-x-3.5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* 4. No-data cells Toggle */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-sm text-text-muted mt-0.5">
            database
          </span>
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-text-primary leading-tight">
              No-data cells
            </span>
            <span className="text-[9px] text-text-muted leading-tight">
              Outlined, never filled
            </span>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={showNoCoverage}
          onClick={() => onShowNoCoverageChange?.(!showNoCoverage)}
          className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            showNoCoverage ? 'bg-sky-500' : 'bg-surface-2 dark:bg-white/20'
          }`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
              showNoCoverage ? 'translate-x-3.5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* 5. Summary Count */}
      {hatchedCount !== undefined && (
        <div className="pt-1 border-t border-line/60 dark:border-white/10 text-[10px] text-text-muted">
          <span>{hatchedCount.toLocaleString()} cells hatched.</span>
        </div>
      )}
    </div>
  );
};
