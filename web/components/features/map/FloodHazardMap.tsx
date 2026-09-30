'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { cellToLatLng } from 'h3-js';
import { PathLayer } from '@deck.gl/layers';
import { useTheme } from '@/components/providers';
import { MAINLAND_INDIA_COORDS, ISLAND_GROUPS_COORDS } from '@/lib/geo/indiaBoundary';

import type {
  ForecastAlertItem,
  HazardCell,
  HazardLayerCoverage,
  HazardLayerLegend,
  HazardType,
} from '@/lib/api/types';
import { normaliseConfidence } from '@/lib/map/colorScale';
import { DEFAULT_VIEW_STATE } from '@/lib/map/constants';

import { MapContainer, type MapViewState } from './MapContainer';
import { MapErrorFallback } from './MapErrorFallback';
import { MapSkeleton } from './MapSkeleton';
import { HexTooltip } from './HexTooltip';
import { useHazardHexLayers } from './layers/useHazardHexLayers';
import { useForecastHexLayers } from './layers/useForecastHexLayers';
import { MapTopControlBar } from './controls/MapTopControlBar';
import { useLayoutContext } from '@/components/layout/ThreePanelLayout';
import { MapLegendPanel } from './legend/MapLegendPanel';

export interface FloodHazardMapDisplayState {
  opacity: number;
  showConfidenceHatch: boolean;
  confidenceThreshold: number;
  showHardZero: boolean;
  showNoCoverage: boolean;
  resolution: number;
}

export interface FloodHazardMapProps {
  cells: HazardCell[];
  legend: HazardLayerLegend | null;
  coverage: HazardLayerCoverage | null;
  hazardType?: HazardType;
  isLoading?: boolean;
  errorMessage?: string | null;
  errorCode?: string | null;
  requestId?: string | null;
  onRetry?: () => void;
  selectedH3?: string | null;
  hoveredH3?: string | null;
  onSelectCell?: (h3: string | null) => void;
  onHoverCell?: (h3: string | null) => void;
  /** Display state is lifted so panels outside the map can read and drive it. */
  display: FloodHazardMapDisplayState;
  onDisplayChange?: (next: Partial<FloodHazardMapDisplayState>) => void;
  /**
   * Forecast Alert Zone cells drawn above the static stack. Empty or omitted leaves the
   * map exactly as it was before the forecast overlay existed.
   */
  forecastItems?: ForecastAlertItem[];
  showForecastOverlay?: boolean;
  /** Outlines cells sitting at their static baseline rather than hiding them. */
  showForecastBaselineCells?: boolean;
  onForecastCellHover?: (item: ForecastAlertItem | null) => void;
  onForecastCellClick?: (item: ForecastAlertItem | null) => void;
  initialViewState?: MapViewState;
  styleUrl?: string;
  className?: string;
  classNames?: {
    root?: string;
    controls?: string;
  };
}

/**
 * Orchestrates the hazard map: layer construction, hover/selection, and the floating
 * control bar. Receives cells and legend as props so it stays independent of how they
 * were fetched.
 */
