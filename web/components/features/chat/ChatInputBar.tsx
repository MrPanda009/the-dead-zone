'use client';

import React, { useRef } from 'react';
import type { ChatInputBarProps } from './types';

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Ask anything about village triage, sites, or comparisons...',
  className = '',
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSubmit();
      }
    }
  };

  return (
    <div
      className={`p-3 border-t border-line dark:border-white/10 bg-surface-0 dark:bg-forest-dark flex items-end gap-2 ${className}`}
    >
      <textarea
        ref={inputRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 max-h-32 min-h-[42px] py-2 px-3 text-sm rounded-lg bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 text-ink dark:text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none disabled:opacity-50"
      />

      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        className="h-[42px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
      >
        <span>Send</span>
      </button>
    </div>
  );
};
