import type { ReactNode } from 'react';

import { NOT_AVAILABLE_DESCRIPTION, NOT_AVAILABLE_LABEL } from '@/lib/stats/copy';

import { StatTile, type StatTileProps } from './StatTile';

export interface UnavailableStatTileProps extends Omit<StatTileProps, 'value' | 'caption'> {
  unavailableLabel?: ReactNode;
  description?: ReactNode;
}

/**
 * A tile for a figure we have no data source for. It says so, instead of showing a
 * plausible-looking number.
 */
export const UnavailableStatTile = ({
  unavailableLabel = NOT_AVAILABLE_LABEL,
  description = NOT_AVAILABLE_DESCRIPTION,
  valueClassName = 'text-text-muted',
  ...rest
}: UnavailableStatTileProps) => (
  <StatTile
    {...rest}
    value={<span className="text-[11px] font-medium">{unavailableLabel}</span>}
    caption={description}
    valueClassName={valueClassName}
  />
);
