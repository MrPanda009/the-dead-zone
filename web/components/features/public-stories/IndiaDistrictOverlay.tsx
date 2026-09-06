'use client';

import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { ZoneId } from './storyData';
import { DISTRICT_BOUNDARIES } from './districtBoundaries';

export interface IndiaDistrictOverlayProps {
  /** Currently pinned / selected story zone */
  selectedZone: ZoneId;
  /** Currently hovered story zone for preview (null if not hovering) */
  hoveredZone?: ZoneId | null;
  /** Callback triggered when user hovers over a district */
  onHoverZone?: (zone: ZoneId | null) => void;
  /** Callback triggered when user clicks to pin a district */
  onSelectZone: (zone: ZoneId) => void;
  /** Image URL to display inside the active district boundary */
  previewImage: string;
  /** Optional root className for SVG group */
  className?: string;
}

/**
 * Renders the 5 story administrative district outlines across India.
 *
 * Replaces generic circular cutouts with true geographic district boundaries.
 * - Non-active districts display subtle cartographic borders and respond to hover.
 * - Hovering previews the district boundary and reveals its cover-fitted photograph.
 * - Clicking permanently pins the story zone.
 * - Photographic images are cleanly clipped inside the district SVG path.
 */
export const IndiaDistrictOverlay: React.FC<IndiaDistrictOverlayProps> = ({
  selectedZone,
  hoveredZone = null,
  onHoverZone,
  onSelectZone,
  previewImage,
  className = '',
}) => {
  const containerRef = useRef<SVGGElement>(null);
  const displayedZone = hoveredZone ?? selectedZone;
  const activeDistrict = DISTRICT_BOUNDARIES[displayedZone];

  useGSAP(
    () => {
      if (!containerRef.current) return;
      gsap.fromTo(
        '.district-image-layer',
        { opacity: 0.2, scale: 0.98, transformOrigin: 'center' },
        { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' },
      );
    },
    { scope: containerRef, dependencies: [displayedZone] },
  );

  return (
    <g ref={containerRef} className={`district-overlay-group ${className}`}>
      <defs>
        {/* District polygon clipPaths for photographic image masking */}
        {(Object.keys(DISTRICT_BOUNDARIES) as ZoneId[]).map((zone) => {
          const district = DISTRICT_BOUNDARIES[zone];
          return (
            <clipPath key={district.zone} id={`clip-district-${district.zone}`}>
              <path d={district.d} />
            </clipPath>
          );
        })}

        {/* Outer contour glow filter for active boundary */}
        <filter id="districtContourGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation="3"
            floodColor="currentColor"
            floodOpacity="0.6"
          />
        </filter>
      </defs>

      {/* Layer 1: Base district polygon outlines and hoverable hit targets */}
      {(Object.keys(DISTRICT_BOUNDARIES) as ZoneId[]).map((zone) => {
        const district = DISTRICT_BOUNDARIES[zone];
        const isSelected = zone === selectedZone;
        const isHovered = zone === hoveredZone;
        const isDisplayed = zone === displayedZone;

        return (
          <g
            key={district.zone}
            className="cursor-pointer group"
            onClick={() => onSelectZone(district.zone)}
            onMouseEnter={() => onHoverZone?.(district.zone)}
            onMouseLeave={() => onHoverZone?.(null)}
          >
            {/* Expanded transparent hit area for easy hover/click interaction */}
            <path
              d={district.d}
              fill="transparent"
              stroke="transparent"
              strokeWidth="10"
              strokeLinejoin="round"
            />

            {/* Visual boundary polygon */}
            <path
              d={district.d}
              className={`transition-all duration-300 ${
                isDisplayed
                  ? 'fill-transparent'
                  : 'fill-[#16a34a]/10 dark:fill-[#fef08a]/10 hover:fill-[#16a34a]/25 dark:hover:fill-[#fef08a]/20 stroke-[#2d6a4f]/40 dark:stroke-[#fef08a]/35 hover:stroke-[#16a34a] dark:hover:stroke-[#fef08a]'
              }`}
              strokeWidth={isDisplayed ? 0 : 1.2}
              strokeDasharray={isSelected ? undefined : '2 2'}
              strokeLinejoin="round"
            />
          </g>
        );
      })}

      {/* Layer 2: Clipped Photographic Image Cover-Fitted to Active District */}
      {activeDistrict && (
        <g
          clipPath={`url(#clip-district-${displayedZone})`}
          className="district-image-layer pointer-events-none transition-all duration-300"
        >
          <image
            href={previewImage}
            x={activeDistrict.bbox.x}
            y={activeDistrict.bbox.y}
            width={activeDistrict.bbox.width}
            height={activeDistrict.bbox.height}
            preserveAspectRatio="xMidYMid slice"
            className="opacity-95 contrast-110 saturate-110 filter drop-shadow-md"
          />
        </g>
      )}

      {/* Layer 3: High-contrast Glowing Perimeter Stroke on Active District */}
      {activeDistrict && (
        <g className="pointer-events-none transition-all duration-300">
          {/* Subtle halo stroke */}
          <path
            d={activeDistrict.d}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinejoin="round"
            className="text-[#16a34a]/30 dark:text-[#fef08a]/30"
          />
          {/* Sharp focused outline */}
          <path
            d={activeDistrict.d}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinejoin="round"
            className="text-[#16a34a] dark:text-[#fef08a]"
          />
        </g>
      )}
    </g>
  );
};

export default IndiaDistrictOverlay;
