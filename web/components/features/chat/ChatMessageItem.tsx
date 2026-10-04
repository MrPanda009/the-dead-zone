'use client';

import React from 'react';
import type { ChatMessageItemProps } from './types';
import { ChatCitationBadge } from './ChatCitationBadge';
import { ChatMessageMarkdown } from './ChatMessageMarkdown';
import { ChatCopyButton } from './ChatCopyButton';

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  className = '',
}) => {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex flex-col gap-2 ${
        isUser ? 'items-end' : 'items-start'
      } ${className}`}
    >
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <span>{isUser ? 'You' : 'SETU Relocation Assistant'}</span>
        <span>•</span>
        <span>
          {new Date(message.timestamp ?? Date.now()).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      <div
        className={`max-w-[95%] sm:max-w-[90%] rounded-xl p-4 text-sm leading-relaxed transition-all shadow-sm ${
          isUser
            ? 'bg-emerald-600 text-white dark:bg-emerald-600 rounded-br-none'
            : 'bg-surface-0 dark:bg-forest-dark border border-line dark:border-white/10 text-ink dark:text-text-primary rounded-bl-none'
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap font-sans">
            {message.content}
          </div>
        ) : (
          <ChatMessageMarkdown content={message.content} />
        )}

        {/* Tools executed pill */}
        {!isUser && message.toolsCalled && message.toolsCalled.length > 0 && (
          <div className="mt-3 pt-3 border-t border-line/50 dark:border-white/10 flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
            <span className="font-mono text-[11px] opacity-75">Tools executed:</span>
            {message.toolsCalled.map((tool) => (
              <span
                key={tool}
                className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 font-mono text-[10px] text-text-secondary"
              >
                {tool}()
              </span>
            ))}
          </div>
        )}

        {/* Citations section */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-line/40 dark:border-white/10 flex flex-wrap items-center gap-1.5">
            {message.citations.map((c, idx) => (
              <ChatCitationBadge key={`${c.source}-${idx}`} citation={c} />
            ))}
          </div>
        )}

        {/* Assistant action footer (Copy to clipboard button) */}
        {!isUser && (
          <div className="mt-3 pt-2.5 border-t border-line/40 dark:border-white/10 flex items-center justify-between">
            <div className="text-[11px] font-mono text-text-muted">
              Grounded Resettlement Brief
            </div>
            <ChatCopyButton text={message.content} />
          </div>
        )}
      </div>
    </div>
  );
};
