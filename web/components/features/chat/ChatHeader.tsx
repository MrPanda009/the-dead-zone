'use client';

import React from 'react';
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
      className={`px-4 py-3 border-b border-line dark:border-white/10 bg-surface-0 dark:bg-forest-dark flex items-center justify-between ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        <div>
          <div className="flex items-center gap-2">
            <h3 id="chat-drawer-title" className="font-semibold text-sm text-ink dark:text-text-primary">
              Relocation Decision Assistant
            </h3>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                isFallback
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              }`}
            >
              {isFallback ? 'Offline Deterministic' : 'Grounded AI'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted font-mono mt-0.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Cross-District & Site Suitability Scope</span>
            <span>•</span>
            <span className="truncate max-w-[140px]" title={model}>{model}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onClear}
          title="Clear conversation history"
          className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-text-muted hover:text-ink dark:hover:text-text-primary text-xs font-mono transition-colors cursor-pointer"
        >
          Clear
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close assistant"
          className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-text-muted hover:text-ink dark:hover:text-text-primary text-base leading-none transition-colors cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
