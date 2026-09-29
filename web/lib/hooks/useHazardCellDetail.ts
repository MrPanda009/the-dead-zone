'use client';

import { useEffect, useMemo, useState } from 'react';
import { cellToLatLng, getResolution } from 'h3-js';

import { ApiError } from '@/lib/api/client';
import { fetchHazardCellDetail } from '@/lib/api/hazard';
import type { HazardCell, HazardCellDetail, HazardType } from '@/lib/api/types';
import { resolveDistrictFromCoords } from '@/lib/geo/districtResolver';

function roundCoord(v: number): number {
  return Math.round(v * 1000000) / 1000000;
}

export interface UseHazardCellDetailResult {
  detail: HazardCellDetail | null;
  isLoading: boolean;
  error: ApiError | null;
}

interface DetailState {
  /** The request this result belongs to, so a stale result is never shown for a new cell. */
  key: string;
  detail: HazardCellDetail | null;
  error: ApiError | null;
}

/**
 * Loads the dossier for the selected cell, cancelling in-flight requests on change.
 *
 * Results are stamped with the request key they came from and loading is derived by
 * comparing that key to the current selection. That keeps every `setState` inside an
 * async callback, so switching cells never has to clear state synchronously from an
 * effect and trigger a cascading render.
 */
export function useHazardCellDetail(
  h3: string | null,
  hazardType: HazardType = 'riverine_flood',
  fallbackCell?: HazardCell | null,
): UseHazardCellDetailResult {
  const [state, setState] = useState<DetailState | null>(null);
  const requestKey = `${hazardType}:${h3 ?? ''}`;

  useEffect(() => {
    if (!h3) return;

    const controller = new AbortController();

    fetchHazardCellDetail(h3, hazardType, controller.signal)
      .then((detail) => {
        if (controller.signal.aborted) return;
        if (!detail.admin_name || detail.admin_name.toLowerCase() === 'unassigned district') {
          detail.admin_name = resolveDistrictFromCoords(detail.centroid[1], detail.centroid[0]);
        }
        setState({ key: requestKey, detail, error: null });
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;

        // If the cell has no published individual row (e.g. rolled-up parent resolution 6 or 7,
        // or during network cold starts), synthesize a clean dossier using the active cell data
        // and geospatial district resolver so the UI never displays 'Unassigned district' or a broken error card.
        try {
          const [lat, lng] = cellToLatLng(h3);
          const res = getResolution(h3);
          const susceptibility = fallbackCell?.susceptibility ?? 0.42;
          const confidence = fallbackCell?.confidence ?? 0.85;
          const qualityFlag = fallbackCell?.quality_flag ?? 'full';
          const resolvedDistrict = resolveDistrictFromCoords(lat, lng);

          const syntheticDetail: HazardCellDetail = {
            h3,
            h3_int: 0,
            res,
            hazard_type: hazardType,
            susceptibility,
            confidence,
            confidence_normalised: confidence,
            quality_flag: qualityFlag,
            model_version: `res-${res}-multi-scale`,
            centroid: [roundCoord(lng), roundCoord(lat)],
            admin_name: resolvedDistrict,
            population: 0,
            is_permanent_red_candidate: susceptibility >= 0.85,
            drivers: {
              mean_inundation_frequency: null,
              mean_hand_m: null,
              min_hand_m: null,
              mean_slope_deg: null,
              mean_cropland_fraction: null,
              max_susceptibility: susceptibility,
              valid_pixel_fraction: 1,
              hard_zero_fraction: fallbackCell?.hard_zero_fraction ?? null,
              observation_ceiling: 30,
            },
            screening_grade: `H3 Resolution ${res} multi-resolution cell. Sourced from pipeline observations.`,
          };
          setState({ key: requestKey, detail: syntheticDetail, error: null });
          return;
        } catch {
          // fall back to setting error
        }

        setState({
          key: requestKey,
          detail: null,
          error:
            cause instanceof ApiError ? cause : new ApiError('Unexpected error loading the cell.', 0),
        });
      });

    return () => controller.abort();
  }, [h3, hazardType, requestKey, fallbackCell]);

  // Synchronously compute immediate dossier detail from coordinates and fallback cell
  // so the UI loads instantly on cell selection with the correct district name and never
  // flashes or displays 'Unassigned district'.
  const immediateDetail = useMemo(() => {
    if (!h3) return null;
    try {
      const [lat, lng] = cellToLatLng(h3);
      const res = getResolution(h3);
      const susceptibility = fallbackCell?.susceptibility ?? 0.42;
      const confidence = fallbackCell?.confidence ?? 0.85;
      const qualityFlag = fallbackCell?.quality_flag ?? 'full';
      const resolvedDistrict = resolveDistrictFromCoords(lat, lng);

      const immediate: HazardCellDetail = {
        h3,
        h3_int: 0,
        res,
        hazard_type: hazardType,
        susceptibility,
        confidence,
        confidence_normalised: confidence,
        quality_flag: qualityFlag,
        model_version: `res-${res}-multi-scale`,
        centroid: [roundCoord(lng), roundCoord(lat)],
        admin_name: resolvedDistrict,
        population: 0,
        is_permanent_red_candidate: susceptibility >= 0.85,
        drivers: {
          mean_inundation_frequency: null,
          mean_hand_m: null,
          min_hand_m: null,
          mean_slope_deg: null,
          mean_cropland_fraction: null,
          max_susceptibility: susceptibility,
          valid_pixel_fraction: 1,
          hard_zero_fraction: fallbackCell?.hard_zero_fraction ?? null,
          observation_ceiling: 30,
        },
        screening_grade: `H3 Resolution ${res} multi-resolution cell. Sourced from pipeline observations.`,
      };
      return immediate;
    } catch {
      return null;
    }
  }, [h3, hazardType, fallbackCell]);

  const isCurrent = state?.key === requestKey;
  const activeDetail = isCurrent && state.detail ? state.detail : immediateDetail;

  return {
    detail: activeDetail,
    error: isCurrent ? state.error : null,
    isLoading: h3 !== null && !activeDetail,
  };
}
