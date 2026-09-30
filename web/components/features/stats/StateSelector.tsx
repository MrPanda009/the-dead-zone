'use client';

import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { StateSelectorProps } from './types';

export const StateSelector: React.FC<StateSelectorProps> = ({
  selectedState,
  onSelectState,
  availableStates,
  disabled = false,
  className = '',
  classNames = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current || availableStates.length === 0) return;
      gsap.from('.state-pill', {
        scale: 0.95,
        opacity: 0,
        duration: 0.3,
        stagger: 0.03,
        ease: 'power2.out',
      });
    },
    { scope: containerRef, dependencies: [availableStates.length] },
  );

  return (
    <div
      ref={containerRef}
      className={`flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none ${classNames.root ?? ''} ${className}`}
    >
      <span className="text-xs font-mono uppercase tracking-wider text-text-muted shrink-0 mr-1 flex items-center gap-1">
        <span className="material-symbols-outlined text-sm">location_on</span>
        <span>State:</span>
      </span>

      {availableStates.map((state) => {
        const isSelected = selectedState.toLowerCase() === state.toLowerCase();
        return (
          <button
            key={state}
            type="button"
            disabled={disabled}
            onClick={() => onSelectState(state)}
            className={`state-pill shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              isSelected
                ? 'bg-citron text-forest-dark font-semibold shadow-[0_0_15px_rgba(212,241,93,0.3)] ring-1 ring-citron/50'
                : 'bg-surface-1 dark:bg-forest-surface text-text-secondary hover:text-ink dark:hover:text-white hover:bg-surface-2 border border-line dark:border-white/10'
            }`}
          >
            <span>{state}</span>
            {isSelected && (
              <span className="w-1.5 h-1.5 rounded-full bg-forest-dark animate-pulse" />
            )}
          </button>
        );
      })}
    </div>
  );
};
