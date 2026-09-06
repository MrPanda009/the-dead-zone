'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ZoneId, REGIONAL_STORIES } from './storyData';
import { StoryDiscoverBadge } from './StoryDiscoverBadge';
import {
  HOTSPOT_LONLAT,
  INDIA_OUTLINE_PATHS,
  INDIA_VIEWBOX,
  projectLonLat,
} from './indiaOutline';
import { IndiaHotspotMarkers } from './IndiaHotspotMarkers';
import { IndiaDistrictOverlay } from './IndiaDistrictOverlay';
import { DISTRICT_BOUNDARIES } from './districtBoundaries';

export interface IndiaStoriesMapProps {
  /** Currently selected / pinned zone */
  selectedZone: ZoneId;
  /** Callback when user selects or pins a zone */
  onSelectZone: (zone: ZoneId) => void;
  /** Callback to trigger the slideshow for the active zone */
  onOpenSlideshow: (zone: ZoneId) => void;
  /** Custom root className */
  className?: string;
}

/**
 * Interactive India map rendered from the real Natural Earth 50m
 * national outline (mercator-fit to 800x900) with true administrative district
 * boundary focus cutouts.
 *
 * - Hovering over a district or marker previews its boundary and clipped cover photo.
 * - Clicking pins the zone as the active story hotspot.
 * - Cover-fit photographic imagery is rendered within each district's organic shape.
 */
export const IndiaStoriesMap: React.FC<IndiaStoriesMapProps> = ({
  selectedZone,
  onSelectZone,
  onOpenSlideshow,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredZone, setHoveredZone] = useState<ZoneId | null>(null);

  const displayedZone = hoveredZone ?? selectedZone;
  const activeStory = REGIONAL_STORIES[displayedZone];
  const activeDistrict = DISTRICT_BOUNDARIES[displayedZone];

  const hotspots = useMemo(
    () =>
      (Object.keys(HOTSPOT_LONLAT) as ZoneId[]).map((zone) => {
        const { lon, lat, label } = HOTSPOT_LONLAT[zone];
        const { x, y } = projectLonLat(lon, lat);
        return { zone, label, cx: x, cy: y };
      }),
    [],
  );

  const activeHotspot =
    hotspots.find((h) => h.zone === displayedZone) ?? hotspots[0];

  useGSAP(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      '.hotspot-pulse',
      { scale: 0.8, opacity: 0.8 },
      { scale: 1.8, opacity: 0, duration: 2, repeat: -1, ease: 'power1.out', stagger: 0.4 },
    );
  }, { scope: containerRef });

  const handleSelectZone = (zone: ZoneId) => {
    onSelectZone(zone);
    setHoveredZone(null);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center select-none ${className}`}
    >
      <svg
        viewBox={INDIA_VIEWBOX}
        className="w-full h-full max-h-[88vh] object-contain drop-shadow-lg dark:drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" className="text-[#95b8a6] dark:text-[#22543d]" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="100%" className="text-[#edf3ef] dark:text-[#0d231a]" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="400" cy="460" r="380" fill="url(#mapGlow)" />

        {/* --- TRUE INDIA NATIONAL OUTLINE (Natural Earth 50m) --- */}
        {INDIA_OUTLINE_PATHS.map((d, i) => (
          <path
            key={i}
            d={d}
            className="fill-[#cfe0d5] dark:fill-[#132b21] stroke-[#2d6a4f] dark:stroke-[#fef08a] transition-colors duration-300"
            fillOpacity="0.9"
            strokeOpacity="0.5"
            strokeWidth={i === 0 ? 1.6 : 1}
            strokeLinejoin="round"
          />
        ))}

        {/* --- ADMINISTRATIVE DISTRICT BOUNDARIES & CLIPPED PHOTOGRAPHIC FOCUS --- */}
        <IndiaDistrictOverlay
          selectedZone={selectedZone}
          hoveredZone={hoveredZone}
          onHoverZone={setHoveredZone}
          onSelectZone={handleSelectZone}
          previewImage={activeStory.previewImage}
        />

        {/* --- CARTOGRAPHIC LEADER LINE FROM BADGE TO ACTIVE DISTRICT --- */}
        {activeDistrict && (
          <line
            key={`line-${displayedZone}`}
            x1={activeDistrict.badge.x}
            y1={activeDistrict.badge.y}
            x2={activeHotspot.cx}
            y2={activeHotspot.cy}
            stroke="currentColor"
            strokeWidth="1.2"
            strokeDasharray="3 3"
            className="text-[#16a34a]/60 dark:text-[#fef08a]/60 pointer-events-none transition-all duration-300"
          />
        )}

        {/* --- HOTSPOT MARKERS --- */}
        <IndiaHotspotMarkers
          hotspots={hotspots}
          selectedZone={selectedZone}
          hoveredZone={hoveredZone}
          onSelectZone={handleSelectZone}
          onHoverZone={setHoveredZone}
        />

        {/* --- FLOATING "+ DISCOVER STORIES" BADGE IN MAP COORDINATE SPACE --- */}
        {activeDistrict && (
          <g
            key={`badge-group-${displayedZone}`}
            transform={`translate(${activeDistrict.badge.x}, ${activeDistrict.badge.y})`}
            className="transition-transform duration-300 ease-out"
          >
            <foreignObject
              x="-45"
              y="-45"
              width="90"
              height="90"
              className="overflow-visible pointer-events-auto"
            >
              <div className="w-full h-full flex items-center justify-center">
                <StoryDiscoverBadge
                  onClick={() => onOpenSlideshow(displayedZone)}
                  size={84}
                />
              </div>
            </foreignObject>
          </g>
        )}
      </svg>
    </div>
  );
};

export default IndiaStoriesMap;


