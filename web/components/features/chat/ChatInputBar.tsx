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
      className={`relative z-20 p-3 sm:p-4 bg-white/95 dark:bg-[#071a12]/95 border-t border-emerald-100/80 dark:border-white/10 backdrop-blur-md ${className}`}
    >
      {/* Floating Container Matching Image 2 */}
      <div className="w-full flex items-center gap-2 p-1.5 sm:p-2 rounded-2xl bg-white dark:bg-[#0c261b] border border-emerald-200/90 dark:border-emerald-500/25 shadow-xs focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
        {/* Leading Sparkle AI Icon */}
        <div className="pl-2 pr-1 text-emerald-700 dark:text-emerald-400 select-none">
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            <path d="M20 3v4" />
            <path d="M22 5h-4" />
          </svg>
        </div>

        {/* Input Textarea */}
        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 max-h-28 min-h-[38px] py-1.5 px-1 text-xs sm:text-sm bg-transparent border-0 text-ink dark:text-text-primary placeholder:text-text-muted focus:outline-none resize-none disabled:opacity-50 leading-relaxed font-sans"
        />

        {/* Trailing Paperclip Attachment Icon (Visual indicator for future multi-modal inputs) */}
        <button
          type="button"
          tabIndex={-1}
          aria-label="Attach file"
          title="Context attachments"
          className="p-1.5 rounded-lg text-text-muted hover:text-text-secondary dark:hover:text-white transition-colors cursor-pointer select-none"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l7.9-7.9" />
          </svg>
        </button>

        {/* Green Send Button with Upward Arrow */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white flex items-center justify-center transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs active:scale-95 shrink-0"
        >
          <svg
            className="w-4 h-4 sm:w-4.5 sm:h-4.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatInputBar;
