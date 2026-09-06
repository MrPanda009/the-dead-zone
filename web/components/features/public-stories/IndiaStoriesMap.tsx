'use client';

import React, { useMemo, useRef } from 'react';
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

export interface IndiaStoriesMapProps {
  /** Currently selected zone */
  selectedZone: ZoneId;
  /** Callback when user selects or hovers over a zone */
  onSelectZone: (zone: ZoneId) => void;
  /** Callback to trigger the slideshow for the active zone */
  onOpenSlideshow: (zone: ZoneId) => void;
  /** Custom root className */
  className?: string;
}

/** Radius (SVG px) of the photographic focus cutout around each hotspot. */
const FOCUS_RADIUS = 105;

/**
 * Interactive India map rendered from the real Natural Earth 50m
 * national outline (mercator-fit to 800x900). Hotspots are projected
 * from true WGS84 lon/lat, so Joshimath, Kutch, Wayanad, Barpeta and
 * Satpura sit where they belong — including the Gujarat jut, the
 * Kanyakumari taper and the Northeast corridor.
 */
export const IndiaStoriesMap: React.FC<IndiaStoriesMapProps> = ({
  selectedZone,
  onSelectZone,
  onOpenSlideshow,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeStory = REGIONAL_STORIES[selectedZone];

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
    hotspots.find((h) => h.zone === selectedZone) ?? hotspots[0];

  useGSAP(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      '.hotspot-pulse',
      { scale: 0.8, opacity: 0.8 },
      { scale: 1.8, opacity: 0, duration: 2, repeat: -1, ease: 'power1.out', stagger: 0.4 },
    );
  }, { scope: containerRef });

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

          {/* Circular photographic focus cutouts centred on true hotspot locations */}
          {hotspots.map((h) => (
            <clipPath key={h.zone} id={`clip-${h.zone}`}>
              <circle cx={h.cx} cy={h.cy} r={FOCUS_RADIUS} />
            </clipPath>
          ))}
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

        {/* --- PHOTOGRAPHIC FOCUS CUTOUT FOR ACTIVE REGION --- */}
        <g clipPath={`url(#clip-${selectedZone})`} className="transition-all duration-500">
          <image
            href={activeStory.previewImage}
            x={activeHotspot.cx - FOCUS_RADIUS - 12}
            y={activeHotspot.cy - FOCUS_RADIUS - 12}
            width={(FOCUS_RADIUS + 12) * 2}
            height={(FOCUS_RADIUS + 12) * 2}
            preserveAspectRatio="xMidYMid slice"
            className="opacity-95 contrast-110 saturate-110 filter drop-shadow-md"
          />
          <circle
            cx={activeHotspot.cx}
            cy={activeHotspot.cy}
            r={FOCUS_RADIUS}
            fill="none"
            className="stroke-[#2d6a4f] dark:stroke-[#fef08a]"
            strokeWidth="2.2"
            strokeOpacity="0.8"
          />
        </g>

        <IndiaHotspotMarkers
          hotspots={hotspots}
          selectedZone={selectedZone}
          onSelectZone={onSelectZone}
        />
      </svg>

      {/* --- FLOATING "+ DISCOVER STORIES" CIRCULAR BADGE OVER ACTIVE REGION --- */}
      <div
        className="absolute pointer-events-auto transition-all duration-500 transform -translate-x-1/2 -translate-y-1/2 z-20"
        style={{
          left: `${(activeHotspot.cx / 800) * 100}%`,
          top: `${(activeHotspot.cy / 900) * 100}%`,
        }}
      >
        <StoryDiscoverBadge
          onClick={() => onOpenSlideshow(selectedZone)}
          size={90}
        />
      </div>
    </div>
  );
};

export default IndiaStoriesMap;
