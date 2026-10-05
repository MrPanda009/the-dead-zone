'use client';

import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { ChatPromptSuggestionsProps } from './types';

export const ChatPromptSuggestions: React.FC<ChatPromptSuggestionsProps> = ({
  onSelectPrompt,
  district = 'Barpeta',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const prompts = [
    'I need detailed site by site suitability assessment',
    'Which candidate sites are safest across districts?',
    `How many people are in danger in ${district}?`,
    'Which district has the highest population at risk?',
    `Compare SETU vs External recommendation for ${district}`,
  ];

  useGSAP(
    () => {
      gsap.from('.prompt-chip', {
        y: 8,
        opacity: 0,
        stagger: 0.05,
        duration: 0.3,
        ease: 'power2.out',
      });
    },
    { scope: containerRef },
  );

  return (
    <div
      ref={containerRef}
      className={`px-4 py-2 border-t border-line/40 dark:border-white/10 flex flex-wrap gap-1.5 ${className}`}
    >
      {prompts.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onSelectPrompt(p)}
          className="prompt-chip text-left text-xs px-2.5 py-1.5 rounded-lg border border-line dark:border-white/10 bg-surface-1 dark:bg-forest-surface text-text-secondary hover:text-ink dark:hover:text-white hover:border-emerald-500/40 transition-all cursor-pointer"
        >
          {p}
        </button>
      ))}
    </div>
  );
};
