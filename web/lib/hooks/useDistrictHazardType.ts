'use client';

import { useCallback, useState } from 'react';

import type { HazardType } from '@/lib/api/types';
import { resolveDefaultHazardType } from '@/lib/map/districtHazardDefaults';

export interface UseDistrictHazardTypeOptions {
  /** Jurisdiction (LGD code or admin id). May resolve late, e.g. after the session loads. */
  admin?: number | null;
  /** Forces a layer regardless of jurisdiction, until the user picks another. */
  initialHazardType?: HazardType;
}

export interface UseDistrictHazardTypeResult {
  hazardType: HazardType;
  /** Records an explicit user choice; from then on the district default no longer applies. */
  selectHazardType: (next: HazardType) => void;
}

/**
 * Active hazard layer that follows the jurisdiction until the user chooses one.
 *
 * The default is derived on every render rather than copied into state, so a jurisdiction
 * that arrives after mount (an officer's session resolving) still lands on the right layer.
 */
export function useDistrictHazardType(
  options: UseDistrictHazardTypeOptions = {},
): UseDistrictHazardTypeResult {
  const { admin, initialHazardType } = options;
  const [userChoice, setUserChoice] = useState<HazardType | null>(null);

  const hazardType = userChoice ?? initialHazardType ?? resolveDefaultHazardType(admin);

  const selectHazardType = useCallback((next: HazardType) => setUserChoice(next), []);

  return { hazardType, selectHazardType };
}
