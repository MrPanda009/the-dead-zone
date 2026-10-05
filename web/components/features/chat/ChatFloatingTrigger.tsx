'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
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
  const spriteRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = buttonRef.current;
      if (!el) return;

      const onEnter = () => {
        gsap.to(el, {
          scale: 1.08,
          duration: 0.25,
          ease: 'back.out(2)',
          boxShadow: '0 12px 32px rgba(210, 248, 63, 0.65)',
        });
        if (spriteRef.current) {
          gsap.to(spriteRef.current, {
            y: -2.5,
            duration: 0.2,
            ease: 'power2.out',
          });
        }
      };

      const onLeave = () => {
        gsap.to(el, {
          scale: 1,
          duration: 0.25,
          ease: 'power2.out',
          boxShadow: '0 8px 24px rgba(210, 248, 63, 0.45)',
        });
        if (spriteRef.current) {
          gsap.to(spriteRef.current, {
            y: 0,
            duration: 0.25,
            ease: 'power2.out',
          });
        }
      };

      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mouseleave', onLeave);

      return () => {
        el.removeEventListener('mouseenter', onEnter);
        el.removeEventListener('mouseleave', onLeave);
      };
    },
    { scope: buttonRef }
  );

  if (isOpen) return null;

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      title="Consult Relocation Decision Assistant"
      aria-label="Open Relocation Decision Assistant"
      className={`fixed bottom-5 sm:bottom-6 right-4 sm:right-6 z-40 w-14 h-14 sm:w-[60px] sm:h-[60px] rounded-full bg-[#d2f83f] hover:bg-[#c2ea2d] border border-black/15 shadow-[0_8px_24px_rgba(210,248,63,0.45)] flex items-center justify-center transition-colors duration-200 cursor-pointer select-none active:scale-95 ${className}`}
    >
      {/* Chat Speech Bubble with Pterodactyl Logo inside (No text) */}
      <div className="relative flex items-center justify-center">
        {/* Sleek Dark Forest Speech Bubble */}
        <svg
          className="w-9 h-9 sm:w-10 sm:h-10 drop-shadow-xs"
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M22 6C13.163 6 6 12.49 6 20.5C6 24.96 8.28 28.89 11.9 31.54C11.5 34.2 10.2 36.6 8.5 38C11.8 38 15.2 36.4 17.5 34.3C18.94 34.76 20.44 35 22 35C30.837 35 38 28.51 38 20.5C38 12.49 30.837 6 22 6Z"
            fill="#071a12"
            stroke="#142e20"
            strokeWidth="1.5"
          />
        </svg>

        {/* Pterodactyl Carrying Earth Vector Sprite Centered Inside Chat Bubble */}
        <div
          ref={spriteRef}
          className="absolute inset-0 flex items-center justify-center pb-0.5 pointer-events-none select-none"
        >
          <div className="w-5.5 h-5.5 sm:w-6 sm:h-6 relative [image-rendering:pixelated]">
            <Image
              src="/pterodactyl.svg"
              alt="Pterodactyl AI Assistant"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      </div>

      {/* Live Pulsing Status Dot on Top-Right Corner */}
      <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-950 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-950 border border-[#d2f83f]" />
      </span>

      {/* Optional Badge Count */}
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-emerald-950 text-[#d2f83f] text-[9px] font-mono font-bold leading-none border border-[#d2f83f]">
          {badgeCount}
        </span>
      )}
    </button>
  );
};

export default ChatFloatingTrigger;
