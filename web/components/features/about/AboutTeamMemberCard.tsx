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
      className={`team-member-card group relative px-6 py-4 sm:py-5 rounded-2xl flex items-center justify-between backdrop-blur-xl bg-surface-0/65 dark:bg-white/[0.06] border border-line/70 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.25)] transition-all duration-300 hover:bg-surface-0/85 dark:hover:bg-white/[0.11] hover:border-citron/60 dark:hover:border-citron/60 hover:shadow-md will-change-transform ${className} ${
        classNames.root ?? ''
      }`}
    >
      <div className="flex items-center">
        {/* Member Name (Translucent Frosted Card Container) */}
        <h3
          className={`text-base sm:text-lg font-medium tracking-tight text-ink dark:text-text-primary group-hover:text-citron transition-colors font-sans ${
            classNames.name ?? ''
          }`}
        >
          {member.name}
        </h3>
      </div>

      {/* Minimal directional micro-arrow inside subtle frosted badge */}
      <span
        ref={arrowRef}
        className="w-7 h-7 rounded-full bg-surface-1/70 dark:bg-white/5 border border-line/50 dark:border-white/10 flex items-center justify-center text-text-muted dark:text-neutral-400 group-hover:text-citron group-hover:border-citron/40 group-hover:bg-citron/10 transition-all text-xs font-mono will-change-transform"
        aria-hidden="true"
      >
        →
      </span>
    </div>
  );
};
