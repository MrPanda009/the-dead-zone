/** Pointer interaction for the district hazard map: hover highlight, tooltip data and click selection. */

import type { Map as MapLibreMap } from 'maplibre-gl';

import type { DistrictCellProperties } from './districtGeoJson';
import { HAZARD_FILL_LAYER_ID, setHighlight } from './districtMapOverlays';

export interface DistrictMapInteractionHandlers {
  getSelectedId: () => string | null;
  setSelectedId: (id: string | null) => void;
  onHover: (cell: DistrictCellProperties | null) => void;
  onSelect: (id: string | null) => void;
}

/** MapLibre returns property values as-is for primitives; coerce the numeric ones defensively. */
function readProps(raw: Record<string, unknown>): DistrictCellProperties {
  return {
    ...(raw as unknown as DistrictCellProperties),
    susceptibility: Number(raw.susceptibility),
    confidence: Number(raw.confidence),
  };
}

/**
 * Binds listeners once. Layer-scoped listeners survive a basemap swap, so they keep working
 * after the overlay layers are reinstalled. Handlers are read through callbacks so the latest
 * React state is always used.
 */
export function bindDistrictMapInteractions(
  map: MapLibreMap,
  handlers: DistrictMapInteractionHandlers,
): void {
  map.on('mousemove', HAZARD_FILL_LAYER_ID, (event) => {
    const props = event.features?.[0]?.properties;
    if (!props) return;
    map.getCanvas().style.cursor = 'pointer';
    setHighlight(map, String(props.id));
    handlers.onHover(readProps(props));
  });

  map.on('mouseleave', HAZARD_FILL_LAYER_ID, () => {
    map.getCanvas().style.cursor = '';
    setHighlight(map, handlers.getSelectedId());
    handlers.onHover(null);
  });

  map.on('click', (event) => {
    if (!map.getLayer(HAZARD_FILL_LAYER_ID)) return;
    const hit = map.queryRenderedFeatures(event.point, { layers: [HAZARD_FILL_LAYER_ID] })[0];
    const id = hit?.properties ? String(hit.properties.id) : null;
    handlers.setSelectedId(id);
    setHighlight(map, id);
    handlers.onSelect(id);
  });
}
