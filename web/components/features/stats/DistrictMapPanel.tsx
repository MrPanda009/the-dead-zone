import type { ReactNode } from 'react';

import type { DistrictHazardSummaryDTO } from '@/lib/api/stats';
import type { AsyncResource } from '@/lib/hooks/useAsyncResource';
import type { UseHazardLayerResult } from '@/lib/hooks/useHazardLayer';

import { DistrictHazardMap } from './district-map';
import type { StatsDistrict } from './types';

export interface DistrictMapPanelProps {
  district: StatsDistrict;
  summary: AsyncResource<DistrictHazardSummaryDTO>;
  layer: UseHazardLayerResult;
  /** Row above the map, e.g. a "COMPUTED" label. */
  headerSlot?: ReactNode;
  /** Row below the map. */
  captionSlot?: ReactNode;
  showLegend?: boolean;
  className?: string;
  classNames?: {
    root?: string;
    frame?: string;
  };
}

/**
 * Wires the district map to the shared layer and summary resources. Used by both the Brief
 * and the Model vs History tabs so they always show the same cells.
 */
export const DistrictMapPanel = ({
  district,
  summary,
  layer,
  headerSlot,
  captionSlot,
  showLegend = true,
  className = '',
  classNames = {},
}: DistrictMapPanelProps) => (
  <div
    className={[
      'flex flex-col min-h-0 overflow-hidden shrink-0 lg:shrink',
      classNames.root ?? '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {headerSlot}
    <div
      className={[
        'relative flex-1 min-h-0 rounded-2xl overflow-hidden border border-line dark:border-white/10 glass-card',
        classNames.frame ?? '',
      ].join(' ')}
    >
      <DistrictHazardMap
        district={district}
        cells={layer.cells}
        legend={layer.data?.legend ?? null}
        coverage={layer.data?.coverage ?? null}
        modelVersion={layer.data?.model_version ?? summary.data?.model_version ?? null}
        isLoading={layer.isLoading}
        error={layer.error}
        notComputed={summary.data?.model_status === 'not_computed'}
        onRetry={layer.refetch}
        showLegend={showLegend}
        className="w-full h-full"
      />
    </div>
    {captionSlot}
  </div>
);
