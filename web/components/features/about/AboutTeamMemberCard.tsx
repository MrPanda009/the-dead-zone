'use client';

import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import type { AboutTeamMemberCardProps } from './types';

export const AboutTeamMemberCard: React.FC<AboutTeamMemberCardProps> = ({
  member,
  className = '',
  classNames = {},
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useGSAP(
    () => {
      const card = cardRef.current;
      const arrow = arrowRef.current;
      if (!card || prefersReducedMotion) return;

      const onEnter = () => {
        gsap.to(card, {
          y: -4,
          duration: 0.25,
          ease: 'power2.out',
        });
        if (arrow) {
          gsap.to(arrow, {
            x: 4,
            duration: 0.25,
            ease: 'back.out(2)',
          });
        }
      };

      const onLeave = () => {
        gsap.to(card, {
          y: 0,
          duration: 0.25,
          ease: 'power2.out',
        });
        if (arrow) {
          gsap.to(arrow, {
            x: 0,
            duration: 0.25,
            ease: 'power2.out',
          });
        }
      };

      card.addEventListener('mouseenter', onEnter);
      card.addEventListener('mouseleave', onLeave);

      return () => {
        card.removeEventListener('mouseenter', onEnter);
        card.removeEventListener('mouseleave', onLeave);
      };
    },
    { scope: cardRef, dependencies: [prefersReducedMotion] }
  );

  return (
    <div
      ref={cardRef}
      className={`team-member-card group relative rounded-2xl bg-surface-0/80 dark:bg-forest-surface/85 border border-line/80 dark:border-white/10 backdrop-blur-xl p-5 sm:p-6 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_6px_24px_rgba(0,0,0,0.35)] transition-all duration-300 hover:border-citron/50 dark:hover:border-citron/50 hover:shadow-[0_10px_32px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] ${className} ${
        classNames.root ?? ''
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Subtle Index Identifier */}
        {member.index && (
          <span
            className={`text-xs font-mono text-text-muted dark:text-neutral-400 font-semibold tracking-wider ${
              classNames.index ?? ''
            }`}
          >
            {member.index}
          </span>
        )}

        {/* Member Name (Clean and prominent, no extra clutter) */}
        <h3
          className={`text-lg sm:text-xl font-bold tracking-tight text-ink dark:text-text-primary group-hover:text-ink dark:group-hover:text-citron transition-colors font-sans ${
            classNames.name ?? ''
          }`}
        >
          {member.name}
        </h3>
      </div>

      {/* Minimal directional micro-arrow */}
      <span
        ref={arrowRef}
        className="text-text-muted dark:text-neutral-400 group-hover:text-ink dark:group-hover:text-citron transition-colors text-sm font-mono inline-block"
        aria-hidden="true"
      >
        →
      </span>
    </div>
  );
};
