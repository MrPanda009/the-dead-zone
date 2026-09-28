'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import type { AboutPillarItemProps } from './types';

export const AboutPillarItem: React.FC<AboutPillarItemProps> = ({
  data,
  className = '',
  classNames = {},
  onClick,
}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useGSAP(
    () => {
      const item = itemRef.current;
      const arrow = arrowRef.current;
      if (!item || prefersReducedMotion) return;

      const onEnter = () => {
        gsap.to(item, { y: -4, duration: 0.25, ease: 'power2.out' });
        if (arrow) {
          gsap.to(arrow, { x: 4, duration: 0.25, ease: 'power2.out' });
        }
      };

      const onLeave = () => {
        gsap.to(item, { y: 0, duration: 0.25, ease: 'power2.out' });
        if (arrow) {
          gsap.to(arrow, { x: 0, duration: 0.25, ease: 'power2.out' });
        }
      };

      item.addEventListener('mouseenter', onEnter);
      item.addEventListener('mouseleave', onLeave);

      return () => {
        item.removeEventListener('mouseenter', onEnter);
        item.removeEventListener('mouseleave', onLeave);
      };
    },
    { scope: itemRef, dependencies: [prefersReducedMotion] }
  );

  return (
    <div
      ref={itemRef}
      className={`group flex flex-col items-center text-center px-4 py-6 sm:py-8 rounded-2xl transition-colors duration-200 hover:bg-surface-1/40 dark:hover:bg-white/[0.03] ${className} ${
        classNames.root ?? ''
      }`}
      onClick={() => onClick?.(data)}
    >
      {/* Minimal Icon Glyph Container */}
      <div
        className={`w-12 h-12 rounded-full bg-surface-1 dark:bg-white/10 flex items-center justify-center text-ink dark:text-neutral-100 mb-5 shadow-sm border border-line/60 dark:border-white/10 group-hover:border-citron/60 group-hover:scale-105 transition-all duration-300 ${
          classNames.iconWrapper ?? ''
        }`}
      >
        {data.icon}
      </div>

      {/* Column Title */}
      <h3
        className={`text-lg sm:text-xl font-bold tracking-tight text-ink dark:text-text-primary mb-3 ${
          classNames.title ?? ''
        }`}
      >
        {data.title}
      </h3>

      {/* Description */}
      <p
        className={`text-sm sm:text-[14.5px] leading-relaxed text-text-secondary dark:text-neutral-300 mb-5 flex-1 max-w-xs ${
          classNames.description ?? ''
        }`}
      >
        {data.description}
      </p>

      {/* Minimal Editorial Link with Arrow */}
      <Link
        href={data.actionHref}
        className={`inline-flex items-center gap-1.5 text-xs font-semibold font-mono tracking-wider text-ink/80 dark:text-text-primary group-hover:text-ink dark:group-hover:text-citron transition-colors duration-200 focus:outline-none focus-visible:underline ${
          classNames.link ?? ''
        }`}
      >
        <span>{data.actionLabel}</span>
        <span ref={arrowRef} className="inline-block transition-transform duration-200">
          →
        </span>
      </Link>
    </div>
  );
};
