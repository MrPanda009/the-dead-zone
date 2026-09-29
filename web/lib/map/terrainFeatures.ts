/** Display metadata for the terrain features behind a hazard score (`explanation` table). */

import type { FeatureContribution, HazardType } from '@/lib/api/types';
import { formatDegrees, formatMetres } from '@/lib/map/format';

export interface TerrainFeatureMeta {
  label: string;
  hint: string;
  format: (value: number) => string;
}

export const TERRAIN_FEATURES: Readonly<Record<string, TerrainFeatureMeta>> = {
  slope_deg: {
    label: 'Slope',
    hint: 'Steeper ground fails more readily; slope is the dominant landslide driver.',
    format: (value) => formatDegrees(value),
  },
  local_relief_m: {
    label: 'Local relief',
    hint: 'Elevation range in the surrounding terrain. More relief means more potential for runout.',
    format: (value) => formatMetres(value, 0),
  },
  dist_to_road_m: {
    label: 'Distance to road',
    hint: 'Road cuts destabilise slopes, so cells close to a road score higher.',
    format: (value) => formatMetres(value, 0),
  },
  hand_m: {
    label: 'HAND',
    hint: 'Height Above Nearest Drainage. Lower means closer to the drainage network, hence more flood-prone.',
    format: (value) => formatMetres(value, 1),
  },
  twi: {
    label: 'Wetness index (TWI)',
    hint: 'Topographic Wetness Index: how strongly the terrain concentrates water.',
    format: (value) => value.toFixed(2),
  },
};

/** Features that actually feed each hazard's score; the explanation row carries all of them. */
export const HAZARD_FEATURES: Partial<Record<HazardType, readonly string[]>> = {
  landslide: ['slope_deg', 'local_relief_m', 'dist_to_road_m'],
  flash_flood: ['hand_m', 'twi'],
  riverine_flood: ['hand_m', 'twi'],
};

/** Metadata for a feature, falling back to a humanised name for anything unregistered. */
export function describeFeature(feature: string): TerrainFeatureMeta {
  return (
    TERRAIN_FEATURES[feature] ?? {
      label: feature.replace(/_/g, ' '),
      hint: 'Model input without registered display metadata.',
      format: (value) => value.toFixed(2),
    }
  );
}

/**
 * Keeps only the attributions relevant to the active hazard, strongest first.
 * Falls back to every attribution when the hazard is unregistered or nothing matches,
 * so a new hazard never renders an empty panel.
 */
export function selectHazardContributions(
  contributions: readonly FeatureContribution[],
  hazardType?: HazardType,
): FeatureContribution[] {
  const wanted = hazardType ? HAZARD_FEATURES[hazardType] : undefined;
  const relevant = wanted ? contributions.filter((c) => wanted.includes(c.feature)) : [];
  const chosen = relevant.length > 0 ? relevant : contributions;
  return [...chosen].sort((a, b) => b.contribution - a.contribution);
}
