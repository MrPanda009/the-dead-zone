'use client';

import { isScoredCell } from '@/lib/map/colorScale';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  ThreePanelLayout,
  LeftPanel,
  CenterPanel,
  RightPanel,
} from '@/components/layout';
import { cellToParent, cellToLatLng, latLngToCell, getResolution } from 'h3-js';
import { TopRiskList } from '@/components/features/triage';
import { CellDossier } from '@/components/features/dossier';
import { HazardLayerSelect, MapTopControlBar } from '@/components/features/map/controls';
import { MapSkeleton } from '@/components/features/map/MapSkeleton';
import { LayerStatsPanel } from '@/components/features/workspace/LayerStatsPanel';
import { India3DCanvas } from '@/components/features/map-3d';
import { useHazardLayer } from '@/lib/hooks/useHazardLayer';
import { useHazardLayerList } from '@/lib/hooks/useHazardLayerList';
import { useForecastAlerts } from '@/lib/hooks/useForecastAlerts';
import { useDistrictHazardType } from '@/lib/hooks/useDistrictHazardType';
import type { HazardType } from '@/lib/api/types';
import type { FloodHazardMapDisplayState } from '@/components/features/map/FloodHazardMap';
import {
  DEFAULT_CONFIDENCE_HATCH_THRESHOLD,
  DEFAULT_REGIME_VISIBILITY,
  SOURCE_RESOLUTION,
} from '@/lib/map/constants';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { GovWorkspaceHeader } from './GovWorkspaceHeader';

// MapLibre is dynamically loaded for the 2D View
const FloodHazardMap = dynamic(
  () => import('@/components/features/map/FloodHazardMap').then((m) => m.FloodHazardMap),
  { ssr: false, loading: () => <MapSkeleton label="Loading 2D Map…" /> },
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
  visibleRegimes: DEFAULT_REGIME_VISIBILITY,
  resolution: SOURCE_RESOLUTION,
};

