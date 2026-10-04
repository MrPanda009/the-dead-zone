'use client';

import React, { useEffect, useRef } from 'react';
import type { ChatMessageListProps } from './types';
import { ChatMessageItem } from './ChatMessageItem';

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  isLoading = false,
  className = '',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isLoading]);

  return (
    <div
      ref={scrollRef}
      className={`flex-1 overflow-y-auto p-4 space-y-4 ${className}`}
    >
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-text-muted space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl font-bold">
            ⚡
          </div>
          <h4 className="font-semibold text-ink dark:text-text-primary">
            Relocation Decision Assistant
          </h4>
          <p className="text-xs max-w-xs leading-relaxed">
            Ask any question about village triage priorities, carrying capacity deficits, or compare SETU's plan against external GIS recommendations.
          </p>
        </div>
      )}

      {messages.map((msg) => (
        <ChatMessageItem key={msg.id} message={msg} />
      ))}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-text-muted bg-surface-0 dark:bg-forest-dark border border-line dark:border-white/10 rounded-xl p-3 w-fit">
          <span className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
          </span>
          <span className="text-xs font-mono">Querying PostGIS pipeline & reasoning...</span>
        </div>
      )}
    </div>
  );
};
