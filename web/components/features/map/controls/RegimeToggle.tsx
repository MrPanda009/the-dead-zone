'use client';

import type { HazardRegime } from '@/lib/api/types';
import { Toggle } from '@/components/ui/Toggle';
import {
  REGIME_DESCRIPTIONS,
  REGIME_LABELS,
  REGIME_ORDER,
  type RegimeVisibility,
} from '@/lib/map/constants';

export interface RegimeToggleProps {
  visible: RegimeVisibility;
  onVisibleChange?: (regime: HazardRegime, show: boolean) => void;
  /** Regimes to offer, in display order. */
  regimes?: readonly HazardRegime[];
  /** Adds each regime's one-line description under its label. */
  showDescriptions?: boolean;
  className?: string;
}

/** Shows or hides each hazard regime on the map independently of the others. */
export const RegimeToggle = ({
  visible,
  onVisibleChange,
  regimes = REGIME_ORDER,
  showDescriptions = false,
  className = '',
}: RegimeToggleProps) => (
  <div className={['flex flex-col gap-2.5', className].filter(Boolean).join(' ')}>
    {regimes.map((regime) => (
      <Toggle
        key={regime}
        label={REGIME_LABELS[regime]}
        description={showDescriptions ? REGIME_DESCRIPTIONS[regime] : undefined}
        checked={visible[regime]}
        onCheckedChange={(show) => onVisibleChange?.(regime, show)}
      />
    ))}
  </div>
);
