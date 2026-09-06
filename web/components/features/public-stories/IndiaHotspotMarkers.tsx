'use client';

import React from 'react';
import type { ZoneId } from './storyData';

export interface HotspotPoint {
  /** Story zone this hotspot belongs to */
  zone: ZoneId;
  /** Human-readable hotspot label */
  label: string;
  /** SVG x in the 800x900 viewBox space */
  cx: number;
  /** SVG y in the 800x900 viewBox space */
  cy: number;
}

export interface IndiaHotspotMarkersProps {
  /** Projected hotspot points (from real lon/lat) */
  hotspots: HotspotPoint[];
  /** Currently selected zone */
  selectedZone: ZoneId;
  /** Callback when user selects or hovers a hotspot */
  onSelectZone: (zone: ZoneId) => void;
  /** Additional className for the markers group */
  className?: string;
}

/**
 * Interactive hotspot markers (pulsing ring + tactile dot).
 * Positions come from true WGS84 lon/lat via `projectLonLat`,
 * so dots sit on the real geography — not a stylised blob.
 */
export const IndiaHotspotMarkers: React.FC<IndiaHotspotMarkersProps> = ({
  hotspots,
  selectedZone,
  onSelectZone,
  className = '',
}) => (
  <g className={className}>
    {hotspots.map((hotspot) => {
      const isSelected = hotspot.zone === selectedZone;
      return (
        <g
          key={hotspot.zone}
          onClick={() => onSelectZone(hotspot.zone)}
          onMouseEnter={() => onSelectZone(hotspot.zone)}
          className="cursor-pointer group"
        >
          <circle
            cx={hotspot.cx}
            cy={hotspot.cy}
            r="16"
            fill="none"
            stroke={isSelected ? '#16a34a' : 'currentColor'}
            className="hotspot-pulse text-[#2d6a4f] dark:text-[#fef08a]"
            strokeWidth="1.5"
          />
          <circle
            cx={hotspot.cx}
            cy={hotspot.cy}
            r={isSelected ? 6.5 : 5}
            fill={isSelected ? '#16a34a' : 'currentColor'}
            className="text-[#2d6a4f] dark:text-[#fef08a] transition-all duration-200 shadow-md group-hover:scale-125"
          />
        </g>
      );
    })}
  </g>
);

export default IndiaHotspotMarkers;
