import React from 'react';
import { SpriteLayer } from './SpriteLayer';
import {
  PTERODACTYL_BODY,
  PTERODACTYL_EARTH,
  PTERODACTYL_EARTH_ORIGIN,
  PTERODACTYL_SPRITE_SIZE,
  PTERODACTYL_WING_FRAMES,
} from './pterodactylSprite.data';

const { width: W, height: H } = PTERODACTYL_SPRITE_SIZE;

export interface PterodactylSpriteProps {
  /** Screen pixels per art-pixel (integers keep the art crisp) */
  pixelScale?: number;
  /** Wing frame visible on first paint (0 = up-stroke … 4 = down-stroke) */
  initialFrame?: number;
  /** Render the carried Earth layer */
  showEarth?: boolean;
  /** Accessible label for the artwork */
  label?: string;
  /** Additional CSS classes for the root element */
  className?: string;
  /** Granular styling overrides for inner elements */
  classNames?: {
    root?: string;
    body?: string;
    earth?: string;
  };
}

/**
 * Pure presentational pixel-art pterodactyl carrying the Earth.
 *
 * Animation hooks (consumed by `PterodactylFlyby`):
 * - `[data-ptero-frame="n"]` — wing frames, toggle `visibility`
 * - `[data-ptero-body]`      — creature layer (lift / bob)
 * - `[data-ptero-earth]`     — detachable Earth layer (drop)
 */
export const PterodactylSprite: React.FC<PterodactylSpriteProps> = ({
  pixelScale = 3,
  initialFrame = 0,
  showEarth = true,
  label = 'Pixel-art pterodactyl carrying the Earth',
  className = '',
  classNames = {},
}) => {
  const width = W * pixelScale;
  const height = H * pixelScale;
  const earthOrigin = `${(PTERODACTYL_EARTH_ORIGIN.x / W) * 100}% ${(PTERODACTYL_EARTH_ORIGIN.y / H) * 100}%`;

  return (
    <div
      role="img"
      aria-label={label}
      className={`relative select-none ${className} ${classNames.root ?? ''}`}
      style={{ width, height }}
    >
      <svg
        data-ptero-body
        viewBox={`0 0 ${W} ${H}`}
        width={width}
        height={height}
        shapeRendering="crispEdges"
        className={`absolute inset-0 overflow-visible ${classNames.body ?? ''}`}
        aria-hidden
      >
        <SpriteLayer paths={PTERODACTYL_BODY} />
        {PTERODACTYL_WING_FRAMES.map((frame, i) => (
          <SpriteLayer
            key={i}
            paths={frame}
            data-ptero-frame={i}
            visibility={i === initialFrame ? 'visible' : 'hidden'}
          />
        ))}
      </svg>

      {showEarth && (
        <div
          data-ptero-earth
          className={`absolute inset-0 ${classNames.earth ?? ''}`}
          style={{ transformOrigin: earthOrigin }}
        >
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width={width}
            height={height}
            shapeRendering="crispEdges"
            className="overflow-visible"
            aria-hidden
          >
            <SpriteLayer paths={PTERODACTYL_EARTH} />
          </svg>
        </div>
      )}
    </div>
  );
};
