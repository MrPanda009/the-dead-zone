'use client';

import React from 'react';
import Image from 'next/image';
import type { ChatHeaderProps } from './types';

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  district,
  model = 'openai/gpt-oss-120b',
  isFallback = false,
  onClose,
  onClear,
  className = '',
}) => {
  return (
    <div
      className={`relative z-20 px-4 py-3 sm:py-3.5 border-b border-emerald-100/80 dark:border-white/10 bg-white/90 dark:bg-[#071a12]/95 backdrop-blur-md flex items-center justify-between ${className}`}
    >
      {/* Left: Indicator Dot, Pterodactyl Avatar, Title & Subtitle */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Pulsing Green Status Dot */}
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>

        {/* Pterodactyl Assistant Avatar */}
        <div className="w-8 h-8 rounded-full bg-emerald-100/80 dark:bg-emerald-950/80 border border-emerald-300/60 dark:border-emerald-500/30 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-2xs [image-rendering:pixelated]">
          <Image
            src="/pterodactyl.svg"
            alt="Pterodactyl Icon"
            width={24}
            height={24}
            className="object-contain"
          />
        </div>

        {/* Title and Subtitle */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 id="chat-drawer-title" className="font-display font-bold text-xs sm:text-sm text-ink dark:text-text-primary tracking-tight">
              Relocation Decision Assistant
            </h3>

            {/* Grounded AI Badge */}
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border ${
                isFallback
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-500/30'
              }`}
            >
              <span className="text-[9px]">✦</span>
              <span>{isFallback ? 'Offline Safe' : 'Grounded AI'}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-text-muted font-mono mt-0.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">District: {district}</span>
            <span>•</span>
            <span className="truncate max-w-[130px] sm:max-w-[170px]" title={model}>{model}</span>
          </div>
        </div>
      </div>

      {/* Right: "Clear chat" with Trash Icon and Close "✕" */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onClear}
          title="Clear conversation history"
          className="group flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-emerald-50/80 dark:hover:bg-white/5 text-text-muted hover:text-ink dark:hover:text-text-primary text-xs font-sans transition-colors cursor-pointer"
        >
          <span className="text-xs font-medium">Clear chat</span>
          {/* Trash Can SVG Icon */}
          <svg
            className="w-3.5 h-3.5 text-text-muted group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close assistant"
          className="w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-text-muted hover:text-ink dark:hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
        >
          {/* Crisp SVG Close Icon */}
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
