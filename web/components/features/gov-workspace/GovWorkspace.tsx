'use client';

import React, { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  ThreePanelLayout,
  LeftPanel,
  CenterPanel,
  RightPanel,
} from '@/components/layout';
import { ScreeningGradeNotice } from '@/components/common/ScreeningGradeNotice';
import { TopRiskList } from '@/components/features/triage';
import { CellDossier } from '@/components/features/dossier';
import { HazardLayerSelect } from '@/components/features/map/controls';
import { MapSkeleton } from '@/components/features/map/MapSkeleton';
import { LayerStatsPanel } from '@/components/features/workspace/LayerStatsPanel';
import { India3DCanvas } from '@/components/features/map-3d';
import { useHazardLayer } from '@/lib/hooks/useHazardLayer';
import { useHazardLayerList } from '@/lib/hooks/useHazardLayerList';
import type { HazardType } from '@/lib/api/types';
import type { FloodHazardMapDisplayState } from '@/components/features/map/FloodHazardMap';
import {
  BARPETA_LGD_CODE,
  DEFAULT_CONFIDENCE_HATCH_THRESHOLD,
  SOURCE_RESOLUTION,
} from '@/lib/map/constants';
import { GovWorkspaceHeader } from './GovWorkspaceHeader';

// MapLibre is dynamically loaded for the High-Res GIS view
const FloodHazardMap = dynamic(
  () => import('@/components/features/map/FloodHazardMap').then((m) => m.FloodHazardMap),
  { ssr: false, loading: () => <MapSkeleton label="Loading High-Res GIS Map…" /> },
);

export interface GovWorkspaceProps {
  initialHazardType?: HazardType;
  admin?: number;
  initialViewMode?: '3d' | 'gis';
  officerId?: string;
  className?: string;
}

const DEFAULT_DISPLAY: FloodHazardMapDisplayState = {
  opacity: 0.85,
  showConfidenceHatch: true,
  confidenceThreshold: DEFAULT_CONFIDENCE_HATCH_THRESHOLD,
  showHardZero: true,
  showNoCoverage: true,
  resolution: SOURCE_RESOLUTION,
};

export const GovWorkspace: React.FC<GovWorkspaceProps> = ({
  initialHazardType = 'riverine_flood',
  admin = BARPETA_LGD_CODE,
  initialViewMode = '3d',
  officerId = 'NDRF-OFFICER-894',
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'3d' | 'gis'>(initialViewMode);
  const [hazardType, setHazardType] = useState<HazardType>(initialHazardType);
  const [selectedH3, setSelectedH3] = useState<string | null>(null);
  const [hoveredH3, setHoveredH3] = useState<string | null>(null);
  const [display, setDisplay] = useState<FloodHazardMapDisplayState>(DEFAULT_DISPLAY);

  const { layers: availableLayers, isLoading: layersLoading } = useHazardLayerList();

  const { data, cells, isLoading, error, refetch } = useHazardLayer({
    hazardType,
    admin,
    resolution: display.resolution,
    aggregation: 'max',
  });

  const handleDisplayChange = useCallback((next: Partial<FloodHazardMapDisplayState>) => {
    setDisplay((current) => ({ ...current, ...next }));
  }, []);

  const handleSelectLayer = useCallback((next: HazardType) => {
    setHazardType(next);
    setSelectedH3(null);
    setHoveredH3(null);
  }, []);

  const przThreshold = data?.legend.prz_susceptibility_threshold ?? 0.85;
  const breaks = useMemo(() => data?.legend.breaks ?? [], [data]);

  return (
    <ThreePanelLayout
      className={className}
      header={
        <GovWorkspaceHeader
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          hazardType={hazardType}
          modelVersion={data?.model_version}
          isLoading={isLoading}
          cellCount={cells.length}
          officerId={officerId}
        />
      }
      left={
        <LeftPanel>
          <div className="flex flex-col gap-4">
            <HazardLayerSelect
              layers={availableLayers}
              value={hazardType}
              isLoading={layersLoading}
              onValueChange={handleSelectLayer}
            />
            <LayerStatsPanel layer={data} isLoading={isLoading} />
            <TopRiskList
              cells={cells}
              breaks={breaks}
              przThreshold={przThreshold}
              selectedH3={selectedH3}
              onSelect={setSelectedH3}
              onHover={setHoveredH3}
            />
          </div>
        </LeftPanel>
      }
      center={
        <CenterPanel>
          {viewMode === '3d' ? (
            <India3DCanvas
              cells={cells}
              breaks={breaks}
              przThreshold={przThreshold}
              selectedH3={selectedH3}
              hoveredH3={hoveredH3}
              onSelectCell={setSelectedH3}
              onHoverCell={setHoveredH3}
              isLoading={isLoading}
              errorMessage={error?.message ?? null}
              className="w-full h-full"
            />
          ) : (
            <FloodHazardMap
              cells={cells}
              legend={data?.legend ?? null}
              coverage={data?.coverage ?? null}
              hazardType={hazardType}
              isLoading={isLoading}
              errorMessage={error?.message ?? null}
              errorCode={error?.code ?? null}
              requestId={error?.requestId ?? null}
              onRetry={refetch}
              selectedH3={selectedH3}
              hoveredH3={hoveredH3}
              onSelectCell={setSelectedH3}
              onHoverCell={setHoveredH3}
              display={display}
              onDisplayChange={handleDisplayChange}
            />
          )}
        </CenterPanel>
      }
      right={
        <RightPanel>
          <CellDossier
            h3={selectedH3}
            hazardType={hazardType}
            przThreshold={przThreshold}
          />
        </RightPanel>
      }
      footer={<ScreeningGradeNotice notice={data?.screening_grade} />}
    />
  );
};

export default GovWorkspace;
