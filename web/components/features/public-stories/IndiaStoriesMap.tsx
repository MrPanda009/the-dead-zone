'use client';

import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ZoneId, REGIONAL_STORIES } from './storyData';
import { StoryDiscoverBadge } from './StoryDiscoverBadge';

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

// Region polygon coordinates mapped to viewBox 0 0 800 900
const REGION_BOUNDS: Record<ZoneId, { x: number; y: number; width: number; height: number; clipPath: string }> = {
  North: {
    x: 270,
    y: 80,
    width: 220,
    height: 190,
    clipPath: 'M 280,100 L 330,80 L 400,90 L 470,120 L 480,170 L 440,210 L 370,240 L 300,210 Z',
  },
  Central: {
    x: 320,
    y: 350,
    width: 230,
    height: 180,
    clipPath: 'M 330,370 L 420,350 L 520,380 L 540,460 L 480,510 L 390,520 L 330,470 Z',
  },
  South: {
    x: 340,
    y: 570,
    width: 180,
    height: 250,
    clipPath: 'M 350,580 L 450,570 L 470,680 L 440,790 L 410,810 L 370,720 Z',
  },
  East: {
    x: 520,
    y: 280,
    width: 240,
    height: 180,
    clipPath: 'M 530,320 L 610,290 L 730,290 L 750,370 L 670,430 L 560,420 Z',
  },
  West: {
    x: 160,
    y: 280,
    width: 210,
    height: 220,
    clipPath: 'M 190,300 L 310,290 L 330,400 L 290,480 L 190,470 L 170,390 Z',
  },
};

// Hotspot centers corresponding to the PRD habitations
const HOTSPOTS: { zone: ZoneId; label: string; cx: number; cy: number }[] = [
  { zone: 'North', label: 'Joshimath (Chamoli)', cx: 375, cy: 165 },
  { zone: 'Central', label: 'Satpura Plateau', cx: 430, cy: 440 },
  { zone: 'South', label: 'Wayanad (Meppadi)', cx: 405, cy: 700 },
  { zone: 'East', label: 'Barpeta & Teesta', cx: 635, cy: 355 },
  { zone: 'West', label: 'Kutch Basin', cx: 250, cy: 385 },
];