export const GovWorkspace: React.FC<GovWorkspaceProps> = ({
  initialHazardType,
  admin,
  initialViewMode = '3d',
  officerId = 'NDRF-OFFICER-894',
  className = '',
}) => {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const [viewMode, setViewMode] = useState<'3d' | 'gis'>(initialViewMode);
  const [selectedH3, setSelectedH3] = useState<string | null>(null);
  const [hoveredH3, setHoveredH3] = useState<string | null>(null);
  const [display, setDisplay] = useState<FloodHazardMapDisplayState>(DEFAULT_DISPLAY);

  const { layers: availableLayers, isLoading: layersLoading } = useHazardLayerList();

  // District officials are scoped to their assigned jurisdiction. A national
  // operations account (no jurisdiction) leaves `admin` undefined, so the hazard
  // layer returns every district and the map frames the whole loaded grid.
  const effectiveAdmin =
    user?.jurisdiction?.lgd_code ?? user?.jurisdiction?.admin_id ?? admin;

  // The layer follows the jurisdiction (Wayanad opens on landslide) until the officer picks one.
  const { hazardType, selectHazardType } = useDistrictHazardType({
    admin: effectiveAdmin,
    initialHazardType,
  });

  const { data, cells, isLoading, error, refetch } = useHazardLayer({
    hazardType,
    admin: effectiveAdmin,
    resolution: display.resolution,
    aggregation: 'max',
  });

  const forecast = useForecastAlerts({
    admin: effectiveAdmin ?? 178,
  });

  const handleInspectWayanad = useCallback(() => {
    selectHazardType('landslide');
    setSelectedH3('8860064a15fffff');
  }, [selectHazardType]);

  const handleResolutionChange = useCallback((newRes: number) => {
    setDisplay((current) => ({ ...current, resolution: newRes }));
    if (selectedH3) {
      try {
        const curRes = getResolution(selectedH3);
        if (curRes !== newRes) {
          let nextH3: string;
          if (newRes < curRes) {
            nextH3 = cellToParent(selectedH3, newRes);
          } else {
            const [lat, lng] = cellToLatLng(selectedH3);
            nextH3 = latLngToCell(lat, lng, newRes);
          }
          setSelectedH3(nextH3);
        }
      } catch (err) {
        console.warn('Failed to translate selected cell to new resolution:', err);
      }
    }
  }, [selectedH3]);

  const handleDisplayChange = useCallback((next: Partial<FloodHazardMapDisplayState>) => {
    if (next.resolution !== undefined && next.resolution !== display.resolution) {
      handleResolutionChange(next.resolution);
      return;
    }
    setDisplay((current) => ({ ...current, ...next }));
  }, [display.resolution, handleResolutionChange]);

  // Retain and align selected node when resolution changes and new cells load
  useEffect(() => {
    if (!selectedH3 || cells.length === 0) return;
    try {
      const curRes = getResolution(selectedH3);
      if (curRes !== display.resolution) {
        let targetH3: string;
        if (display.resolution < curRes) {
          targetH3 = cellToParent(selectedH3, display.resolution);
        } else {
          const [lat, lng] = cellToLatLng(selectedH3);
          targetH3 = latLngToCell(lat, lng, display.resolution);
        }
        if (cells.some((c) => c.h3 === targetH3)) {
          setSelectedH3(targetH3);
        } else {
          const match = cells.find((c) => {
            try {
              return (
                cellToParent(c.h3, Math.min(curRes, display.resolution)) ===
                cellToParent(selectedH3, Math.min(curRes, display.resolution))
              );
            } catch {
              return false;
            }
          });
          if (match) setSelectedH3(match.h3);
        }
      }
    } catch {
      // ignore
    }
  }, [cells, display.resolution, selectedH3]);

  const handleSelectLayer = useCallback((next: HazardType) => {
    selectHazardType(next);
    setSelectedH3(null);
    setHoveredH3(null);
  }, [selectHazardType]);

  const przThreshold = data?.legend.prz_susceptibility_threshold ?? 0.85;
  const breaks = useMemo(() => data?.legend.breaks ?? [], [data]);
  const selectedCell = useMemo(() => cells.find((c) => c.h3 === selectedH3) ?? null, [cells, selectedH3]);

  const hatchedCount = useMemo(() => {
    if (!display.showConfidenceHatch || !data?.legend) return 0;
    const ceiling = data.legend.confidence_ceiling ?? 1;
    return cells.filter(
      (cell) =>
        isScoredCell(cell) &&
        cell.confidence / ceiling < display.confidenceThreshold,
    ).length;
  }, [cells, data?.legend, display.confidenceThreshold, display.showConfidenceHatch]);

  // 1. Initial auth loading skeleton
  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg-base text-text-primary">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 border-2 border-citron border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-text-muted">Resolving operational clearance…</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated state
  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-bg-base text-text-primary p-6">
        <div className="glass-card max-w-md w-full p-8 rounded-3xl border border-line text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-2xl">lock</span>
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-text-primary">
              Authentication Required
            </h2>
            <p className="text-xs text-text-secondary mt-1.5 leading-relaxed font-sans">
              The Government Decision Platform is restricted to authorized Disaster Management personnel. Please log in to establish an active session.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href="/login"
              className="w-full py-2.5 px-4 rounded-xl bg-citron text-[#06100c] font-display font-bold text-xs shadow hover:bg-citron/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">login</span>
              <span>Sign In to Government Portal</span>
            </Link>
            <Link
              href="/"
              className="w-full py-2.5 px-4 rounded-xl bg-surface-1 hover:bg-surface-2 border border-line text-text-secondary hover:text-text-primary text-xs font-mono transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Return to Overview</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Civilian unauthorized state
  if (user.role === 'CIVILIAN') {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-bg-base text-text-primary p-6">
        <div className="glass-card max-w-md w-full p-8 rounded-3xl border border-line text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-2xl">shield_lock</span>
          </div>
          <div>
            <span className="pill-badge px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium text-red-500 border border-red-500/30 bg-red-500/10 inline-block mb-2">
              CIVILIAN ACCOUNT • CLEARANCE DENIED
            </span>
            <h2 className="font-display text-xl font-bold text-text-primary">
              Official Clearance Required
            </h2>
            <p className="text-xs text-text-secondary mt-1.5 leading-relaxed font-sans">
              Logged in as <span className="font-mono text-text-primary">{user.email}</span>. Civilian accounts do not possess operational clearance for the 2D view response matrix.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href="/stories"
              className="w-full py-2.5 px-4 rounded-xl bg-citron text-[#06100c] font-display font-bold text-xs shadow hover:bg-citron/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">auto_stories</span>
              <span>Switch to Citizen Stories Portal</span>
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="w-full py-2.5 px-4 rounded-xl bg-surface-1 hover:bg-surface-2 border border-line text-text-muted hover:text-red-500 text-xs font-mono transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authorized Government Official / System Admin workspace


  return (
    <ThreePanelLayout
      className={className}
      header={
        <GovWorkspaceHeader
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          hazardType={hazardType}
          isLoading={isLoading}
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
              resolution={display.resolution}
              onResolutionChange={handleResolutionChange}
              isLoading={isLoading}
              errorMessage={error?.message ?? null}
              forecastItems={forecast.items}
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
              forecastItems={forecast.items}
              showForecastOverlay={true}
              onForecastCellHover={(item) => setHoveredH3(item?.h3 ?? null)}
              onForecastCellClick={(item) => setSelectedH3(item?.h3 ?? null)}
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
            forecastItems={forecast.items}
            fallbackCell={selectedCell}
            display={display}
            onDisplayChange={handleDisplayChange}
            hatchedCount={hatchedCount}
          />
        </RightPanel>
      }
    />
  );
};

export default GovWorkspace;
