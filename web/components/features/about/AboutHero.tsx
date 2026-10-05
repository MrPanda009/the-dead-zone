'use client';

import React, { useRef, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { GlobeCanvas } from '@/components/features/globe';
import { useTheme } from '@/components/providers';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import type { AboutHeroProps } from './types';

export const AboutHero: React.FC<AboutHeroProps> = ({
  headline = 'About TERRA',
  description = 'Terrain-based Environmental Risk and Relocation Analytics',
  isGlobeRotating = true,
  className = '',
  classNames = {},
  animation = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const globeContainerRef = useRef<HTMLDivElement>(null);
  const ombreRef = useRef<HTMLDivElement>(null);
  const shadowVignetteRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const prefersReducedMotion = usePrefersReducedMotion();

  const {
    disabled: animationDisabled = false,
    delay = 0.15,
    duration = 0.85,
  } = animation;
  const shouldAnimate = !animationDisabled && !prefersReducedMotion;

  // Dynamic subtle scroll parallax for the hero headline, globe, and ombre gradient
  useEffect(() => {
    if (prefersReducedMotion) return;
    let rafId: number;

    const onScroll = () => {
      rafId = requestAnimationFrame(() => {
        const scrollY = window.scrollY || window.pageYOffset || 0;

        // 1. Hero headline translates upward and fades
        if (textRef.current) {
          const translateY = Math.min(scrollY * 0.35, 120);
          const opacity = Math.max(0, 1 - scrollY / 320);
          const scale = Math.max(0.92, 1 - scrollY * 0.0003);
          textRef.current.style.transform = `translate3d(0, ${-translateY}px, 0) scale(${scale})`;
          textRef.current.style.opacity = `${opacity}`;
        }

        // 2. 3D Globe subtle parallax drift (never goes full black, stays integrated)
        if (globeContainerRef.current) {
          const translateY = Math.min(scrollY * 0.22, 110);
          const opacity = Math.max(0.12, 1 - scrollY / 620);
          const scale = Math.max(0.88, 1 - (scrollY / 1000) * 0.12);
          globeContainerRef.current.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale})`;
          globeContainerRef.current.style.opacity = `${opacity}`;
          globeContainerRef.current.style.pointerEvents = opacity > 0.1 ? 'auto' : 'none';
        }

        // 3. Ombre gradient subtle parallax glide into the picture below
        if (ombreRef.current) {
          const translateY = Math.min(scrollY * 0.14, 80);
          const opacity = Math.max(0.2, 1 - scrollY / 850);
          ombreRef.current.style.transform = `translate3d(0, ${translateY}px, 0)`;
          ombreRef.current.style.opacity = `${opacity}`;
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [prefersReducedMotion]);

  useGSAP(
    () => {
      if (!shouldAnimate || !textRef.current) return;

      const tl = gsap.timeline({ delay });

      tl.fromTo(
        '.about-hero-headline',
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration, ease: 'power3.out' }
      );

      if (description) {
        tl.fromTo(
          '.about-hero-subtext',
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: duration * 0.85, ease: 'power3.out' },
          '-=0.45'
        );
      }
    },
    { scope: textRef, dependencies: [shouldAnimate, delay, duration, description] }
  );

  return (
    <section
      ref={containerRef}
      aria-label="About TERRA Hero"
      className={`relative w-full h-[88vh] min-h-[620px] max-h-[860px] flex flex-col items-center justify-center text-center overflow-visible select-none bg-transparent ${className} ${
        classNames.root ?? ''
      }`}
    >
      {/* 3D WebGL Earth Globe Canvas (Integrated directly into background with smooth feather mask) */}
      <div
        ref={globeContainerRef}
        className={`absolute inset-0 z-0 pointer-events-auto cursor-grab active:cursor-grabbing will-change-transform [mask-image:linear-gradient(to_bottom,black_0%,black_52%,rgba(0,0,0,0.85)_66%,rgba(0,0,0,0.45)_80%,rgba(0,0,0,0.1)_92%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_52%,rgba(0,0,0,0.85)_66%,rgba(0,0,0,0.45)_80%,rgba(0,0,0,0.1)_92%,transparent_100%)] ${
          classNames.globeContainer ?? ''
        }`}
      >
        <GlobeCanvas
          viewMode="about"
          positionMode="absolute"
          isAutoRotating={isGlobeRotating}
          enableScrollSpin={false}
          isRadarActive={true}
          primaryFocusId="himalayan-arc"
          className="w-full h-full"
        />
      </div>

      {/* Bottom of Globe Slightly Hidden in Shadow (Fully resolves to transparent within globe boundaries) */}
      <div
        ref={shadowVignetteRef}
        className="absolute inset-0 pointer-events-none z-[1] bg-[radial-gradient(ellipse_64%_26%_at_50%_68%,rgba(0,0,0,0.65)_0%,rgba(0,0,0,0.38)_32%,rgba(0,0,0,0.12)_62%,transparent_85%)]"
        aria-hidden="true"
      />

      {/* Hero Headline & Subtext Content */}
      <div
        ref={textRef}
        className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 flex flex-col items-center pointer-events-none will-change-transform -mt-6 sm:-mt-8"
      >
        {/* Display Serif Editorial Headline */}
        <h1
          className={`about-hero-headline text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-[1.12] drop-shadow-[0_4px_28px_rgba(0,0,0,0.9)] font-editorial ${
            classNames.headline ?? ''
          }`}
        >
          {headline}
        </h1>

        {/* Italicized Full Form Subtext */}
        {description && (
          <p
            className={`about-hero-subtext mt-3 sm:mt-4 text-base sm:text-lg md:text-xl italic font-normal tracking-wide text-white/90 max-w-2xl text-center leading-relaxed drop-shadow-[0_2px_18px_rgba(0,0,0,0.85)] font-editorial ${
              classNames.description ?? ''
            }`}
          >
            {description}
          </p>
        )}
      </div>

      {/* Multi-Stage Eased Ombre Gradient Transition into the 2D Picture */}
      <div
        ref={ombreRef}
        className="absolute -bottom-20 sm:-bottom-28 inset-x-0 h-80 sm:h-[420px] pointer-events-none z-[2] will-change-transform"
        style={{
          background: isDark
            ? 'linear-gradient(to bottom, transparent 0%, rgba(7,19,14,0.10) 15%, rgba(7,19,14,0.40) 35%, rgba(7,19,14,0.65) 50%, rgba(7,19,14,0.40) 65%, rgba(7,19,14,0.10) 85%, transparent 100%)'
            : 'linear-gradient(to bottom, transparent 0%, rgba(244,246,244,0.10) 15%, rgba(244,246,244,0.40) 35%, rgba(244,246,244,0.65) 50%, rgba(244,246,244,0.40) 65%, rgba(244,246,244,0.10) 85%, transparent 100%)',
        }}
        aria-hidden="true"
      />
    </section>
  );
};
