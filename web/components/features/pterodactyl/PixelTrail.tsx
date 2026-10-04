import React from 'react';

export interface PixelTrailProps {
  /** Number of trailing pixel specks */
  count?: number;
  /** Speck size in screen pixels */
  size?: number;
  /** Speck colours (cycled) */
  colors?: readonly string[];
  /** Emitter position inside the parent, as CSS percentages */
  origin?: { left: string; top: string };
  /** Additional CSS classes for the root element */
  className?: string;
  /** Granular styling overrides */
  classNames?: { root?: string; speck?: string };
}

/**
 * Static pixel specks positioned at the bird's tail. `PterodactylFlyby` animates
 * every `[data-ptero-speck]` into a drifting, fading speed trail.
 */
export const PixelTrail: React.FC<PixelTrailProps> = ({
  count = 4,
  size = 2,
  colors = ['#b5d35a', '#85b12b', '#d1e67d'],
  origin = { left: '30%', top: '74%' },
  className = '',
  classNames = {},
}) => (
  <div
    aria-hidden
    className={`pointer-events-none absolute ${className} ${classNames.root ?? ''}`}
    style={{ left: origin.left, top: origin.top }}
  >
    {Array.from({ length: count }, (_, i) => (
      <span
        key={i}
        data-ptero-speck
        className={`absolute block opacity-0 ${classNames.speck ?? ''}`}
        style={{ width: size, height: size, background: colors[i % colors.length] }}
      />
    ))}
  </div>
);
