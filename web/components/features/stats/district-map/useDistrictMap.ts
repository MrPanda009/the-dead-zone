'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { useTheme } from '@/components/providers';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import { registerPMTilesProtocol, resolveBasemapStyle } from '@/lib/map/basemap';
import {
  boundsOfCollection,
  type DistrictCellCollection,
  type DistrictCellProperties,
} from '@/lib/map/districtGeoJson';
import { bindDistrictMapInteractions } from '@/lib/map/districtMapInteractions';
import {
  installDistrictOverlays,
  setDistrictData,
  setHighlight,
} from '@/lib/map/districtMapOverlays';

import type { StatsDistrict } from '../types';

export interface UseDistrictMapOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  district: StatsDistrict;
  data: DistrictCellCollection;
  interactive?: boolean;
  onHoverCell?: (cell: DistrictCellProperties | null) => void;
  onSelectCell?: (h3: string | null) => void;
}

export interface UseDistrictMapResult {
  isReady: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
}

/**
 * Owns the MapLibre instance for the district map: basemap, theme swaps, the sovereign
 * boundary, the hazard cell layers and pointer interaction.
 *
 * Callbacks and the latest data are held in a ref because MapLibre listeners are bound once.
 */
export function useDistrictMap({
  containerRef,
  district,
  data,
  interactive = true,
  onHoverCell,
  onSelectCell,
}: UseDistrictMapOptions): UseDistrictMapResult {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const reduceMotion = usePrefersReducedMotion();

  const mapRef = useRef<MapLibreMap | null>(null);
  const appliedDarkRef = useRef<boolean | null>(null);
  const [isReady, setIsReady] = useState(false);
  const latest = useRef({
    data,
    isDark,
    selectedId: null as string | null,
    onHoverCell,
    onSelectCell,
  });

  useEffect(() => {
    latest.current.data = data;
    latest.current.isDark = isDark;
    latest.current.onHoverCell = onHoverCell;
    latest.current.onSelectCell = onSelectCell;
  });

  // Create the map once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    let disposed = false;

    async function init(target: HTMLDivElement) {
      await registerPMTilesProtocol();
      if (disposed) return;

      maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
      appliedDarkRef.current = latest.current.isDark;
      const map = new maplibregl.Map({
        container: target,
        style: resolveBasemapStyle(undefined, latest.current.isDark),
        center: [district.lng, district.lat],
        zoom: district.zoom ?? 10.6,
        pitch: 24,
        bearing: -6,
        interactive,
        attributionControl: false,
      });
      map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

      map.on('load', () => {
        if (disposed) return;
        installDistrictOverlays(map, {
          isDark: latest.current.isDark,
          data: latest.current.data,
          selectedId: latest.current.selectedId,
        });

        bindDistrictMapInteractions(map, {
          getSelectedId: () => latest.current.selectedId,
          setSelectedId: (id) => {
            latest.current.selectedId = id;
          },
          onHover: (cell) => latest.current.onHoverCell?.(cell),
          onSelect: (id) => latest.current.onSelectCell?.(id),
        });

        setIsReady(true);
      });

      mapRef.current = map;
    }

    init(container);

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // The map is created once; district framing is handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap the basemap on theme change. A full reload (`diff: false`) discards custom layers,
  // so they are reinstalled once the new style has loaded.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady || appliedDarkRef.current === isDark) return;
    appliedDarkRef.current = isDark;

    map.setStyle(resolveBasemapStyle(undefined, isDark), { diff: false });
    map.once('style.load', () => {
      installDistrictOverlays(map, {
        isDark,
        data: latest.current.data,
        selectedId: latest.current.selectedId,
      });
    });
  }, [isDark, isReady]);

  // Push new cells and frame them. Falls back to the district centre when there are none.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;

    // A selection from the previous district's cells means nothing for the new data.
    if (latest.current.selectedId !== null) {
      latest.current.selectedId = null;
      setHighlight(map, null);
      latest.current.onSelectCell?.(null);
    }

    setDistrictData(map, data);
    const bounds = boundsOfCollection(data);
    if (bounds) {
      map.fitBounds(bounds, {
        padding: 32,
        maxZoom: 13,
        duration: reduceMotion ? 0 : 700,
        essential: true,
      });
    } else {
      map.flyTo({
        center: [district.lng, district.lat],
        zoom: district.zoom ?? 10.6,
        speed: 1.2,
        essential: true,
        // Only set `duration` when overriding it: an explicit `undefined` replaces
        // MapLibre's default and turns the animation into NaN.
        ...(reduceMotion ? { duration: 0 } : {}),
      });
    }
  }, [data, district, isReady, reduceMotion]);

  const zoomIn = useCallback(() => mapRef.current?.zoomIn(), []);
  const zoomOut = useCallback(() => mapRef.current?.zoomOut(), []);

  return { isReady, zoomIn, zoomOut };
}
