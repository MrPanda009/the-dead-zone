'use client';

import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { ChatFloatingTriggerProps } from './types';

export const ChatFloatingTrigger: React.FC<ChatFloatingTriggerProps> = ({
  onClick,
  isOpen = false,
  badgeCount,
  className = '',
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useGSAP(
    () => {
      if (buttonRef.current) {
        gsap.to(buttonRef.current, {
          scale: 1,
          duration: 0.3,
          ease: 'back.out(1.5)',
        });
      }
    },
    { scope: buttonRef },
  );

  if (isOpen) return null;

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      title="Consult Relocation AI Decision Assistant"
      aria-label="Open Relocation Decision Assistant"
      className={`fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/20 border border-emerald-400/30 transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md ${className}`}
    >
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
      </span>

      <span className="text-sm font-semibold tracking-wide flex items-center gap-1.5">
        <span>Relocation AI</span>
        <span className="text-xs opacity-80">⚡</span>
      </span>

      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="px-1.5 py-0.2 rounded-full bg-white text-emerald-700 text-[10px] font-bold">
          {badgeCount}
        </span>
      )}
    </button>
  );
};
