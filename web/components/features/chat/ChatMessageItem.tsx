'use client';

import React from 'react';
import type { ChatMessageItemProps } from './types';
import { ChatCitationBadge } from './ChatCitationBadge';
import { ChatMessageMarkdown } from './ChatMessageMarkdown';
import { ChatCopyButton } from './ChatCopyButton';

import { ChatToolExecutionBadge } from './ChatToolExecutionBadge';

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

        {/* Tools executed trace */}
        {!isUser && ((message.toolExecutions && message.toolExecutions.length > 0) || (message.toolsCalled && message.toolsCalled.length > 0)) && (
          <div className="mt-3 pt-3 border-t border-line/50 dark:border-white/10 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <span className="font-mono text-[11px] opacity-75">Tools executed in pipeline:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {message.toolExecutions && message.toolExecutions.length > 0
                ? message.toolExecutions.map((exec, idx) => (
                    <ChatToolExecutionBadge key={`${exec.name}-${idx}`} execution={exec} />
                  ))
                : message.toolsCalled?.map((tool) => (
                    <ChatToolExecutionBadge
                      key={tool}
                      execution={{
                        name: tool,
                        description: `Executed pipeline tool ${tool}`,
                        arguments: {},
                        status: 'completed',
                        data_source: 'PostgreSQL / PostGIS',
                      }}
                    />
                  ))}
            </div>
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

        {/* Fallback reason indicator */}
        {!isUser && message.fallbackUsed && (
          <div className="mt-3 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2">
            <span className="text-sm leading-none mt-0.5">ℹ️</span>
            <div className="flex-1">
              <span className="font-semibold font-mono text-[11px] block text-amber-800 dark:text-amber-300">
                Deterministic Database Synthesis (Offline Guard)
              </span>
              <span className="text-[11px] opacity-90 leading-tight">
                {message.fallbackReason || 'Grounded strictly via PostGIS queries because the upstream LLM service was unreachable or rate-limited.'}
              </span>
            </div>
          </div>
        )}

        {/* Assistant action footer (Copy to clipboard button) */}
        {!isUser && (
          <div className="mt-3 pt-2.5 border-t border-line/40 dark:border-white/10 flex items-center justify-between">
            <div className="text-[11px] font-mono text-text-muted">
              {message.fallbackUsed ? 'PostGIS Verified Data' : 'Grounded Resettlement Brief'}
            </div>
            <ChatCopyButton text={message.content} />
          </div>
        )}
      </div>
    </div>
  );
};
