'use client';

import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { ChatPromptSuggestionsProps } from './types';

export interface ExtendedChatPromptSuggestionsProps extends ChatPromptSuggestionsProps {
  /** Optional message count to conditionally render only during active chat */
  messagesCount?: number;
}

export const ChatPromptSuggestions: React.FC<ExtendedChatPromptSuggestionsProps> = ({
  onSelectPrompt,
  district = 'Barpeta',
  messagesCount = 0,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // If there are no messages, the ChatEmptyState already displays the full prompt cards
  if (messagesCount === 0) {
    return null;
  }

  const prompts = [
    'I need detailed site by site suitability assessment',
    'Which candidate sites are safest across districts?',
    `How many people are in danger in ${district}?`,
    'Which district has the highest population at risk?',
    `Compare SETU vs External recommendation for ${district}`,
    'Why was Habitation #775 prioritized for short-term relocation?',
    'What infrastructure is missing at Candidate Site #1752?',
    `Which sites have unverified land tenure in ${district}?`,
  ];

  return (
    <div
      ref={containerRef}
      className={`relative z-20 px-3 py-2 border-t border-emerald-100/60 dark:border-white/10 bg-white/70 dark:bg-[#071a12]/80 backdrop-blur-xs flex items-center gap-1.5 overflow-x-auto no-scrollbar ${className}`}
    >
      {prompts.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onSelectPrompt(p)}
          className="prompt-chip shrink-0 text-left text-[11px] font-sans px-2.5 py-1.5 rounded-full border border-emerald-200/80 dark:border-emerald-500/30 bg-white dark:bg-[#0c261b] text-text-secondary hover:text-emerald-900 dark:hover:text-emerald-100 hover:border-emerald-500 hover:shadow-xs hover:shadow-emerald-500/20 transition-all cursor-pointer select-none"
        >
          {p}
        </button>
      ))}
    </div>
  );
};

export default ChatPromptSuggestions;
