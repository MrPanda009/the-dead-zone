import type { ReactNode } from 'react';

import type { HazardRegime } from '@/lib/api/types';
import { REGIME_DESCRIPTIONS, REGIME_ICONS, REGIME_LABELS } from '@/lib/map/constants';

export type RegimeChipSize = 'sm' | 'md';

export interface RegimeChipProps {
  regime: HazardRegime;
  /** Overrides the default regime label. */
  label?: ReactNode;
  /** Overrides the default regime icon; pass `null` to hide it. */
  leftIcon?: ReactNode | null;
  /** Hides the text so only the icon shows; the title tooltip still names the regime. */
  showLabel?: boolean;
  /** Trailing slot, e.g. a cell count. */
  rightSlot?: ReactNode;
  size?: RegimeChipSize;
  /** Native tooltip; defaults to the regime description. */
  title?: string;
  className?: string;
  classNames?: {
    root?: string;
    icon?: string;
    label?: string;
  };
}

const VARIANT_CLASSES: Record<HazardRegime, string> = {
  floodplain:
    'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  char_belt: 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400',
  channel: 'border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-400',
};

const SIZE_CLASSES: Record<RegimeChipSize, string> = {
  sm: 'gap-1 px-1.5 py-0.5 text-[9px]',
  md: 'gap-1.5 px-2 py-1 text-[10px]',
};

/** Compact pill naming a cell's hazard regime. Colour families match the map. */
export const RegimeChip = ({
  regime,
  label,
  leftIcon,
  rightSlot,
  showLabel = true,
  size = 'sm',
  title,
  className = '',
  classNames = {},
}: RegimeChipProps) => {
  const icon =
    leftIcon === undefined ? (
      <span aria-hidden className="material-symbols-outlined text-[1.1em] leading-none">
        {REGIME_ICONS[regime]}
      </span>
    ) : (
      leftIcon
    );

  return (
    <span
      title={title ?? `${REGIME_LABELS[regime]}: ${REGIME_DESCRIPTIONS[regime]}`}
      data-regime={regime}
      className={[
        'inline-flex items-center rounded border font-mono font-semibold uppercase tracking-wider',
        VARIANT_CLASSES[regime],
        SIZE_CLASSES[size],
        classNames.root ?? '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {icon ? <span className={classNames.icon ?? ''}>{icon}</span> : null}
      {showLabel ? (
        <span className={classNames.label ?? ''}>{label ?? REGIME_LABELS[regime]}</span>
      ) : null}
      {rightSlot}
    </span>
  );
};
