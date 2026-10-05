'use client';

import React, { useEffect, useRef } from 'react';
import type { ChatMessageListProps } from './types';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatToolLoadingSteps } from './ChatToolLoadingSteps';
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

  const lastUserMsg = messages.filter((m) => m.role === 'user').slice(-1)[0]?.content;

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
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
            <span>SETU Relocation Assistant</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">Processing Question...</span>
          </div>
          <ChatToolLoadingSteps userQuestion={lastUserMsg} district={district} />
        </div>
      )}
    </div>
  );
};

export default ChatMessageList;
