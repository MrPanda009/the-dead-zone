import type { CSSProperties } from 'react';

export type HexMarkerSize = 'xs' | 'sm' | 'md' | 'lg';

export interface HexMarkerProps {
  size?: HexMarkerSize;
  /** Tailwind background class, e.g. `bg-citron`. Ignored when `color` is set. */
  colorClass?: string;
  /** Any CSS colour, for markers coloured from data (legend swatches). */
  color?: string;
  className?: string;
}

const HEX_CLIP_PATH = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

const SIZE_CLASSES: Record<HexMarkerSize, string> = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-4 h-4',
};

/** Small hexagonal bullet used across the stats screens in place of circular dots. */
export const HexMarker = ({
  size = 'sm',
  colorClass = 'bg-citron',
  color,
  className = '',
}: HexMarkerProps) => {
  const style: CSSProperties = { clipPath: HEX_CLIP_PATH };
  if (color) style.backgroundColor = color;

  return (
    <span
      aria-hidden
      className={['inline-block shrink-0', SIZE_CLASSES[size], color ? '' : colorClass, className]
        .filter(Boolean)
        .join(' ')}
      style={style}
    />
  );
};
