'use client';

import React from 'react';
import Image from 'next/image';
import { useTheme } from '@/components/providers';
import { AtmosphericMist } from '@/components/features/mist';
import type { AboutAtmosphereProps } from './types';

export const AboutAtmosphere: React.FC<AboutAtmosphereProps> = ({
  backdropUrl = '/images/about/about-backdrop.jpg',
  backdropOpacity = 0.85,
  enableMist = true,
  className = '',
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-0 pointer-events-none select-none overflow-hidden bg-bg-base transition-colors duration-500 ${className}`}
    >
      {/* Background Mountain Backdrop Image */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          isDark ? 'opacity-65' : 'opacity-85'
        }`}
        style={{ opacity: isDark ? 0.65 : backdropOpacity }}
      >
        <Image
          src={backdropUrl}
          alt="Himalayan mountainous terrain and atmospheric mist"
          fill
          priority
          sizes="100vw"
          className="object-cover object-right-top md:object-center"
        />
      </div>

      {/* Subtle Central Contrast Vignette (Keeps Content Pristine & Legible) */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          isDark
            ? 'bg-gradient-to-b from-black/50 via-transparent to-black/75'
            : 'bg-gradient-to-b from-white/30 via-transparent to-white/70'
        }`}
      />

      {/* Top Atmosphere Gradient (Subtle depth under header, theme-harmonized) */}
      <div
        className={`absolute top-0 inset-x-0 h-48 bg-gradient-to-b ${
          isDark
            ? 'from-[#06100c]/80 via-[#06100c]/40 to-transparent'
            : 'from-surface-0/60 via-surface-0/20 to-transparent'
        }`}
      />
      {/* Bottom Bleed Gradient */}
      <div className="absolute bottom-0 inset-x-0 h-56 bg-gradient-to-t from-bg-base via-bg-base/90 to-transparent" />

      {/* Atmospheric Mist Fog (Only active in Light Mode to preserve Daylight Sage aesthetic) */}
      {enableMist && !isDark && (
        <AtmosphericMist
          baseOpacity={0.42}
          imageUrl="/atmospheric-mist-transparent.png"
          className="pointer-events-none"
        />
      )}
    </div>
  );
};
