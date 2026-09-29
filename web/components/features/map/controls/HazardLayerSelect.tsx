'use client';

import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/common/SectionHeader';
import type { HazardLayerSummary, HazardType } from '@/lib/api/types';
import { HAZARD_LABELS } from '@/lib/map/constants';
import { formatCount } from '@/lib/map/format';

export interface HazardLayerSelectProps {
  layers: HazardLayerSummary[];
  value: HazardType;
  title?: string;
  isLoading?: boolean;
  onValueChange?: (hazardType: HazardType) => void;
  className?: string;
  classNames?: {
    root?: string;
    list?: string;
    option?: string;
  };
}

/** Picks which published `hazard_static` layer the map renders. */
export const HazardLayerSelect = ({
  layers,
  value,
  title = 'Hazard layer',
  isLoading = false,
  onValueChange,
  className = '',
  classNames = {},
}: HazardLayerSelectProps) => {
  // One row per hazard type; the map always requests the published source resolution.
  const uniqueLayers = layers.filter(
    (layer, index, all) => all.findIndex((l) => l.hazard_type === layer.hazard_type) === index,
  );

  return (
    <div className={['flex flex-col gap-2', classNames.root ?? '', className].filter(Boolean).join(' ')}>
      <div className="flex items-center justify-between text-text-primary">
        <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-text-secondary">
          {title}
        </span>
      </div>
      <div className={['flex flex-col gap-1.5', classNames.list ?? ''].join(' ')}>
        {isLoading && uniqueLayers.length === 0 ? (
          <div className="h-8 animate-pulse rounded-xl bg-surface-2" />
        ) : null}
        {uniqueLayers.map((layer) => {
          const isActive = layer.hazard_type === value;
          return (
            <button
              key={layer.hazard_type}
              type="button"
              onClick={() => onValueChange?.(layer.hazard_type)}
              className={[
                'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer',
                isActive
                  ? 'border border-sky-500 dark:border-sky-400 bg-sky-500/20 dark:bg-sky-500/15 ring-1 ring-sky-500/40 text-sky-950 dark:text-white font-bold shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                  : 'border border-transparent text-text-secondary dark:text-text-muted hover:text-ink dark:hover:text-text-primary hover:bg-surface-2 dark:hover:bg-white/5',
                classNames.option ?? '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="capitalize">
                {HAZARD_LABELS[layer.hazard_type] ?? layer.hazard_type}
              </span>
              <span className={`text-[11px] font-mono tabular-nums ${isActive ? 'text-sky-300' : 'text-text-muted'}`}>
                {formatCount(layer.cell_count)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
