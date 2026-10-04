'use client';

import React, { useState } from 'react';

export interface ChatCopyButtonProps {
  /** Text content to copy to clipboard */
  text: string;
  /** Optional custom CSS classes */
  className?: string;
}

export const ChatCopyButton: React.FC<ChatCopyButtonProps> = ({
  text,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copied to clipboard!' : 'Copy response to clipboard'}
      aria-label="Copy response"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border border-line/60 dark:border-white/10 bg-surface-1/80 dark:bg-forest-surface/80 hover:bg-black/5 dark:hover:bg-white/5 text-text-muted hover:text-ink dark:hover:text-text-primary transition-all cursor-pointer active:scale-95 ${className}`}
    >
      {copied ? (
        <>
          <svg
            className="w-3.5 h-3.5 text-emerald-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            Copied!
          </span>
        </>
      ) : (
        <>
          <svg
            className="w-3.5 h-3.5 opacity-70"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span>Copy</span>
        </>
      )}
    </button>
  );
};
