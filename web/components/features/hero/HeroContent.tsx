'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export interface HeroContentProps {
  /** Target link for the command portal (default '/login') */
  portalHref?: string;
  /** Callback to reveal the login / command portal */
  onEnterPortal?: () => void;
  /** Custom root className */
  className?: string;
}

export const HeroContent: React.FC<HeroContentProps> = ({
  portalHref = '/login',
  onEnterPortal,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // Staggered cinematic entrance slide animations
    tl.fromTo(
      '.hero-node-badge',
      { y: -25, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7 }
    )
    .fromTo(
      '.hero-watermark-line',
      { x: -70, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.9, stagger: 0.12 },
      '-=0.4'
    )
    .fromTo(
      '.hero-heading-line',
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, stagger: 0.15 },
      '-=0.5'
    )
    .fromTo(
      '.hero-subtext',
      { y: 25, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7 },
      '-=0.4'
    )
    .fromTo(
      '.hero-cta',
      { y: 30, opacity: 0, scale: 0.92 },
      { y: 0, opacity: 1, scale: 1, duration: 0.75, ease: 'back.out(1.4)' },
      '-=0.3'
    )
    .fromTo(
      '.hero-bottom-badge',
      { opacity: 0, scale: 0.7 },
      { opacity: 1, scale: 1, duration: 0.6 },
      '-=0.4'
    );
  }, { scope: containerRef });

  return (
    <div
      ref={containerRef}
      className={`relative z-10 w-full h-full flex flex-col justify-center px-8 sm:px-16 lg:px-24 pointer-events-none ${className}`}
    >
      <div className="max-w-xl flex flex-col items-start select-none">
        
        {/* Node status badge */}
        <div className="hero-node-badge mb-3 pointer-events-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest-surface/60 border border-citron/30 text-[11px] font-mono text-citron backdrop-blur-md shadow-md">
            <span className="w-2 h-2 rounded-full bg-citron animate-ping" />
            <span>PLANETARY OBSERVATION • REAL-TIME SAR MESH</span>
          </div>
        </div>

        {/* Giant Watermark Typography (Reference Image 2) with line-by-line slide */}
        <div className="font-display text-6xl sm:text-8xl lg:text-9xl font-black uppercase watermark-text tracking-tighter leading-none mb-3">
          <div className="hero-watermark-line">THE</div>
          <div className="hero-watermark-line">DEAD</div>
          <div className="hero-watermark-line">ZONE</div>
        </div>

        {/* Clean Tagline (Reference Image 2) */}
        <div className="mb-4">
          <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl font-extrabold text-text-primary tracking-tight leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
            <div className="hero-heading-line">Change the World</div>
            <div className="hero-heading-line text-citron">Live Safely!</div>
          </h2>
        </div>

        {/* Descriptive mission text */}
        <p className="hero-subtext text-xs sm:text-sm text-text-secondary/80 font-sans max-w-md mb-8 leading-relaxed">
          National Disaster Red Zone Decision Support &amp; Autonomous Resettlement Routing Engine.
        </p>

        {/* Minimalist Solid Citron Action Button (Reference Image 1 - Flat, Zero Gradients) */}
        <div className="hero-cta pointer-events-auto flex items-center space-x-4">
          <Link
            href={portalHref || '/login'}
            onClick={onEnterPortal}
            className="btn-citron px-7 py-3.5 rounded-full font-display text-sm tracking-wide flex items-center space-x-2 cursor-pointer transition-transform hover:scale-105 active:scale-95 text-forest-dark font-bold"
          >
            <span>Access Command Portal</span>
            <span className="material-symbols-outlined text-base font-bold">arrow_forward</span>
          </Link>
        </div>

      </div>

      {/* Subtle Bottom Left Badge (Reference Image 2) */}
      <div className="hero-bottom-badge absolute bottom-8 left-8 sm:left-16 pointer-events-auto">
        <div className="w-9 h-9 rounded-full bg-forest-surface/70 border border-white/15 flex items-center justify-center text-xs font-mono font-bold text-text-secondary shadow-md">
          N
        </div>
      </div>
    </div>
  );
};
