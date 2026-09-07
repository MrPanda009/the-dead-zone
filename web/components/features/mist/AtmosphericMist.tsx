'use client';

import React, { useRef, useEffect } from 'react';
import Image from 'next/image';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useTheme } from '@/components/providers';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import { AtmosphericMistProps } from './types';

/**
 * AtmosphericMist
 *
 * Spreads rich, darker atmospheric mist and clouds broadly across the landing page
 * in Light Mode (Daylight Sage / White theme).
 *
 * Sits BEHIND the 3D Earth globe (z-0 vs z-[1]) so it never covers over the planet.
 * Features full mouse parallax and scroll parallax interaction between the Earth and the mist.
 *
 * Disperses SLOWLY and gradually as the user scrolls down, lingering through initial narrative.
 * Strictly inactive in Dark Mode (Night Forest theme).
 */
export const AtmosphericMist: React.FC<AtmosphericMistProps> = ({
  scrollProgress = 0,
  imageUrl = '/atmospheric-mist-transparent.png',
  baseOpacity = 1.0,
  intensity,
  dispersionThreshold = 0.52,
  dispersionScale = 1.28,
  dispersionY = -45,
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
    driftDuration = 15,
    driftOffset = 10,
  } = animation;

  // Responsive GSAP slow-dispersion animation on scroll & organic drifting
  useGSAP(
    () => {
      if (!containerRef.current) return;

      if (!isLight) {
        gsap.to('.mist-layer', {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto',
        });
        return;
      }

      // Slower, lingering dispersion curve: stays prominent longer then gently dissolves
      const raw = Math.min(1.0, Math.max(0.0, scrollProgress / dispersionThreshold));
      const dispersion = Math.pow(raw, 1.35); // Slow onset curve

      const targetOpacity = Math.max(0, (1.0 - dispersion) * effectiveOpacity);
      const targetScaleHorizon = prefersReducedMotion ? 1.0 : 1.0 + dispersion * (dispersionScale - 1.0);
      const targetScaleWest = prefersReducedMotion ? 1.2 : 1.2 + dispersion * 0.3;
      const targetScaleSouth = prefersReducedMotion ? 1.3 : 1.3 + dispersion * 0.35;
      const targetY = prefersReducedMotion ? 0 : dispersion * dispersionY;

      // 1. Horizon Framing Layer
      gsap.to('.mist-layer-horizon', {
        opacity: targetOpacity,
        scale: targetScaleHorizon,
        y: targetY * 0.7,
        duration: 0.45,
        ease: 'power1.out',
        overwrite: 'auto',
      });

      // 2. West Typography Cloud Veil (lingers behind text)
      gsap.to('.mist-layer-west', {
        opacity: targetOpacity * 0.9,
        scale: targetScaleWest,
        y: targetY * 0.9,
        duration: 0.45,
        ease: 'power1.out',
        overwrite: 'auto',
      });

      // 3. South Planetary Cloud Bed (behind globe)
      gsap.to('.mist-layer-south', {
        opacity: targetOpacity * 0.95,
        scale: targetScaleSouth,
        y: targetY * 1.2,
        duration: 0.45,
        ease: 'power1.out',
        overwrite: 'auto',
      });

      // Subtle ambient continuous drift when near hero
      if (enableFloatingDrift && !prefersReducedMotion && dispersion < 0.6) {
        gsap.to('.mist-img-horizon', {
          y: driftOffset,
          x: -driftOffset * 0.5,
          duration: driftDuration,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          overwrite: false,
        });

        gsap.to('.mist-img-west', {
          y: -driftOffset * 0.7,
          x: driftOffset * 0.6,
          duration: driftDuration * 1.2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          overwrite: false,
        });

        gsap.to('.mist-img-south', {
          y: driftOffset * 0.8,
          x: -driftOffset * 0.4,
          duration: driftDuration * 1.3,
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

  // Mouse Parallax Interaction: shifts background mist relative to foreground Earth
  useEffect(() => {
    if (prefersReducedMotion || !isLight) return;

    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;

      // Inverse parallax: mist layers in background shift smoothly opposite cursor
      gsap.to('.mist-layer-horizon', {
        x: -nx * 18,
        y: -ny * 12,
        duration: 1.0,
        ease: 'power1.out',
        overwrite: 'auto',
      });

      gsap.to('.mist-layer-west', {
        x: -nx * 28,
        y: -ny * 18,
        duration: 1.2,
        ease: 'power1.out',
        overwrite: 'auto',
      });

      gsap.to('.mist-layer-south', {
        x: -nx * 22,
        y: -ny * 16,
        duration: 1.4,
        ease: 'power1.out',
        overwrite: 'auto',
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [prefersReducedMotion, isLight]);

  // Hidden in dark mode
  if (!isLight) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transition-opacity duration-300 ${className} ${classNames?.root ?? ''}`}
    >
      {/* Layer 1: Full Viewport Horizon Perimeter Mist */}
      <div
        className={`mist-layer mist-layer-horizon absolute inset-0 w-full h-full will-change-transform will-change-opacity ${classNames?.wrapper ?? ''}`}
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
          className="mist-img-horizon object-cover object-center scale-105 pointer-events-none select-none"
          style={{
            mixBlendMode: blendMode,
            filter: 'contrast(1.35) brightness(0.80)',
          }}
        />
      </div>

      {/* Layer 2: Western Atmosphere (Spreads darker clouds across left typography & hero heading) */}
      <div
        className="mist-layer mist-layer-west absolute -top-8 -left-16 w-[95vw] h-[105vh] will-change-transform will-change-opacity pointer-events-none"
        style={{
          opacity: effectiveOpacity * 0.9,
          transformOrigin: '25% 40%',
          transform: 'scale(1.2)',
        }}
      >
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="100vw"
          className="mist-img-west object-cover object-left-top pointer-events-none select-none"
          style={{
            mixBlendMode: blendMode,
            filter: 'contrast(1.40) brightness(0.78)',
          }}
        />
      </div>

      {/* Layer 3: Southern Planetary Cloud Bed (Behind the 3D globe) */}
      <div
        className="mist-layer mist-layer-south absolute -bottom-16 -right-12 w-[105vw] h-[90vh] will-change-transform will-change-opacity pointer-events-none"
        style={{
          opacity: effectiveOpacity * 0.95,
          transformOrigin: '75% 65%',
          transform: 'scale(1.3)',
        }}
      >
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="100vw"
          className="mist-img-south object-cover object-center pointer-events-none select-none"
          style={{
            mixBlendMode: blendMode,
            filter: 'contrast(1.42) brightness(0.75)',
          }}
        />
      </div>

      {children}
    </div>
  );
};
