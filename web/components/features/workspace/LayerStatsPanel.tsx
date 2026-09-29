'use client';

import { MetricCard } from '@/components/common/MetricCard';
import { MetricCardSkeleton } from '@/components/common/MetricCardSkeleton';
import { SectionHeader } from '@/components/common/SectionHeader';
import type { HazardLayerResponse } from '@/lib/api/types';

export interface LayerStatsPanelProps {
  layer: HazardLayerResponse | null;
  isLoading?: boolean;
  title?: string;
  className?: string;
  classNames?: {
    root?: string;
    grid?: string;
  };
}

/** Headline counts for the active layer, sourced from the response envelope. */
export const LayerStatsPanel = ({
  layer,
  isLoading = false,
  title = 'Layer',
  className = '',
  classNames = {},
}: LayerStatsPanelProps) => {
  if (isLoading || !layer) {
    return (
      <div className={['flex flex-col gap-2', className].filter(Boolean).join(' ')}>
        <SectionHeader title={title} />
        <div className="grid grid-cols-2 gap-2">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      </div>
    );
  }

  const przCount = layer.cells.filter(
    (cell) => cell.susceptibility >= layer.legend.prz_susceptibility_threshold,
  ).length;

  return (
    <div className={['flex flex-col gap-2', classNames.root ?? '', className].filter(Boolean).join(' ')}>
      <div className="flex flex-col">
        <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-text-secondary">
          {title}
        </span>
        <span className="text-[10px] font-mono text-text-muted">
          H3 Resolution R{layer.res}
        </span>
      </div>
      <div className={['grid grid-cols-2 gap-2', classNames.grid ?? ''].join(' ')}>
        <MetricCard
          label="Cells"
          icon={<span className="material-symbols-outlined text-xs text-text-muted">grid_view</span>}
          value={layer.count}
          numericValue={layer.count}
          formatNumeric={(v) => Math.round(v).toLocaleString()}
        />
        <MetricCard
          label="PRZ candidates"
          icon={<span className="material-symbols-outlined text-xs text-red-400">crisis_alert</span>}
          value={przCount}
          numericValue={przCount}
          formatNumeric={(v) => Math.round(v).toLocaleString()}
          variant={przCount > 0 ? 'critical' : 'default'}
          description={`≥ ${layer.legend.prz_susceptibility_threshold.toFixed(2)} (FR-3.9)`}
        />
        <MetricCard
          label="Median score"
          icon={<span className="material-symbols-outlined text-xs text-text-muted">bar_chart</span>}
          value={layer.legend.breaks[1] ?? 0}
          numericValue={layer.legend.breaks[1] ?? 0}
          formatNumeric={(v) => v.toFixed(3)}
          description="P50 of the layer"
        />
        <MetricCard
          label="No data"
          icon={<span className="material-symbols-outlined text-xs text-text-muted">database</span>}
          value={layer.coverage.no_coverage}
          numericValue={layer.coverage.no_coverage}
          formatNumeric={(v) => Math.round(v).toLocaleString()}
          variant={layer.coverage.no_coverage > 0 ? 'warning' : 'default'}
          description="Zero-score by fill, not measurement"
        />
      </div>
    </div>
  );
};
