'use client';

import React, { useRef, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { GlobeCanvas } from '@/components/features/globe';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import type { AboutHeroProps } from './types';

export const AboutHero: React.FC<AboutHeroProps> = ({
  eyebrow = 'PLANETARY HAZARD & RELOCATION ENGINE • TEAM TRIPLE T',
  headline = (
    <>
      Precision Intelligence.
      <br />
      <span className="italic font-normal">Humane Relocation.</span>
    </>
  ),
  isGlobeRotating = true,
  className = '',
  classNames = {},
  animation = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const globeContainerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const {
    disabled: animationDisabled = false,
    delay = 0.15,
    duration = 0.85,
  } = animation;
  const shouldAnimate = !animationDisabled && !prefersReducedMotion;

  // Dynamic scroll interaction for the hero text box and background globe
  useEffect(() => {
    if (prefersReducedMotion) return;
    let rafId: number;

    const onScroll = () => {
      rafId = requestAnimationFrame(() => {
        const scrollY = window.scrollY || window.pageYOffset || 0;
        if (textRef.current) {
          const translateY = Math.min(scrollY * 0.25, 90);
          const opacity = Math.max(0, 1 - scrollY / 460);
          const scale = Math.max(0.94, 1 - scrollY * 0.00025);
          textRef.current.style.transform = `translate3d(0, ${-translateY}px, 0) scale(${scale})`;
          textRef.current.style.opacity = `${opacity}`;
        }
        if (globeContainerRef.current) {
          const globeOpacity = Math.max(0, 1 - scrollY / 560);
          globeContainerRef.current.style.opacity = `${globeOpacity}`;
          globeContainerRef.current.style.pointerEvents = globeOpacity > 0.1 ? 'auto' : 'none';
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
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
        '.about-hero-pill',
        { y: 16, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.5)' }
      ).fromTo(
        '.about-hero-headline',
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration, ease: 'power3.out' },
        '-=0.3'
      );
    },
    { scope: textRef, dependencies: [shouldAnimate, delay, duration] }
  );

  return (
    <section
      ref={containerRef}
      aria-label="About SETU-DRR Hero"
      className={`relative w-full min-h-[440px] sm:min-h-[500px] md:min-h-[560px] flex flex-col items-center justify-center text-center overflow-hidden pt-28 sm:pt-32 pb-16 sm:pb-20 select-none ${className} ${
        classNames.root ?? ''
      }`}
    >
      {/* 3D WebGL Earth Globe Canvas (Fixed mode, matching landing page scale & true aspect ratio without stretching) */}
      <div
        ref={globeContainerRef}
        className={`fixed inset-0 z-0 pointer-events-auto cursor-grab active:cursor-grabbing will-change-transform ${
          classNames.globeContainer ?? ''
        }`}
      >
        <GlobeCanvas
          viewMode="about"
          positionMode="fixed"
          isAutoRotating={isGlobeRotating}
          enableScrollSpin={false}
          isRadarActive={true}
          primaryFocusId="himalayan-arc"
          className="w-full h-full"
        />

        {/* Atmospheric Contrast Masking Gradient (Ensures High Text Legibility) */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-bg-base/75 via-transparent to-bg-base dark:from-[#06100c]/80 dark:via-transparent dark:to-bg-base" />
        <div className="absolute inset-0 pointer-events-none bg-radial from-transparent via-bg-base/35 to-bg-base/90 dark:via-[#06100c]/35 dark:to-[#06100c]/90" />
      </div>

      {/* Hero Text Content (Interacts dynamically with scrolling) */}
      <div
        ref={textRef}
        className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 flex flex-col items-center pointer-events-none will-change-transform"
      >
        {/* Tracked Pill Badge */}
        <div
          className={`about-hero-pill inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-surface-0/85 dark:bg-forest-surface/90 border border-line/80 dark:border-white/15 backdrop-blur-xl mb-4 sm:mb-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] pointer-events-auto ${
            classNames.eyebrow ?? ''
          }`}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-citron opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-citron" />
          </span>
          <span className="text-[10px] sm:text-[11px] font-mono tracking-[0.2em] text-text-secondary dark:text-neutral-200 font-medium uppercase">
            {eyebrow}
          </span>
        </div>

        {/* Display Serif Editorial Headline (Reduced font size, sleek and elegant) */}
        <h1
          className={`about-hero-headline text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-ink dark:text-text-primary leading-[1.14] drop-shadow-md font-editorial ${
            classNames.headline ?? ''
          }`}
        >
          {headline}
        </h1>
      </div>
    </section>
  );
};
