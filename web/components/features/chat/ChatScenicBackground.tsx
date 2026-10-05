'use client';

import { useTheme } from '@/components/providers';
import type { ChatScenicBackgroundProps } from './types';

/**
 * Scenic Mountain & Pine Valley Background with Topographic Contours and Birds.
 * Matches Image 2's atmospheric disaster-management landscape with Image 1's soft mint/sage palette.
 */
export const ChatScenicBackground: React.FC<ChatScenicBackgroundProps> = ({
  className = '',
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 w-full h-full pointer-events-none overflow-hidden select-none z-0 transition-colors duration-300 ${
        isDark ? 'bg-[#071912]' : 'bg-[#edf6f0]'
      } ${className}`}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 600 800"
      >
        <defs>
          {/* Sky Gradient */}
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={isDark ? '#051610' : '#f4faf6'}
              stopOpacity="1"
            />
            <stop
              offset="50%"
              stopColor={isDark ? '#092318' : '#eaf4ee'}
              stopOpacity="1"
            />
            <stop
              offset="100%"
              stopColor={isDark ? '#061a12' : '#edf6f0'}
              stopOpacity="1"
            />
          </linearGradient>

          {/* Distant Mountain Gradient */}
          <linearGradient id="distMtnGrad" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={isDark ? '#0d2d20' : '#d2ebd9'}
              stopOpacity={isDark ? '0.7' : '0.6'}
            />
            <stop
              offset="100%"
              stopColor={isDark ? '#092117' : '#e4f3ea'}
              stopOpacity={isDark ? '0.3' : '0.3'}
            />
          </linearGradient>

          {/* Mid Mountain Ridge Gradient */}
          <linearGradient id="midMtnGrad" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={isDark ? '#143c2c' : '#bfe0ca'}
              stopOpacity={isDark ? '0.85' : '0.75'}
            />
            <stop
              offset="100%"
              stopColor={isDark ? '#0a241a' : '#d7ece0'}
              stopOpacity={isDark ? '0.4' : '0.4'}
            />
          </linearGradient>

          {/* Lower Valley Mist Gradient */}
          <linearGradient id="valleyMistGrad" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={isDark ? '#071912' : '#edf6f0'}
              stopOpacity="0"
            />
            <stop
              offset="60%"
              stopColor={isDark ? '#071912' : '#edf6f0'}
              stopOpacity="0.8"
            />
            <stop
              offset="100%"
              stopColor={isDark ? '#071912' : '#edf6f0'}
              stopOpacity="0.98"
            />
          </linearGradient>
        </defs>

        {/* Base Sky */}
        <rect width="600" height="800" fill="url(#skyGrad)" />

        {/* Topographic Contour Curves in the Upper Half */}
        <g
          stroke={isDark ? '#164e37' : '#abd6be'}
          strokeWidth="1.2"
          fill="none"
          opacity={isDark ? '0.4' : '0.45'}
          strokeDasharray="4 2"
        >
          <path d="M-50,140 Q120,90 280,130 T650,110" />
          <path d="M-50,190 Q150,130 330,175 T650,150" />
          <path d="M-50,240 Q180,180 380,225 T650,200" />
          <path d="M-50,290 Q210,230 420,280 T650,250" />
          <path d="M-50,350 Q240,290 460,335 T650,310" />
        </g>

        {/* Subtle Tech Dot Grid in Top Right */}
        <g fill={isDark ? '#1b5a3e' : '#97c8aa'} opacity={isDark ? '0.35' : '0.3'}>
          {[480, 505, 530, 555, 580].map((x) =>
            [90, 115, 140, 165, 190].map((y) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" />
            ))
          )}
        </g>

        {/* Distant Flock of Flying Birds in Upper Right */}
        <g
          fill="none"
          stroke={isDark ? '#2d6d50' : '#699e7f'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={isDark ? '0.6' : '0.65'}
        >
          {/* Bird 1 */}
          <path d="M430,190 Q435,184 440,190 Q445,184 450,190" />
          {/* Bird 2 */}
          <path d="M455,200 Q459,195 463,200 Q467,195 471,200" />
          {/* Bird 3 */}
          <path d="M478,212 Q482,207 486,212 Q490,207 494,212" />
          {/* Bird 4 */}
          <path d="M500,226 Q503,222 506,226 Q509,222 512,226" />
        </g>

        {/* Distant Mountain Ridges */}
        <path
          d="M0,450 Q90,380 200,410 T420,385 T600,420 L600,800 L0,800 Z"
          fill="url(#distMtnGrad)"
        />

        {/* Midground Rolling Hills & Ridges */}
        <path
          d="M0,490 Q120,440 260,470 Q400,430 520,480 Q570,470 600,490 L600,800 L0,800 Z"
          fill="url(#midMtnGrad)"
        />

        {/* Left Flank Pine Trees Silhouette */}
        <g fill={isDark ? '#103827' : '#73a587'} opacity={isDark ? '0.85' : '0.75'}>
          {/* Tree 1 (Large left) */}
          <polygon points="40,390 25,430 33,430 18,470 28,470 12,520 68,520 52,470 62,470 47,430 55,430" />
          <rect x="37" y="520" width="6" height="50" fill={isDark ? '#0d2e20' : '#59856a'} />

          {/* Tree 2 (Mid left) */}
          <polygon points="85,420 72,455 79,455 66,490 75,490 60,535 110,535 95,490 104,490 91,455 98,455" />
          <rect x="82" y="535" width="6" height="40" fill={isDark ? '#0d2e20' : '#59856a'} />

          {/* Tree 3 (Smaller outer left) */}
          <polygon points="12,430 2,465 8,465 0,500 24,500 16,465 22,465" />
          <rect x="10" y="500" width="4" height="40" fill={isDark ? '#0d2e20' : '#59856a'} />

          {/* Tree 4 (Distant left) */}
          <polygon points="135,460 125,490 130,490 120,525 150,525 140,490 145,490" />
        </g>

        {/* Right Flank Pine Trees Silhouette */}
        <g fill={isDark ? '#103827' : '#73a587'} opacity={isDark ? '0.85' : '0.75'}>
          {/* Tree 1 (Large right) */}
          <polygon points="560,400 545,440 553,440 538,480 548,480 532,530 588,530 572,480 582,480 567,440 575,440" />
          <rect x="557" y="530" width="6" height="50" fill={isDark ? '#0d2e20' : '#59856a'} />

          {/* Tree 2 (Mid right) */}
          <polygon points="515,435 504,470 510,470 498,505 506,505 494,545 536,545 524,505 532,505 520,470 526,470" />
          <rect x="512" y="545" width="6" height="40" fill={isDark ? '#0d2e20' : '#59856a'} />

          {/* Tree 3 (Distant right) */}
          <polygon points="465,470 457,498 461,498 452,530 478,530 469,498 473,498" />
        </g>

        {/* Foreground Valley Mist to seamlessly blend behind the suggestions/chat */}
        <rect y="440" width="600" height="360" fill="url(#valleyMistGrad)" />
      </svg>
    </div>
  );
};

export default ChatScenicBackground;
