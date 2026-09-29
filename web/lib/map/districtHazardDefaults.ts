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
  555: 'landslide', // Wayanad — LGD code
  178: 'landslide', // Wayanad — admin_boundary id
  540: 'landslide', // Kodagu — LGD code
  303: 'riverine_flood', // Barpeta — LGD code as stored in admin_boundary (not 277)
  186: 'riverine_flood', // Barpeta — admin_boundary id
};

/** Resolves the hazard layer a view should open on for the given jurisdiction. */
export function resolveDefaultHazardType(
  admin?: number | null,
  fallback: HazardType = FALLBACK_HAZARD_TYPE,
): HazardType {
  if (admin === undefined || admin === null) return fallback;
  return DISTRICT_PRIMARY_HAZARD[admin] ?? fallback;
}
