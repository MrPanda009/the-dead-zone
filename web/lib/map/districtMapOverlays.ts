/**
 * MapLibre sources and layers for the district hazard map.
 *
 * `installDistrictOverlays` is idempotent. It runs once on first load and again after every
 * basemap style swap (light/dark), which discards all custom sources and layers.
 */

import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';

import { SOVEREIGN_INDIA_GEOJSON } from '@/lib/geo/indiaBoundary';

import type { DistrictCellCollection } from './districtGeoJson';

export const HAZARD_SOURCE_ID = 'district-hazard-source';
export const HAZARD_FILL_LAYER_ID = 'district-hazard-fill';
export const HAZARD_OUTLINE_LAYER_ID = 'district-hazard-outline';
export const HAZARD_HIGHLIGHT_LAYER_ID = 'district-hazard-highlight';

const SOVEREIGN_SOURCE_ID = 'sovereign-india-source';

export interface InstallOverlaysOptions {
  isDark: boolean;
  data: DistrictCellCollection;
  /** Cell kept highlighted after a click. */
  selectedId: string | null;
}

function installSovereignBoundary(map: MapLibreMap, isDark: boolean): void {
  if (map.getSource(SOVEREIGN_SOURCE_ID)) return;

  map.addSource(SOVEREIGN_SOURCE_ID, { type: 'geojson', data: SOVEREIGN_INDIA_GEOJSON });
  map.addLayer({
    id: 'sovereign-india-glow',
    type: 'line',
    source: SOVEREIGN_SOURCE_ID,
    paint: {
      'line-color': isDark ? '#d49a45' : '#166534',
      'line-width': 5,
      'line-blur': 3,
      'line-opacity': 0.45,
    },
  });
  map.addLayer({
    id: 'sovereign-india-line',
    type: 'line',
    source: SOVEREIGN_SOURCE_ID,
    paint: {
      'line-color': isDark ? '#f59e0b' : '#166534',
      'line-width': 2.2,
      'line-opacity': 1,
    },
  });
}

function installHazardCells(map: MapLibreMap, data: DistrictCellCollection, selectedId: string | null): void {
  if (map.getSource(HAZARD_SOURCE_ID)) return;

  map.addSource(HAZARD_SOURCE_ID, { type: 'geojson', data });
  map.addLayer({
    id: HAZARD_FILL_LAYER_ID,
    type: 'fill',
    source: HAZARD_SOURCE_ID,
    // `fill` is transparent for unobserved cells, so they are outlined, never filled.
    paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': 1 },
  });
  map.addLayer({
    id: HAZARD_OUTLINE_LAYER_ID,
    type: 'line',
    source: HAZARD_SOURCE_ID,
    paint: { 'line-color': ['get', 'outline'], 'line-width': 1.2, 'line-opacity': 1 },
  });
  map.addLayer({
    id: HAZARD_HIGHLIGHT_LAYER_ID,
    type: 'line',
    source: HAZARD_SOURCE_ID,
    paint: { 'line-color': '#ffffff', 'line-width': 2.5, 'line-opacity': 1 },
    filter: ['==', ['get', 'id'], selectedId ?? ''],
  });
}

export function installDistrictOverlays(map: MapLibreMap, options: InstallOverlaysOptions): void {
  installSovereignBoundary(map, options.isDark);
  installHazardCells(map, options.data, options.selectedId);
}

export function setDistrictData(map: MapLibreMap, data: DistrictCellCollection): void {
  const source = map.getSource(HAZARD_SOURCE_ID) as GeoJSONSource | undefined;
  source?.setData(data);
}

export function setHighlight(map: MapLibreMap, cellId: string | null): void {
  if (!map.getLayer(HAZARD_HIGHLIGHT_LAYER_ID)) return;
  map.setFilter(HAZARD_HIGHLIGHT_LAYER_ID, ['==', ['get', 'id'], cellId ?? '']);
}
