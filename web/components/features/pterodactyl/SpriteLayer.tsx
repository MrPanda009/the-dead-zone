import React from 'react';
import type { SpritePath } from './pterodactylSprite.data';

export interface SpriteLayerProps extends Omit<React.SVGProps<SVGGElement>, 'children'> {
  /** Merged pixel paths to render */
  paths: readonly SpritePath[];
  /** Optional colour remap (source hex -> replacement), e.g. for alt skins */
  colorMap?: Readonly<Record<string, string>>;
  /** Additional CSS classes for the `<g>` element */
  className?: string;
}

/** Pure presentational `<g>` of crisp pixel-art paths. */
export const SpriteLayer: React.FC<SpriteLayerProps> = ({
  paths,
  colorMap,
  className = '',
  ...rest
}) => (
  <g className={className} {...rest}>
    {paths.map((p) => (
      <path key={p.fill} fill={colorMap?.[p.fill] ?? p.fill} d={p.d} />
    ))}
  </g>
);
