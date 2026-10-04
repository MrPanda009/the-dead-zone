/**
 * Converts API hazard cells into a GeoJSON FeatureCollection for MapLibre.
 *
 * The cell layer carries only H3 indexes, so hexagon boundaries are derived here. Colours
 * come from the same classing helpers the main map uses, which keeps the legend, the fill
 * and the "never draw an unobserved cell as safe" rule identical across both maps.
 */

import { cellToBoundary } from 'h3-js';

import type { CoverageFlag, HazardCell, HazardLayerLegend } from '@/lib/api/types';

import {
  cellFillColor,
  normaliseConfidence,
  renderClassFor,
  rgbaToCss,
  type CellRenderClass,
} from './colorScale';
import {
  CHANNEL_COLOR,
  CHANNEL_OUTLINE_COLOR,
  HARD_ZERO_COLOR,
  NO_COVERAGE_OUTLINE_COLOR,
} from './constants';

/** Properties stored on every feature; read back by the hover tooltip and paint expressions. */
export interface DistrictCellProperties {
  id: string;
  susceptibility: number;
  /** Confidence divided by the layer ceiling, in [0, 1]. */
  confidence: number;
  quality_flag: CoverageFlag;
  render: CellRenderClass;
  /** CSS colour for the fill. Fully transparent for unobserved cells. */
  fill: string;
  /** CSS colour for the outline. */
  outline: string;
}

export type DistrictCellFeature = GeoJSON.Feature<GeoJSON.Polygon, DistrictCellProperties>;
export type DistrictCellCollection = GeoJSON.FeatureCollection<GeoJSON.Polygon, DistrictCellProperties>;

const TRANSPARENT = 'rgba(0, 0, 0, 0)';

function featureFor(cell: HazardCell, legend: HazardLayerLegend): DistrictCellFeature {
  const render = renderClassFor(cell);
  const solid = cellFillColor(cell, legend.breaks);

  let fill = rgbaToCss(solid);
  let outline = rgbaToCss(solid);
  if (render === 'no_coverage') {
    // Unobserved: outline only. A filled, low-ramp colour here would read as "safest".
    fill = TRANSPARENT;
    outline = rgbaToCss(NO_COVERAGE_OUTLINE_COLOR);
  } else if (render === 'channel') {
    fill = rgbaToCss(CHANNEL_COLOR);
    outline = rgbaToCss(CHANNEL_OUTLINE_COLOR);
  } else if (render === 'hard_zero') {
    fill = rgbaToCss(HARD_ZERO_COLOR);
    outline = rgbaToCss(HARD_ZERO_COLOR);
  }

  // `true` returns [lng, lat] pairs, the order GeoJSON expects. GeoJSON rings must be closed.
  const ring = cellToBoundary(cell.h3, true);

  return {
    type: 'Feature',
    id: cell.h3,
    properties: {
      id: cell.h3,
      susceptibility: cell.susceptibility,
      confidence: normaliseConfidence(cell.confidence, legend.confidence_ceiling),
      quality_flag: cell.quality_flag,
      render,
      fill,
      outline,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[...ring, ring[0]]],
    },
  };
}

export function cellsToFeatureCollection(
  cells: readonly HazardCell[],
  legend: HazardLayerLegend | null | undefined,
): DistrictCellCollection {
  if (!legend) return { type: 'FeatureCollection', features: [] };
  return { type: 'FeatureCollection', features: cells.map((cell) => featureFor(cell, legend)) };
}

/** Centre and bounds of the loaded cells, used to frame the district instead of a hard-coded point. */
export function boundsOfCollection(
  collection: DistrictCellCollection,
): [[number, number], [number, number]] | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const feature of collection.features) {
    for (const [lng, lat] of feature.geometry.coordinates[0]) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  if (!Number.isFinite(minLng)) return null;
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}
