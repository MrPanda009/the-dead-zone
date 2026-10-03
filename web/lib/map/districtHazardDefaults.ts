/** Which hazard layer a district should open on, keyed by LGD code or admin_boundary id. */

import type { HazardType } from '@/lib/api/types';

/** Layer used when the view is national or the district has no registered primary hazard. */
export const FALLBACK_HAZARD_TYPE: HazardType = 'riverine_flood';

/**
 * Primary hazard per pilot district.
 *
 * A district's own layer must be the landing view: opening Wayanad on the Barpeta-centric
 * flood layer used to leave the map empty until the user found the layer switcher. The
 * hazard API resolves `admin` as either an LGD code or an admin_boundary id, so both keys
 * are registered.
 */
export const DISTRICT_PRIMARY_HAZARD: Readonly<Record<number, HazardType>> = {
  // Wayanad
  555: 'landslide',
  178: 'landslide',
  // Kodagu
  540: 'landslide',
  179: 'landslide',
  // Barpeta
  277: 'riverine_flood',
  303: 'riverine_flood',
  186: 'riverine_flood',
  191: 'riverine_flood',
  // Rudraprayag
  55: 'riverine_flood',
  192: 'riverine_flood',
  // Srinagar
  12: 'riverine_flood',
  193: 'riverine_flood',
  // Morena
  417: 'riverine_flood',
  181: 'riverine_flood',
  // Dholpur
  98: 'riverine_flood',
  180: 'riverine_flood',
};

export interface DistrictViewport {
  longitude: number;
  latitude: number;
  zoom: number;
  name: string;
}

export const DISTRICT_VIEWPORTS: Readonly<Record<number, DistrictViewport>> = {
  // Rudraprayag
  55: { longitude: 78.981, latitude: 30.285, zoom: 10.8, name: 'Rudraprayag' },
  192: { longitude: 78.981, latitude: 30.285, zoom: 10.8, name: 'Rudraprayag' },
  // Srinagar
  12: { longitude: 74.797, latitude: 34.084, zoom: 10.8, name: 'Srinagar' },
  193: { longitude: 74.797, latitude: 34.084, zoom: 10.8, name: 'Srinagar' },
  // Barpeta
  277: { longitude: 91.006, latitude: 26.321, zoom: 10.2, name: 'Barpeta' },
  303: { longitude: 91.006, latitude: 26.321, zoom: 10.2, name: 'Barpeta' },
  186: { longitude: 91.006, latitude: 26.321, zoom: 10.2, name: 'Barpeta' },
  191: { longitude: 91.006, latitude: 26.321, zoom: 10.2, name: 'Barpeta' },
  // Wayanad
  555: { longitude: 76.132, latitude: 11.685, zoom: 10.5, name: 'Wayanad' },
  178: { longitude: 76.132, latitude: 11.685, zoom: 10.5, name: 'Wayanad' },
  // Kodagu
  540: { longitude: 75.738, latitude: 12.424, zoom: 10.5, name: 'Kodagu' },
  179: { longitude: 75.738, latitude: 12.424, zoom: 10.5, name: 'Kodagu' },
  // Morena
  417: { longitude: 77.994, latitude: 26.495, zoom: 10.2, name: 'Morena' },
  181: { longitude: 77.994, latitude: 26.495, zoom: 10.2, name: 'Morena' },
  // Dholpur
  98: { longitude: 77.896, latitude: 26.702, zoom: 10.2, name: 'Dholpur' },
  180: { longitude: 77.896, latitude: 26.702, zoom: 10.2, name: 'Dholpur' },
};

/** Resolves the hazard layer a view should open on for the given jurisdiction. */
export function resolveDefaultHazardType(
  admin?: number | null,
  fallback: HazardType = FALLBACK_HAZARD_TYPE,
): HazardType {
  if (admin === undefined || admin === null) return fallback;
  return DISTRICT_PRIMARY_HAZARD[admin] ?? fallback;
}

/** Resolves camera viewport coordinates for a given district jurisdiction. */
export function resolveDistrictViewport(admin?: number | null): DistrictViewport | null {
  if (admin === undefined || admin === null) return null;
  return DISTRICT_VIEWPORTS[admin] ?? null;
}
