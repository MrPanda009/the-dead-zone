'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useTheme } from '@/components/providers';
import type { ChatEmptyStateProps } from './types';
import { ChatPromptCard } from './ChatPromptCard';

export const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({
  district = 'Barpeta',
  onSelectPrompt,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const glowRingRef = useRef<HTMLDivElement>(null);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  useGSAP(
    () => {
      // Gentle floating animation on the pterodactyl sprite
      if (iconRef.current) {
        gsap.to(iconRef.current, {
          y: -3,
          duration: 2.2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }

      // Breathing aura glow behind the central avatar
      if (glowRingRef.current) {
        gsap.to(glowRingRef.current, {
          scale: 1.15,
          opacity: 0.55,
          duration: 2.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }

      // Staggered entrance for empty state elements
      gsap.from('.empty-state-stagger', {
        y: 10,
        opacity: 0,
        stagger: 0.06,
        duration: 0.35,
        ease: 'power2.out',
      });
    },
    { scope: containerRef }
  );

  const suggestedPrompts = [
    {
      prompt: `Compare SETU vs External recommendation for ${district}`,
      iconType: 'scale' as const,
    },
    {
      prompt: 'Why was Habitation #775 prioritized for short-term relocation?',
      iconType: 'home' as const,
    },
    {
      prompt: 'What infrastructure is missing at Candidate Site #1752?',
      iconType: 'building' as const,
    },
    {
      prompt: `Which sites have unverified land tenure in ${district}?`,
      iconType: 'map' as const,
    },
  ];

  return (
    <div
      ref={containerRef}
      className={`relative z-10 flex flex-col items-center justify-center max-w-sm mx-auto py-2 px-2 text-center select-none ${className}`}
    >
      {/* 1. Center Avatar: Pixel-Art Pterodactyl carrying Earth with soft glow aura */}
      <div className="relative mb-2 flex items-center justify-center empty-state-stagger">
        {/* Ambient Pulsing Aura */}
        <div
          ref={glowRingRef}
          aria-hidden="true"
          className="absolute w-20 h-20 rounded-full pointer-events-none blur-lg opacity-40 transition-colors"
          style={{
            background: isDark
              ? 'radial-gradient(circle, rgba(52, 211, 153, 0.45) 0%, rgba(16, 185, 129, 0.15) 70%, transparent 100%)'
              : 'radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, rgba(52, 211, 153, 0.12) 70%, transparent 100%)',
          }}
        />

        {/* Circular Avatar Container with Mint/Sage Palette */}
        <div
          ref={iconRef}
          className={`relative z-10 w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center p-1.5 shadow-sm border transition-all ${
            isDark
              ? 'bg-[#0a261c] border-emerald-500/30'
              : 'bg-[#d8eedf] border-[#b2ddbe]'
          }`}
        >
          {/* Pterodactyl Carrying Earth Vector Sprite */}
          <div className="w-9 h-9 relative [image-rendering:pixelated] select-none pointer-events-none">
            <Image
              src="/pterodactyl.svg"
              alt="SETU Decision Assistant Pterodactyl"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      </div>

      {/* 2. Heading: Relocation Decision Assistant */}
      <h2 className="empty-state-stagger font-display font-bold text-sm sm:text-base tracking-tight text-ink dark:text-text-primary mb-1">
        <span>Relocation </span>
        <span className="text-emerald-700 dark:text-emerald-400">
          Decision Assistant
        </span>
      </h2>

      {/* 3. Ornamental Divider Dot */}
      <div className="empty-state-stagger flex items-center justify-center gap-1 mb-1.5 opacity-60">
        <span className="w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400" />
        <span className="w-1.5 h-1.5 rotate-45 bg-emerald-600 dark:bg-emerald-400" />
        <span className="w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400" />
      </div>

      {/* 4. Subtitle Description */}
      <p className="empty-state-stagger text-[11px] text-text-secondary leading-snug max-w-xs mb-3">
        I can help you understand village triage priorities, analyze deficits, and compare SETU&apos;s plan against GIS recommendations.
      </p>

      {/* 5. Four Suggested Prompt Cards Stack */}
      <div className="empty-state-stagger w-full space-y-1.5">
        {suggestedPrompts.map((item, idx) => (
          <ChatPromptCard
            key={item.prompt}
            index={idx}
            prompt={item.prompt}
            iconType={item.iconType}
            onClick={onSelectPrompt}
          />
        ))}
      </div>
    </div>
  );
};

export default ChatEmptyState;