export const IndiaStoriesMap: React.FC<IndiaStoriesMapProps> = ({
  selectedZone,
  onSelectZone,
  onOpenSlideshow,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRegion = REGION_BOUNDS[selectedZone];
  const activeStory = REGIONAL_STORIES[selectedZone];
  const activeHotspot = HOTSPOTS.find((h) => h.zone === selectedZone) || HOTSPOTS[1];

  useGSAP(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      '.hotspot-pulse',
      { scale: 0.8, opacity: 0.8 },
      { scale: 1.8, opacity: 0, duration: 2, repeat: -1, ease: 'power1.out', stagger: 0.4 }
    );
  }, { scope: containerRef });

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center select-none ${className}`}
    >
      <svg
        viewBox="0 0 800 900"
        className="w-full h-full max-h-[88vh] object-contain drop-shadow-lg dark:drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Subtle Ambient Radial Glow for India */}
          <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" className="text-[#95b8a6] dark:text-[#22543d]" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="100%" className="text-[#edf3ef] dark:text-[#0d231a]" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>

          {/* Active Region Clip Paths */}
          {Object.entries(REGION_BOUNDS).map(([zone, bounds]) => (
            <clipPath key={zone} id={`clip-${zone}`}>
              <path d={bounds.clipPath} />
            </clipPath>
          ))}
        </defs>

        {/* Ambient Map Glow Background */}
        <circle cx="430" cy="460" r="380" fill="url(#mapGlow)" />

        {/* --- MAIN INDIA NATIONAL OUTLINE --- */}
        <path
          d="M 330,85 
             C 340,65 370,55 400,65 
             C 430,75 470,110 480,140 
             C 490,165 470,195 460,215 
             C 490,210 540,215 570,225 
             C 610,230 630,220 660,225 
             C 710,235 770,260 760,310 
             C 750,340 700,355 670,360 
             C 630,370 590,365 570,380 
             C 560,400 580,450 560,490 
             C 540,530 500,580 480,630 
             C 460,680 430,750 410,810 
             C 390,750 370,680 360,620 
             C 350,570 330,530 310,490 
             C 280,485 240,495 210,470 
             C 170,440 180,380 200,340 
             C 220,300 270,280 290,240 
             C 305,200 295,160 300,120 Z"
          className="fill-[#cfe0d5] dark:fill-[#132b21] stroke-[#2d6a4f] dark:stroke-[#fef08a] transition-colors duration-300"
          fillOpacity="0.9"
          strokeOpacity="0.5"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        {/* --- INTERNAL STATE BOUNDARIES (Subtle Cartographic Lines) --- */}
        <g className="stroke-[#2d6a4f]/50 dark:stroke-[#fef08a]/25" strokeWidth="1" fill="none" strokeDasharray="3 3">
          {/* North Borders */}
          <path d="M 300,180 Q 360,210 440,190" />
          <path d="M 340,240 Q 420,230 460,260" />
          {/* West & Rajasthan */}
          <path d="M 240,310 Q 320,330 360,340" />
          <path d="M 210,410 Q 280,390 340,420" />
          {/* Central & MP Borders */}
          <path d="M 340,420 Q 430,390 530,410" />
          <path d="M 320,500 Q 420,530 520,490" />
          {/* East / Bengal / Assam Corridor */}
          <path d="M 520,360 Q 580,320 670,340" />
          <path d="M 570,380 Q 640,410 710,380" />
          {/* South Peninsula Interior */}
          <path d="M 350,580 Q 410,590 480,560" />
          <path d="M 370,680 Q 420,670 450,650" />
        </g>

        {/* --- PHOTOGRAPHIC MASK CUTOUT FOR ACTIVE REGION (Reference Image 2 Hero) --- */}
        <g clipPath={`url(#clip-${selectedZone})`} className="transition-all duration-500">
          <image
            href={activeStory.previewImage}
            x={activeRegion.x - 20}
            y={activeRegion.y - 20}
            width={activeRegion.width + 40}
            height={activeRegion.height + 40}
            preserveAspectRatio="xMidYMid slice"
            className="opacity-95 contrast-110 saturate-110 filter drop-shadow-md"
          />
          {/* Fine gold border tracing the cutout area */}
          <path
            d={activeRegion.clipPath}
            fill="none"
            className="stroke-[#2d6a4f] dark:stroke-[#fef08a]"
            strokeWidth="2.2"
            strokeOpacity="0.8"
          />
        </g>

        {/* --- INTERACTIVE HOTSPOT MARKERS --- */}
        {HOTSPOTS.map((hotspot) => {
          const isSelected = hotspot.zone === selectedZone;
          return (
            <g
              key={hotspot.zone}
              onClick={() => onSelectZone(hotspot.zone)}
              onMouseEnter={() => onSelectZone(hotspot.zone)}
              className="cursor-pointer group"
            >
              {/* Pulsing Outer Ring */}
              <circle
                cx={hotspot.cx}
                cy={hotspot.cy}
                r="16"
                fill="none"
                stroke={isSelected ? '#16a34a' : 'currentColor'}
                className="hotspot-pulse text-[#2d6a4f] dark:text-[#fef08a]"
                strokeWidth="1.5"
              />

              {/* Solid Tactile Dot */}
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

        {/* Andaman & Nicobar Islands Cartographic Inset */}
        <g className="stroke-[#2d6a4f]/70 dark:stroke-[#fef08a]/40 fill-[#cfe0d5] dark:fill-[#132b21]" strokeWidth="1.2">
          <ellipse cx="680" cy="680" rx="3" ry="12" />
          <ellipse cx="682" cy="710" rx="2.5" ry="8" />
          <ellipse cx="684" cy="740" rx="3" ry="14" />
          <circle cx="678" cy="775" r="3" />
        </g>
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
