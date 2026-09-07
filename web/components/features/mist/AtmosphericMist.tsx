'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useTheme } from '@/components/providers';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import { AtmosphericMistProps } from './types';

/**
 * AtmosphericMist
 *
 * Lightly applies the atmospheric mist artifact surrounding the website perimeter
 * in Light Mode (Daylight Sage theme), framing the hero typography and 3D globe.
 *
 * As the user scrolls down, GSAP smoothly disperses the mist outward (scaling up,
 * drifting, and fading to zero opacity) into the triage data view.
 * Strictly inactive / hidden in Dark Mode (Night Forest theme).
 */
export const AtmosphericMist: React.FC<AtmosphericMistProps> = ({
  scrollProgress = 0,
  imageUrl = '/atmospheric-mist-transparent.png',
  baseOpacity = 0.55,
  intensity,
  dispersionThreshold = 0.22,
  dispersionScale = 1.15,
  dispersionY = -30,
  blendMode = 'normal',
  className = '',
  classNames,
  animation = {},
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const prefersReducedMotion = usePrefersReducedMotion();
  const isLight = resolvedTheme === 'light';
  const effectiveOpacity = intensity ?? baseOpacity;

  const {
    enableFloatingDrift = true,
    driftDuration = 14,
    driftOffset = 8,
  } = animation;

  // Responsive GSAP dispersion animation on scroll & ambient breathing
  useGSAP(
    () => {
      if (!containerRef.current) return;

      if (!isLight) {
        gsap.to('.mist-wrapper', {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto',
        });
        return;
      }

      // Smooth dispersion calculation: 0 = fully visible, 1 = fully dispersed
      const raw = Math.min(1.0, Math.max(0.0, scrollProgress / dispersionThreshold));
      const dispersion = raw * raw * (3 - 2 * raw); // Smooth easeInOut curve

      const targetOpacity = Math.max(0, (1.0 - dispersion) * effectiveOpacity);
      const targetScale = prefersReducedMotion ? 1.0 : 1.0 + dispersion * (dispersionScale - 1.0);
      const targetY = prefersReducedMotion ? 0 : dispersion * dispersionY;

      gsap.to('.mist-wrapper', {
        opacity: targetOpacity,
        scale: targetScale,
        y: targetY,
        duration: 0.4,
        ease: 'power2.out',
        overwrite: 'auto',
      });

      // Subtle ambient floating / breathing microinteraction when near hero
      if (enableFloatingDrift && !prefersReducedMotion && dispersion < 0.5) {
        gsap.to('.mist-image', {
          y: driftOffset,
          x: -driftOffset * 0.6,
          duration: driftDuration,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          overwrite: false,
        });
      }
    },
    {
      scope: containerRef,
      dependencies: [
        scrollProgress,
        isLight,
        effectiveOpacity,
        dispersionThreshold,
        dispersionScale,
        dispersionY,
        prefersReducedMotion,
        enableFloatingDrift,
        driftDuration,
        driftOffset,
      ],
    }
  );

  // Hidden in dark mode
  if (!isLight) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none z-[1] overflow-hidden select-none transition-opacity duration-300 ${className} ${classNames?.root ?? ''}`}
    >
      <div
        className={`mist-wrapper relative w-full h-full will-change-transform will-change-opacity ${classNames?.wrapper ?? ''}`}
        style={{
          opacity: effectiveOpacity,
          transformOrigin: 'center 40%',
        }}
      >
        <Image
          src={imageUrl}
          alt=""
          fill
          priority
          sizes="100vw"
          className={`mist-image object-cover object-center scale-105 pointer-events-none select-none ${classNames?.image ?? ''}`}
          style={{
            mixBlendMode: blendMode,
            filter: 'contrast(1.02) brightness(1.01)',
          }}
        />
        {children}
      </div>
    </div>
  );
};
