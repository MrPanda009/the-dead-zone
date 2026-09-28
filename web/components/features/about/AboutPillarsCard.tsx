'use client';

import React, { useRef, useEffect } from 'react';
import { AboutPillarItem } from './AboutPillarItem';
import { ScrollReveal } from './ScrollReveal';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import type { AboutPillarsCardProps, AboutPillarItemData } from './types';

export const DEFAULT_PILLARS: AboutPillarItemData[] = [
  {
    id: 'triage',
    title: 'Hazard Triage',
    description:
      'H3 hexagonal clustering and Sentinel-1 InSAR ground displacement detection to prioritize red-zone habitations before catastrophic slope failure.',
    actionLabel: 'Explore Triage',
    actionHref: '/workspace',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    id: 'relocation',
    title: 'Relocation Engine',
    description:
      'Multi-criteria Pareto optimization matching displaced populations with safe, dignified reception sites while preserving livelihoods and cultural cohesion.',
    actionLabel: 'Discover Relocation',
    actionHref: '/relocation',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: 'governance',
    title: 'Resilience & Gov',
    description:
      'Automated executive briefs, evacuation manifests, and policy compliance workflows designed directly for NDRF, SDMA, and district magistrates.',
    actionLabel: 'Access Governance',
    actionHref: '/gov',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

export const AboutPillarsCard: React.FC<AboutPillarsCardProps> = ({
  headline = 'Sourcing & synthesizing real-time hazard intelligence for high-risk habitations.',
  pillars = DEFAULT_PILLARS,
  className = '',
  classNames = {},
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Dynamic scroll float for the overlapping pillars card
  useEffect(() => {
    if (prefersReducedMotion) return;
    let rafId: number;

    const onScroll = () => {
      rafId = requestAnimationFrame(() => {
        const el = cardRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        if (rect.top < windowHeight && rect.bottom > 0) {
          const centerDelta = rect.top + rect.height / 2 - windowHeight / 2;
          const translateY = centerDelta * 0.05;
          el.style.transform = `translate3d(0, ${translateY}px, 0)`;
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [prefersReducedMotion]);

  return (
    <section
      id="pillars"
      aria-label="Core Pillars of SETU-DRR"
      className={`relative z-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 sm:-mt-28 md:-mt-36 ${className}`}
    >
      <ScrollReveal distance={40} duration={0.9} threshold={0.1}>
        <div
          ref={cardRef}
          className={`rounded-[32px] sm:rounded-[40px] bg-surface-0/95 dark:bg-forest-surface/95 border border-line/90 dark:border-white/10 backdrop-blur-2xl p-6 sm:p-10 lg:p-14 shadow-[0_24px_64px_rgba(0,0,0,0.06)] dark:shadow-[0_28px_72px_rgba(0,0,0,0.55)] transition-shadow duration-300 will-change-transform ${
            classNames.root ?? ''
          }`}
        >
          {/* Centered Editorial Headline */}
          <div className="max-w-2xl mx-auto text-center mb-8 sm:mb-12">
            <h2
              className={`text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-ink dark:text-text-primary leading-tight font-editorial ${
                classNames.headline ?? ''
              }`}
            >
              {headline}
            </h2>
          </div>

          {/* 3 Pillar Columns Grid */}
          <div
            className={`grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch divide-y md:divide-y-0 md:divide-x divide-line/60 dark:divide-white/10 ${
              classNames.grid ?? ''
            }`}
          >
            {pillars.map((pillar) => (
              <AboutPillarItem key={pillar.id} data={pillar} />
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
};
