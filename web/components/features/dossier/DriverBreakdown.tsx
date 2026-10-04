'use client';

import { useMemo, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { SectionHeader } from '@/components/common/SectionHeader';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import type { FloodDrivers, HazardRegime } from '@/lib/api/types';
import { LEGACY_FLOOD_FORMULA, REGIME_FORMULAS } from '@/lib/map/constants';
import { buildDriverRows } from '@/lib/map/regimeDrivers';

import { DriverMetricRow } from './DriverMetricRow';

export interface DriverBreakdownProps {
  drivers: FloodDrivers;
  /** Regime of the cell; selects the formula line. Omit for cells scored before regimes existed. */
  regime?: HazardRegime | null;
  /** `RegimeContext.key_drivers`: shown first and emphasised. */
  keyDrivers?: readonly string[];
  /** Adds the shared context rows (HAND range, slope, cropland, coverage) after the key drivers. */
  includeSecondary?: boolean;
  title?: string;
  /** Overrides the formula line under the title. */
  formula?: string;
  className?: string;
  classNames?: {
    root?: string;
    header?: string;
    list?: string;
  };
  animation?: {
    disabled?: boolean;
    stagger?: number;
    duration?: number;
  };
}

/**
 * Physical drivers behind the score.
 *
 * Each regime is scored by its own formula, so the rows that actually move the number are
 * the regime's key drivers (HAND, anomalous frequency and tributary proximity on a floodplain;
 * instability, water occurrence and mainstem proximity on a char). They lead and are emphasised;
 * the remaining rows are context.
 */
export const DriverBreakdown = ({
  drivers,
  regime = null,
  keyDrivers,
  includeSecondary = true,
  title = 'Why this score',
  formula,
  className = '',
  classNames = {},
  animation = {},
}: DriverBreakdownProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const { disabled: animationDisabled = false, stagger = 0.04, duration = 0.35 } = animation;
  const animate = !animationDisabled && !prefersReducedMotion;

  const rows = useMemo(
    () => buildDriverRows(drivers, keyDrivers, { includeSecondary }),
    [drivers, keyDrivers, includeSecondary],
  );

  useGSAP(
    () => {
      if (!animate) return;
      gsap.fromTo(
        '[data-driver-row]',
        { y: 8, opacity: 0 },
        { y: 0, opacity: 1, duration, stagger, ease: 'power2.out', clearProps: 'opacity,transform' },
      );
    },
    { scope: rootRef, dependencies: [rows, animate, duration, stagger] },
  );

  return (
    <div
      ref={rootRef}
      className={['flex flex-col gap-2.5', classNames.root ?? '', className].filter(Boolean).join(' ')}
    >
      <SectionHeader
        title={title}
        description={formula ?? (regime ? REGIME_FORMULAS[regime] : LEGACY_FLOOD_FORMULA)}
        className={classNames.header}
      />

      <div className={['flex flex-col gap-2.5', classNames.list ?? ''].join(' ')}>
        {rows.map(({ key, spec, emphasised }) => (
          <DriverMetricRow
            key={key}
            label={spec.label}
            value={spec.format(drivers)}
            fraction={spec.fraction(drivers)}
            variant={emphasised ? 'accent' : 'muted'}
            hint={spec.hint}
          />
        ))}
      </div>
    </div>
  );
};