export const FloodHazardMap = ({
  cells,
  legend,
  coverage,
  isLoading = false,
  errorMessage = null,
  errorCode = null,
  requestId = null,
  onRetry,
  selectedH3 = null,
  hoveredH3 = null,
  onSelectCell,
  onHoverCell,
  display,
  onDisplayChange,
  forecastItems = [],
  showForecastOverlay = false,
  showForecastBaselineCells = true,
  onForecastCellHover,
  onForecastCellClick,
  initialViewState = DEFAULT_VIEW_STATE,
  styleUrl,
  className = '',
  classNames = {},
}: FloodHazardMapProps) => {
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);

  const breaks = useMemo(() => legend?.breaks ?? [], [legend]);
  const confidenceCeiling = legend?.confidence_ceiling ?? 1;

  const forecastMap = useMemo(() => {
    if (!forecastItems || forecastItems.length === 0) return new Map<string, ForecastAlertItem>();
    return new Map(forecastItems.map((item) => [item.h3, item]));
  }, [forecastItems]);

  const lastPannedH3Ref = useRef<string | null>(null);

  const panToCell = useCallback((h3: string) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    try {
      const [lat, lng] = cellToLatLng(h3);
      lastPannedH3Ref.current = h3;
      map.easeTo({
        center: [lng, lat],
        duration: 800,
        essential: true,
      });
    } catch (err) {
      console.warn('Failed to pan 2D map to cell:', err);
    }
  }, []);

  useEffect(() => {
    if (!selectedH3) {
      lastPannedH3Ref.current = null;
      return;
    }
    if (selectedH3 === lastPannedH3Ref.current) return;
    panToCell(selectedH3);
  }, [selectedH3, panToCell]);

  const handleCellClick = useCallback(
    (cell: HazardCell | null) => {
      if (cell) {
        panToCell(cell.h3);
      }
      onSelectCell?.(cell?.h3 ?? null);
    },
    [onSelectCell, panToCell],
  );

  const handleCellHover = useCallback(
    (cell: HazardCell | null) => {
      onHoverCell?.(cell?.h3 ?? null);
      if (!cell) setPointer(null);
    },
    [onHoverCell],
  );

  const layers = useHazardHexLayers({
    cells,
    breaks,
    confidenceCeiling,
    opacity: display.opacity,
    showConfidenceHatch: display.showConfidenceHatch,
    confidenceThreshold: display.confidenceThreshold,
    showHardZero: display.showHardZero,
    showNoCoverage: display.showNoCoverage,
    selectedH3,
    hoveredH3,
    onCellClick: handleCellClick,
    onCellHover: handleCellHover,
  });

  const forecastLayers = useForecastHexLayers({
    items: forecastItems,
    visible: showForecastOverlay,
    opacity: display.opacity,
    showBaselineCells: showForecastBaselineCells,
    onCellClick: onForecastCellClick,
    onCellHover: onForecastCellHover,
  });

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { isTopCollapsed } = useLayoutContext();

  const boundaryLayer = useMemo(
    () =>
      new PathLayer({
        id: 'sovereign-india-boundary',
        data: [
          { path: MAINLAND_INDIA_COORDS },
          ...ISLAND_GROUPS_COORDS.map((path) => ({ path })),
        ],
        getPath: (d: { path: [number, number][] }) => d.path,
        getColor: isDark ? [212, 154, 69, 190] : [55, 78, 68, 220],
        getWidth: 2.2,
        widthUnits: 'pixels',
        widthMinPixels: 1.5,
        pickable: false,
      }),
    [isDark],
  );

  // Sovereign boundary sits at the base; forecast sits above susceptibility stack; hover/selection outlines top
  const allLayers = useMemo(
    () => [boundaryLayer, ...layers, ...forecastLayers],
    [boundaryLayer, layers, forecastLayers],
  );

  // Only the pointer position is stored; the cell itself is derived from `hoveredH3`
  // below, so a tooltip cannot outlive the cell it describes when the layer or resolution
  // changes underneath it.
  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    // Control and legend panels sit above the canvas and swallow pointer events, so
    // deck.gl never fires its own onHover(null) when the cursor crosses onto them.
    // Anchoring the tooltip to the canvas is what stops it sticking under a panel.
    if (!(event.target as HTMLElement).closest('canvas')) {
      setPointer(null);
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    setPointer({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
  }, []);

  const hoveredCell = useMemo(
    () => (hoveredH3 ? (cells.find((cell) => cell.h3 === hoveredH3) ?? null) : null),
    [cells, hoveredH3],
  );

  const hatchedCount = useMemo(() => {
    if (!display.showConfidenceHatch || !legend) return 0;
    return cells.filter(
      (cell) =>
        cell.quality_flag !== 'no_coverage' &&
        normaliseConfidence(cell.confidence, confidenceCeiling) < display.confidenceThreshold,
    ).length;
  }, [cells, confidenceCeiling, display.confidenceThreshold, display.showConfidenceHatch, legend]);

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setPointer(null)}
      className={['relative h-full w-full', classNames.root ?? '', className].filter(Boolean).join(' ')}
    >
      <MapContainer
        layers={allLayers}
        initialViewState={initialViewState}
        styleUrl={styleUrl}
        onMapLoad={(map) => {
          mapInstanceRef.current = map;
        }}
        onBackgroundClick={() => onSelectCell?.(null)}
      >
        {/* Floating Top Control Bar at Map Center */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
          <MapTopControlBar
            resolution={display.resolution}
            onResolutionChange={(resolution) => onDisplayChange?.({ resolution })}
            opacity={display.opacity}
            onOpacityChange={(opacity) => onDisplayChange?.({ opacity })}
            showConfidenceHatch={display.showConfidenceHatch}
            onConfidenceHatchChange={(showConfidenceHatch) =>
              onDisplayChange?.({ showConfidenceHatch })
            }
          />
        </div>

        {/* Floating Zoom Controls at Bottom-Right */}
        <div className="absolute bottom-4 right-4 z-20 pointer-events-auto flex flex-col rounded-xl border border-line dark:border-[#1e2d45] bg-surface-0/95 dark:bg-[#0c1524]/92 text-ink dark:text-text-primary backdrop-blur-xl shadow-2xl overflow-hidden select-none">
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="p-2 text-text-secondary hover:text-ink dark:hover:text-white hover:bg-surface-2 dark:hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <span className="material-symbols-outlined text-lg">add</span>
          </button>
          <div className="h-px w-full bg-line dark:bg-white/10" />
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="p-2 text-text-secondary hover:text-ink dark:hover:text-white hover:bg-surface-2 dark:hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <span className="material-symbols-outlined text-lg">remove</span>
          </button>
        </div>

        {legend && coverage ? (
          <MapLegendPanel
            legend={legend}
            coverage={coverage}
            hatchedCount={hatchedCount}
            confidenceThreshold={display.confidenceThreshold}
            defaultCollapsed={true}
          />
        ) : null}

        {hoveredCell && pointer ? (
          <HexTooltip
            cell={hoveredCell}
            x={pointer.x}
            y={pointer.y}
            confidenceCeiling={confidenceCeiling}
            forecastItem={forecastMap.get(hoveredCell.h3) ?? null}
          />
        ) : null}
      </MapContainer>

      {isLoading ? <MapSkeleton /> : null}
      {errorMessage ? (
        <MapErrorFallback
          message={errorMessage}
          code={errorCode}
          requestId={requestId}
          onRetry={onRetry}
        />
      ) : null}
    </div>
  );
};
