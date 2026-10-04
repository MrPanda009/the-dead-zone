'use client';

import React from 'react';
import { SectionHeader } from '@/components/common/SectionHeader';
import {
  CHANNEL_COLOR,
  CHAR_BELT_BOUNDARY_COLOR,
  CHAR_BELT_RAMP,
  REGIME_LABELS,
  REGIME_DESCRIPTIONS,
  SUSCEPTIBILITY_RAMP,
} from '@/lib/map/constants';
import { RegimeToggle } from '../controls/RegimeToggle';
import type { HazardRegime } from '@/lib/api/types';
import type { RegimeVisibility } from '@/lib/map/constants';
import { LegendSwatch } from './LegendSwatch';

export interface RegimeLegendProps {
  title?: string;
  /** When provided with `onVisibleRegimesChange`, shows a toggle per regime under the key. */
  visibleRegimes?: RegimeVisibility;
  onVisibleRegimesChange?: (regime: HazardRegime, show: boolean) => void;
  className?: string;
  classNames?: {
    root?: string;
    header?: string;
    list?: string;
  };
}

/**
 * Explains the 3 physical hazard regimes: Floodplain, Char Belt, and River Channel.
 * Amber cells denote char erosion dynamics, slate cells are active channel reaches, and
 * the dashed amber line traces the char-belt corridor. Floodplain cells keep the main ramp.
 */
export const RegimeLegend: React.FC<RegimeLegendProps> = ({
  title = 'Hazard Regimes',
  visibleRegimes,
  onVisibleRegimesChange,
  className = '',
  classNames = {},
}) => {
  return (
    <div className={['flex flex-col gap-2', classNames.root ?? '', className].filter(Boolean).join(' ')}>
      <SectionHeader
        title={title}
        description="Stratified terrain dynamics across floodplains, sandbars, and channels."
        className={classNames.header}
      />
      <div className={['flex flex-col gap-1.5', classNames.list ?? ''].join(' ')}>
        <LegendSwatch
          color={SUSCEPTIBILITY_RAMP[2]}
          label={REGIME_LABELS.floodplain}
          meta="Flood"
          title={REGIME_DESCRIPTIONS.floodplain}
        />
        <LegendSwatch
          color={CHAR_BELT_RAMP[1]}
          label={REGIME_LABELS.char_belt}
          meta="Erosion"
          title={REGIME_DESCRIPTIONS.char_belt}
        />
        <LegendSwatch
          color={CHANNEL_COLOR}
          shape="outline"
          label={REGIME_LABELS.channel}
          meta="Not scored"
          title={REGIME_DESCRIPTIONS.channel}
        />
        <LegendSwatch
          color={CHAR_BELT_BOUNDARY_COLOR}
          shape="outline"
          label="Char-belt corridor"
          meta="Boundary"
          title="Dashed outline around the contiguous char-belt cells."
        />
      </div>
      {visibleRegimes && onVisibleRegimesChange ? (
        <RegimeToggle
          visible={visibleRegimes}
          onVisibleChange={onVisibleRegimesChange}
          className="mt-1 border-t border-line pt-2 dark:border-white/10"
        />
      ) : null}
    </div>
  );
};
