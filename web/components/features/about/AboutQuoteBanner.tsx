'use client';

import React, { useRef, useEffect } from 'react';
import { ScrollReveal } from './ScrollReveal';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import type { AboutQuoteBannerProps } from './types';

export const AboutQuoteBanner: React.FC<AboutQuoteBannerProps> = ({
  quote = 'Whoever saves one life saves the world entire.',
  author = 'TERRA Humanitarian Principle',
  affiliation = 'Disaster Risk Reduction & Preemptive Relocation',
  className = '',
}) => {
  const quoteRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Dynamic scroll interaction for the quote box
  useEffect(() => {
    if (prefersReducedMotion) return;
    let rafId: number;

    const onScroll = () => {
      rafId = requestAnimationFrame(() => {
        const el = quoteRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        if (rect.top < windowHeight && rect.bottom > 0) {
          const centerDelta = rect.top + rect.height / 2 - windowHeight / 2;
          const translateY = centerDelta * 0.06;
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
      aria-label="Mission Statement & Endorsement"
      className={`relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 ${className}`}
    >
      <ScrollReveal distance={36} duration={0.9} threshold={0.15}>
        <div
          ref={quoteRef}
          className="relative rounded-[32px] sm:rounded-[40px] bg-surface-0/90 dark:bg-forest-surface/90 border border-line/90 dark:border-white/10 backdrop-blur-2xl p-8 sm:p-14 lg:p-16 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_24px_56px_rgba(0,0,0,0.45)] flex flex-col justify-between overflow-hidden will-change-transform"
        >
          {/* Decorative Background Watermark */}
          <div className="absolute -top-10 -right-6 text-line/30 dark:text-white/[0.03] text-9xl font-serif select-none pointer-events-none">
            “
          </div>

          {/* Quote Body */}
          <blockquote className="relative z-10 mb-8 sm:mb-10">
            <p className="text-xl sm:text-2xl md:text-3xl font-normal leading-relaxed text-ink dark:text-text-primary tracking-tight font-editorial">
              &ldquo;{quote}&rdquo;
            </p>
          </blockquote>

          {/* Author Footer */}
          <div className="relative z-10 flex items-center justify-between gap-4 pt-6 border-t border-line/60 dark:border-white/10">
            <div>
              <p className="font-bold text-sm sm:text-base text-ink dark:text-text-primary">
                {author}
              </p>
              {affiliation && (
                <p className="text-xs font-mono text-text-muted dark:text-neutral-400 mt-0.5">
                  {affiliation}
                </p>
              )}
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
};
