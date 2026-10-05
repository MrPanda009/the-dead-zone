'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
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
  const bubbleRef = useRef<HTMLDivElement>(null);

  // GSAP Pop-in animation for messages (especially user texts popping in dynamically)
  useGSAP(
    () => {
      if (bubbleRef.current) {
        if (isUser) {
          // Playful, tactile spring pop-in for user messages
          gsap.fromTo(
            bubbleRef.current,
            { scale: 0.84, y: 16, opacity: 0 },
            {
              scale: 1,
              y: 0,
              opacity: 1,
              duration: 0.38,
              ease: 'back.out(1.8)',
            }
          );
        } else {
          // Smooth slide and fade for assistant messages
          gsap.fromTo(
            bubbleRef.current,
            { y: 10, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.32,
              ease: 'power2.out',
            }
          );
        }
      }
    },
    { scope: bubbleRef, dependencies: [message.id] }
  );

  return (
    <div
      className={`relative z-10 flex flex-col gap-1.5 ${
        isUser ? 'items-end' : 'items-start'
      } ${className}`}
    >
      {/* Header Info Row */}
      <div className="flex items-center gap-1.5 text-[11px] text-text-muted font-mono px-1">
        {!isUser && (
          <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 border border-emerald-300/60 dark:border-emerald-500/30 flex items-center justify-center overflow-hidden shrink-0 [image-rendering:pixelated]">
            <Image
              src="/pterodactyl.svg"
              alt="Assistant"
              width={14}
              height={14}
              className="object-contain"
            />
          </div>
        )}
        <span className="font-semibold text-text-secondary">
          {isUser ? 'You' : 'SETU Assistant'}
        </span>
        <span>•</span>
        <span>
          {new Date(message.timestamp ?? Date.now()).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* Message Bubble with GSAP Pop-in Ref */}
      <div
        ref={bubbleRef}
        className={`max-w-[92%] sm:max-w-[85%] p-3.5 sm:p-4 text-sm leading-relaxed transition-shadow duration-200 shadow-xs ${
          isUser
            ? 'bg-emerald-600 text-white rounded-2xl rounded-br-xs shadow-emerald-900/10'
            : 'bg-white/95 dark:bg-[#0c261b] border border-emerald-100 dark:border-emerald-500/20 text-slate-800 dark:text-emerald-50 rounded-2xl rounded-bl-xs'
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap font-sans text-white font-normal selection:bg-emerald-800 selection:text-white">
            {message.content}
          </div>
        ) : (
          <ChatMessageMarkdown content={message.content} />
        )}

        {/* Tools executed trace */}
        {!isUser && ((message.toolExecutions && message.toolExecutions.length > 0) || (message.toolsCalled && message.toolsCalled.length > 0)) && (
          <div className="mt-3 pt-3 border-t border-emerald-100/60 dark:border-white/10 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <span className="font-mono text-[10px] uppercase tracking-wider opacity-75">Tools executed in pipeline:</span>
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
          <div className="mt-3 pt-2.5 border-t border-emerald-100/60 dark:border-white/10 flex flex-wrap items-center gap-1.5">
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
          <div className="mt-3 pt-2.5 border-t border-emerald-100/60 dark:border-white/10 flex items-center justify-between">
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              {message.fallbackUsed ? 'PostGIS Verified Data' : 'Grounded Resettlement Brief'}
            </div>
            <ChatCopyButton text={message.content} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessageItem;
