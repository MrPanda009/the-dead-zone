'use client';

import { useMemo, useRef, useState } from 'react';

import type { ApiError } from '@/lib/api/client';
import type { HazardCell, HazardLayerCoverage, HazardLayerLegend } from '@/lib/api/types';
import { cellsToFeatureCollection, type DistrictCellProperties } from '@/lib/map/districtGeoJson';

import type { StatsDistrict } from '../types';
import { DistrictMapBadge } from './DistrictMapBadge';
import { DistrictMapLegend } from './DistrictMapLegend';
import { DistrictMapStatusOverlay, type DistrictMapStatus } from './DistrictMapStatusOverlay';
import { DistrictMapTooltip } from './DistrictMapTooltip';
import { DistrictMapZoomControls } from './DistrictMapZoomControls';
import { useDistrictMap } from './useDistrictMap';

export interface DistrictHazardMapProps {
  district: StatsDistrict;
  /** Cells from `GET /hazard/cells?admin=…`. Empty while loading or when not computed. */
  cells: HazardCell[];
  legend: HazardLayerLegend | null;
  coverage?: HazardLayerCoverage | null;
  /** From `DistrictHazardSummaryDTO.model_version`. */
  modelVersion?: string | null;
  isLoading?: boolean;
  error?: ApiError | null;
  /** True when the summary reports `model_status: 'not_computed'`. */
  notComputed?: boolean;
  onRetry?: () => void;
  interactive?: boolean;
  showLegend?: boolean;
  onSelectCell?: (h3: string | null) => void;
  className?: string;
  classNames?: {
    root?: string;
    canvas?: string;
  };
}

function resolveStatus(
  isLoading: boolean,
  error: ApiError | null,
  notComputed: boolean,
  cellCount: number,
): DistrictMapStatus {
  // The summary is authoritative about whether a layer exists, so it wins over a cell-request
  // error: an unmodelled district may well 404 on `/hazard/cells`.
  if (notComputed) return 'not_computed';
  if (isLoading) return 'loading';
  if (error) return 'error';
  if (cellCount === 0) return 'empty';
  return 'ready';
}

/**
 * Flood susceptibility map for one district, drawn from the live hazard cell layer.
 *
 * It owns no data: cells, legend and coverage arrive as props, so the parent decides how they
 * are fetched. When there is nothing real to draw it shows why, rather than a placeholder.
 */
export const DistrictHazardMap = ({
  district,
  cells,
  legend,
  coverage = null,
  modelVersion = null,
  isLoading = false,
  error = null,
  notComputed = false,
  onRetry,
  interactive = true,
  showLegend = true,
  onSelectCell,
  className = '',
  classNames = {},
}: DistrictHazardMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<DistrictCellProperties | null>(null);

  const data = useMemo(() => cellsToFeatureCollection(cells, legend), [cells, legend]);
  const { zoomIn, zoomOut } = useDistrictMap({
    containerRef,
    district,
    data,
    interactive,
    onHoverCell: setHovered,
    onSelectCell,
  });

  const status = resolveStatus(isLoading, error, notComputed, cells.length);

  return (
    <div className={['relative w-full h-full rounded-2xl overflow-hidden', classNames.root ?? '', className].join(' ')}>
      <div ref={containerRef} className={['absolute inset-0 w-full h-full', classNames.canvas ?? ''].join(' ')} />

      <DistrictMapBadge districtName={district.name} modelVersion={status === 'ready' ? modelVersion : null} />
      {interactive && <DistrictMapZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} />}
      <DistrictMapTooltip cell={hovered} />
      {showLegend && status === 'ready' && legend ? (
        <DistrictMapLegend legend={legend} coverage={coverage} />
      ) : null}
      <DistrictMapStatusOverlay
        status={status}
        districtName={district.name}
        error={error}
        onRetry={onRetry}
      />
    </div>
  );
};
