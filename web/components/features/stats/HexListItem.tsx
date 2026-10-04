import type { ReactNode } from 'react';

import { HexMarker } from '@/components/common/HexMarker';

export interface HexListItemProps {
  children: ReactNode;
  /** Tailwind background class for the bullet. */
  markerClassName?: string;
  className?: string;
  classNames?: {
    root?: string;
    marker?: string;
  };
}

/** A list line with a hexagonal bullet. */
export const HexListItem = ({
  children,
  markerClassName = 'bg-text-muted',
  className = '',
  classNames = {},
}: HexListItemProps) => (
  <li className={['flex items-start gap-1.5', classNames.root ?? '', className].filter(Boolean).join(' ')}>
    <HexMarker size="xs" colorClass={markerClassName} className={['mt-1', classNames.marker ?? ''].join(' ')} />
    <span>{children}</span>
  </li>
);
