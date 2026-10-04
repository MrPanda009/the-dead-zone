'use client';

import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { Button } from '@/components/ui/Button';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import type { HazardLayerCoverage, HazardLayerLegend, HazardRegime } from '@/lib/api/types';
import type { RegimeVisibility } from '@/lib/map/constants';

import { ConfidenceHatchKey } from './ConfidenceHatchKey';
import { CoverageLegend } from './CoverageLegend';
import { QuantileLegend } from './QuantileLegend';
import { RegimeLegend } from './RegimeLegend';

export interface MapLegendPanelProps {
  legend: HazardLayerLegend;
  coverage: HazardLayerCoverage;
  /** Cells currently drawn with the confidence hatch. */
  hatchedCount?: number;
  confidenceThreshold: number;
  visibleRegimes?: RegimeVisibility;
  onVisibleRegimesChange?: (regime: HazardRegime, show: boolean) => void;
  title?: string;
  defaultCollapsed?: boolean;
  className?: string;
  classNames?: {
    root?: string;
    body?: string;
  };
  animation?: {
    disabled?: boolean;
    duration?: number;
  };
}

/** Legend stack docked over the map: ramp classes, zero-score classes, confidence key. */
export const MapLegendPanel = ({
  legend,
  coverage,
  hatchedCount,
  confidenceThreshold,
  visibleRegimes,
  onVisibleRegimesChange,
  title = 'Legend',
  defaultCollapsed = false,
  className = '',
  classNames = {},
  animation = {},
}: MapLegendPanelProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const prefersReducedMotion = usePrefersReducedMotion();

  const { disabled: animationDisabled = false, duration = 0.35 } = animation;
  const animate = !animationDisabled && !prefersReducedMotion;

  useGSAP(
    () => {
      const node = bodyRef.current;
      if (!node) return;
      if (!animate) {
        gsap.set(node, { height: collapsed ? 0 : 'auto', opacity: collapsed ? 0 : 1 });
        return;
      }
      gsap.to(node, {
        height: collapsed ? 0 : 'auto',
        opacity: collapsed ? 0 : 1,
        duration,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    },
    { scope: rootRef, dependencies: [collapsed, animate, duration] },
  );

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 z-20 flex flex-col gap-2">
      <div
        ref={rootRef}
        className={[
          'rounded-2xl border border-line dark:border-[#1e2d45] bg-surface-0/95 dark:bg-[#0c1524]/92 text-ink dark:text-text-primary shadow-2xl backdrop-blur-xl transition-all duration-300',
          collapsed ? 'w-auto p-1.5' : 'w-64 p-3.5',
          classNames.root ?? '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
          className="flex items-center gap-2 px-2.5 py-1 text-xs font-mono font-bold tracking-wider text-ink dark:text-text-primary hover:text-accent dark:hover:text-white cursor-pointer w-full justify-between select-none"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-sky-400">layers</span>
            <span className="uppercase text-[11px]">{title}</span>
          </div>
          <span className="material-symbols-outlined text-sm text-text-muted transition-transform">
            {collapsed ? 'expand_less' : 'expand_more'}
          </span>
        </button>

        <div ref={bodyRef} className={['overflow-hidden', classNames.body ?? ''].join(' ')}>
          <div className="flex flex-col gap-3 pt-3 border-t border-line dark:border-white/10 mt-2">
            <QuantileLegend
              breaks={legend.breaks}
              domain={legend.domain as number[]}
              quantiles={legend.quantiles}
              description="Classed on quantiles — the scores cluster too tightly for an even ramp."
            />
            <RegimeLegend
              visibleRegimes={visibleRegimes}
              onVisibleRegimesChange={onVisibleRegimesChange}
            />
            <CoverageLegend coverage={coverage} />
            <ConfidenceHatchKey
              confidenceCeiling={legend.confidence_ceiling}
              threshold={confidenceThreshold}
              hatchedCount={hatchedCount}
            />
          </div>
        </div>
      </div>

      {/* Floating Info (i) button below Legend */}
      <button
        type="button"
        title="Map Layer Information & Standards"
        aria-label="Map Layer Information"
        onClick={() => setCollapsed(false)}
        className="w-8 h-8 rounded-full border border-line dark:border-[#1e2d45] bg-surface-0/95 dark:bg-[#0c1524]/92 text-text-muted hover:text-ink dark:hover:text-white flex items-center justify-center shadow-2xl backdrop-blur-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
      >
        <span className="material-symbols-outlined text-base">info</span>
      </button>
    </div>
  );
};
