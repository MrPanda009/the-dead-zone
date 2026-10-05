'use client';

import React, { useState, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { ChatToolExecutionBadgeProps } from './types';

export const ChatToolExecutionBadge: React.FC<ChatToolExecutionBadgeProps> = ({
  execution,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!detailsRef.current) return;
      if (isExpanded) {
        gsap.fromTo(
          detailsRef.current,
          { height: 0, opacity: 0, y: -4 },
          { height: 'auto', opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' },
        );
      }
    },
    { scope: containerRef, dependencies: [isExpanded] },
  );

  const argEntries = Object.entries(execution.arguments || {});

  return (
    <div
      ref={containerRef}
      className={`inline-flex flex-col text-xs font-mono transition-all ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-line dark:border-white/10 bg-surface-1 dark:bg-forest-surface hover:bg-black/5 dark:hover:bg-white/5 text-ink dark:text-text-primary transition-all cursor-pointer group"
        title="Click to view tool execution parameters and database query details"
      >
        <span className="text-emerald-500 font-bold text-[11px] group-hover:rotate-45 transition-transform">
          ⚡
        </span>
        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
          {execution.name}()
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span className="text-[10px] text-text-muted uppercase tracking-wider ml-0.5">
          {execution.status}
        </span>
        <span className="text-[10px] opacity-60 ml-0.5">
          {isExpanded ? '▲' : '▼'}
        </span>
      </button>

      {isExpanded && (
        <div
          ref={detailsRef}
          className="mt-1.5 p-2.5 rounded-lg border border-line dark:border-white/10 bg-surface-0 dark:bg-forest-dark shadow-sm text-left space-y-1.5 max-w-sm overflow-hidden"
        >
          {execution.description && (
            <p className="text-[11px] text-text-secondary leading-snug">
              {execution.description}
            </p>
          )}

          <div className="flex items-center gap-1.5 text-[10px] text-text-muted pt-1 border-t border-line/40 dark:border-white/10">
            <span className="font-semibold text-text-primary">Source:</span>
            <span>{execution.data_source}</span>
          </div>

          {argEntries.length > 0 && (
            <div className="pt-1 border-t border-line/40 dark:border-white/10 text-[10px]">
              <span className="font-semibold text-text-primary block mb-0.5">Arguments:</span>
              <div className="bg-black/5 dark:bg-white/5 rounded p-1.5 space-y-0.5">
                {argEntries.map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400">{k}:</span>
                    <span className="text-text-muted truncate max-w-[180px]">
                      {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
