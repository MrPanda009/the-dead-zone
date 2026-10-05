'use client';

import React, { useRef } from 'react';
import gsap from 'gsap';
import { useTheme } from '@/components/providers';
import type { ChatPromptCardProps } from './types';

export const ChatPromptCard: React.FC<ChatPromptCardProps> = ({
  prompt,
  iconType = 'scale',
  onClick,
  index = 0,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLButtonElement>(null);
  const chevronRef = useRef<SVGSVGElement>(null);
  const iconBoxRef = useRef<HTMLDivElement>(null);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Hover animation for soft glowing backlight and tactile lift
  const handleMouseEnter = () => {
    if (glowRef.current) {
      gsap.to(glowRef.current, {
        opacity: 1,
        scale: 1.03,
        duration: 0.28,
        ease: 'power2.out',
      });
    }

    if (cardRef.current) {
      gsap.to(cardRef.current, {
        y: -2,
        duration: 0.22,
        ease: 'power2.out',
      });
    }

    if (chevronRef.current) {
      gsap.to(chevronRef.current, {
        x: 3,
        duration: 0.18,
        ease: 'back.out(2)',
      });
    }

    if (iconBoxRef.current) {
      gsap.to(iconBoxRef.current, {
        scale: 1.05,
        duration: 0.18,
        ease: 'power1.out',
      });
    }
  };

  const handleMouseLeave = () => {
    if (glowRef.current) {
      gsap.to(glowRef.current, {
        opacity: 0,
        scale: 0.98,
        duration: 0.3,
        ease: 'power2.in',
      });
    }

    if (cardRef.current) {
      gsap.to(cardRef.current, {
        y: 0,
        duration: 0.22,
        ease: 'power2.out',
      });
    }

    if (chevronRef.current) {
      gsap.to(chevronRef.current, {
        x: 0,
        duration: 0.18,
        ease: 'power2.out',
      });
    }

    if (iconBoxRef.current) {
      gsap.to(iconBoxRef.current, {
        scale: 1,
        duration: 0.18,
        ease: 'power2.out',
      });
    }
  };

  // Render thematic SVG icon
  const renderIcon = () => {
    switch (iconType) {
      case 'scale':
        return (
          <svg
            className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
            <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
            <path d="M7 21h10" />
            <path d="M12 3v18" />
            <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
          </svg>
        );
      case 'home':
        return (
          <svg
            className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        );
      case 'building':
        return (
          <svg
            className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
            <path d="M9 22v-4h6v4" />
            <path d="M8 6h.01" />
            <path d="M16 6h.01" />
            <path d="M12 6h.01" />
            <path d="M12 10h.01" />
            <path d="M12 14h.01" />
            <path d="M16 10h.01" />
            <path d="M16 14h.01" />
            <path d="M8 10h.01" />
            <path d="M8 14h.01" />
          </svg>
        );
      case 'map':
      default:
        return (
          <svg
            className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" />
            <path d="M9 3v15" />
            <path d="M15 6v15" />
          </svg>
        );
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full group ${className}`}
    >
      {/* 1. Soft Glowing Backlight Halo (Animated on Hover) */}
      <div
        ref={glowRef}
        aria-hidden="true"
        className="absolute -inset-1 rounded-xl pointer-events-none opacity-0 blur-md transition-transform duration-300"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at center, rgba(52, 211, 153, 0.4) 0%, rgba(16, 185, 129, 0.15) 55%, transparent 80%)'
            : 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.3) 0%, rgba(52, 211, 153, 0.12) 55%, transparent 80%)',
        }}
      />

      {/* 2. Interactive Card Button */}
      <button
        ref={cardRef}
        type="button"
        onClick={() => onClick(prompt)}
        className={`relative z-10 w-full flex items-center justify-between gap-2.5 px-3 py-2 sm:py-2.5 rounded-xl border transition-all duration-200 select-none cursor-pointer text-left shadow-2xs ${
          isDark
            ? 'bg-[#0d261b]/95 hover:bg-[#113224] border-emerald-500/20 hover:border-emerald-500/40 text-emerald-50'
            : 'bg-white/95 hover:bg-white border-emerald-100 hover:border-emerald-300/80 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Leading Icon Box */}
          <div
            ref={iconBoxRef}
            className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 border transition-transform ${
              isDark
                ? 'bg-emerald-950/60 border-emerald-500/30'
                : 'bg-emerald-50 border-emerald-200/80'
            }`}
          >
            {renderIcon()}
          </div>

          {/* Prompt Text */}
          <span className="font-sans font-medium text-[11px] sm:text-xs leading-snug line-clamp-2">
            {prompt}
          </span>
        </div>

        {/* Trailing Chevron '>' Indicator */}
        <svg
          ref={chevronRef}
          className={`w-3.5 h-3.5 shrink-0 transition-transform ${
            isDark ? 'text-emerald-400/80' : 'text-slate-400'
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  );
};

export default ChatPromptCard;
