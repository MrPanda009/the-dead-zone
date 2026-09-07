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
 * Richly applies the atmospheric mist artifact surrounding the website perimeter
 * in Light Mode (Daylight Sage theme), framing the hero typography and 3D globe.
 *
 * Utilizes dual-depth atmospheric layering (Perimeter Horizon + Planetary Accent)
 * so clouds are distinctly visible against white backgrounds, matching reference aesthetics.
 *
 * As the user scrolls down, GSAP smoothly disperses the mist outward into clear space.
 * Strictly inactive / hidden in Dark Mode (Night Forest theme).
 */
export const AtmosphericMist: React.FC<AtmosphericMistProps> = ({
  scrollProgress = 0,
  imageUrl = '/atmospheric-mist-transparent.png',
  baseOpacity = 0.95,
  intensity,
  dispersionThreshold = 0.22,
  dispersionScale = 1.18,
  dispersionY = -35,
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
      const targetScaleOuter = prefersReducedMotion ? 1.0 : 1.0 + dispersion * (dispersionScale - 1.0);
      const targetScaleAccent = prefersReducedMotion ? 1.25 : 1.25 + dispersion * 0.25;
      const targetY = prefersReducedMotion ? 0 : dispersion * dispersionY;

      // Base framing layer dispersion
      gsap.to('.mist-wrapper-outer', {
        opacity: targetOpacity,
        scale: targetScaleOuter,
        y: targetY,
        duration: 0.4,
        ease: 'power2.out',
        overwrite: 'auto',
      });

      // Planetary accent layer dispersion
      gsap.to('.mist-wrapper-accent', {
        opacity: targetOpacity * 0.85,
        scale: targetScaleAccent,
        y: targetY * 1.3,
        duration: 0.4,
        ease: 'power2.out',
        overwrite: 'auto',
      });

      // Subtle ambient floating / breathing microinteraction when near hero
      if (enableFloatingDrift && !prefersReducedMotion && dispersion < 0.5) {
        gsap.to('.mist-image-outer', {
          y: driftOffset,
          x: -driftOffset * 0.6,
          duration: driftDuration,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          overwrite: false,
        });

        gsap.to('.mist-image-accent', {
          y: -driftOffset * 0.8,
          x: driftOffset * 0.5,
          duration: driftDuration * 1.2,
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
      {/* Primary Horizon Framing Mist Layer */}
      <div
        className={`mist-wrapper mist-wrapper-outer absolute inset-0 w-full h-full will-change-transform will-change-opacity ${classNames?.wrapper ?? ''}`}
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
          className={`mist-image mist-image-outer object-cover object-center scale-105 pointer-events-none select-none ${classNames?.image ?? ''}`}
          style={{
            mixBlendMode: blendMode,
            filter: 'contrast(1.08) brightness(0.98)',
          }}
        />
      </div>

      {/* Volumetric Globe & Typography Mist Accent (Brings clouds closer around globe & hero text) */}
      <div
        className="mist-wrapper mist-wrapper-accent absolute inset-0 w-full h-full will-change-transform will-change-opacity pointer-events-none"
        style={{
          opacity: effectiveOpacity * 0.85,
          transformOrigin: '68% 45%',
          transform: 'scale(1.25)',
        }}
      >
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="100vw"
          className="mist-image mist-image-accent object-cover object-center pointer-events-none select-none"
          style={{
            mixBlendMode: blendMode,
            filter: 'contrast(1.10) brightness(0.96)',
          }}
        />
      </div>

      {children}
    </div>
  );
};
