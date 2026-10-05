'use client';

import React, { useEffect, useRef } from 'react';
import type { ChatMessageListProps } from './types';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatEmptyState } from './ChatEmptyState';

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  isLoading = false,
  district = 'Barpeta',
  onSelectPrompt,
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
      className={`relative z-10 flex-1 overflow-y-auto p-4 space-y-4 ${className}`}
    >
      {/* Empty State view when conversation is clean */}
      {messages.length === 0 && onSelectPrompt && (
        <ChatEmptyState
          district={district}
          onSelectPrompt={onSelectPrompt}
        />
      )}

      {/* Message List */}
      {messages.map((msg) => (
        <ChatMessageItem key={msg.id} message={msg} />
      ))}

      {/* Active AI Querying / PostGIS Reasoning State */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-text-muted bg-white/90 dark:bg-[#0c261b] border border-emerald-100 dark:border-emerald-500/20 rounded-2xl p-3 w-fit shadow-xs">
          <span className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
          </span>
          <span className="text-xs font-mono text-emerald-800 dark:text-emerald-300">
            Querying PostGIS pipeline &amp; reasoning…
          </span>
        </div>
      )}
    </div>
  );
};

export default ChatMessageList;
