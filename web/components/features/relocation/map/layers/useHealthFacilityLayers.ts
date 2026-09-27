'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Layer } from '@deck.gl/core';
import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';

import { fetchHealthFacilities } from '@/lib/api/relocation';
import type { HealthFacilityFeature } from '@/lib/api/types';

export interface UseHealthFacilityLayersOptions {
  /** When false (default), layer is disabled and does not fetch or render */
  enabled?: boolean;
  /** Optional administrative boundary or district ID filter */
  adminId?: number | null;
  /** Facility type filter (e.g. 'sub_cen', 'phc', 'chc') */
  facilityType?: string;
  /** Callback when a healthcare facility marker is clicked */
  onSelectFacility?: (facility: HealthFacilityFeature) => void;
}

export function useHealthFacilityLayers({
  enabled = false,
  adminId,
  facilityType,
  onSelectFacility,
}: UseHealthFacilityLayersOptions = {}): Layer[] {
  const [facilities, setFacilities] = useState<HealthFacilityFeature[]>([]);

  useEffect(() => {
    if (!enabled) {
      setFacilities([]);
      return;
    }

    const controller = new AbortController();
    fetchHealthFacilities(
      {
        admin: adminId ?? undefined,
        facility_type: facilityType,
      },
      controller.signal,
    )
      .then((data) => {
        setFacilities(data.features ?? []);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.warn('[useHealthFacilityLayers] Failed to fetch facilities:', err);
        }
      });

    return () => {
      controller.abort();
    };
  }, [enabled, adminId, facilityType]);

  const layers = useMemo<Layer[]>(() => {
    if (!enabled || facilities.length === 0) return [];

    const result: Layer[] = [];

    // Subtle Healthcare Facility Markers
    result.push(
      new ScatterplotLayer<HealthFacilityFeature>({
        id: 'supplementary-health-facilities',
        data: facilities,
        getPosition: (d) => [d.geometry.coordinates[0], d.geometry.coordinates[1]],
        getFillColor: (d) =>
          d.properties.flood_safe
            ? [16, 185, 129, 210] // Emerald green for flood-safe facilities
            : [245, 158, 11, 210], // Amber warning if prone to inundation
        getRadius: 100,
        radiusMinPixels: 5,
        radiusMaxPixels: 12,
        stroked: true,
        getLineColor: [255, 255, 255, 240],
        lineWidthMinPixels: 1.5,
        pickable: true,
        onClick: (info) => {
          if (info.object && onSelectFacility) {
            onSelectFacility(info.object);
          }
        },
      }),
    );

    // Subtle '+' Cross Label Inside Facility Marker
    result.push(
      new TextLayer<HealthFacilityFeature>({
        id: 'supplementary-health-facility-symbols',
        data: facilities,
        getPosition: (d) => [d.geometry.coordinates[0], d.geometry.coordinates[1]],
        getText: () => '+',
        getSize: 10,
        getColor: [255, 255, 255, 255],
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        pickable: false,
      }),
    );

    return result;
  }, [enabled, facilities, onSelectFacility]);

  return layers;
}
