'use client';

import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';

export type Map3DInteractionMode = 'pan' | 'rotate';

export interface Map3DSideControlsProps {
  /** Current drag interaction mode */
  interactionMode: Map3DInteractionMode;
  /** Callback triggered when user toggles interaction mode */
  onInteractionModeChange: (mode: Map3DInteractionMode) => void;
  /** Zoom in callback */
  onZoomIn: () => void;
  /** Zoom out callback */
  onZoomOut: () => void;
  /** Corner docking position (default: 'bottom-right') */
  position?: 'bottom-right' | 'top-right';
  className?: string;
}

/**
 * Floating side control stack for 3D map navigation, styled matching the 2D GIS
 * MapLibre NavigationControl and floating side panels.
 */
export const Map3DSideControls: React.FC<Map3DSideControlsProps> = ({
  interactionMode,
  onInteractionModeChange,
  onZoomIn,
  onZoomOut,
  position = 'bottom-right',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (prefersReducedMotion || !containerRef.current) return;
      gsap.fromTo(
        containerRef.current,
        { x: 14, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.4,
          ease: 'power3.out',
          clearProps: 'opacity,transform',
        }
      );
    },
    { scope: containerRef },
  );

  const positionClasses =
    position === 'top-right'
      ? 'top-20 right-4'
      : 'bottom-8 right-4';

  return (
    <div
      ref={containerRef}
      className={`pointer-events-auto absolute z-20 flex flex-col items-center gap-1.5 p-1.5 rounded-2xl glass-card border border-line dark:border-white/10 shadow-xl backdrop-blur-xl bg-panel/92 dark:bg-forest-surface/90 ${positionClasses} ${className}`}
    >
      {/* 1. Zoom Controls Stack */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={onZoomIn}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-2 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          title="Zoom In (+)"
          aria-label="Zoom In"
        >
          <span className="material-symbols-outlined text-lg">add</span>
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-2 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          title="Zoom Out (-)"
          aria-label="Zoom Out"
        >
          <span className="material-symbols-outlined text-lg">remove</span>
        </button>
      </div>

      {/* Divider */}
      <div className="w-5 h-px bg-line dark:bg-white/10 my-0.5" />

      {/* 2. Drag / Orbit Interaction Mode Options */}
      <div className="flex flex-col items-center gap-1">
        {/* Hold and Drag Option (Pan like 2D) */}
        <button
          type="button"
          onClick={() => onInteractionModeChange('pan')}
          className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all cursor-pointer active:scale-95 ${
            interactionMode === 'pan'
              ? 'bg-citron text-forest-dark font-bold shadow-sm ring-1 ring-citron/60'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-2 dark:hover:bg-white/10'
          }`}
          title="Hold & Drag (Pan) — Click and drag to move map like the 2D page"
          aria-label="Hold & Drag Mode (Pan like 2D)"
        >
          <span className="material-symbols-outlined text-lg">pan_tool</span>
        </button>

        {/* 3D Orbit / Rotate Option */}
        <button
          type="button"
          onClick={() => onInteractionModeChange('rotate')}
          className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all cursor-pointer active:scale-95 ${
            interactionMode === 'rotate'
              ? 'bg-citron text-forest-dark font-bold shadow-sm ring-1 ring-citron/60'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-2 dark:hover:bg-white/10'
          }`}
          title="3D Orbit (Rotate) — Click and drag to rotate camera angle"
          aria-label="3D Orbit Mode (Rotate angle)"
        >
          <span className="material-symbols-outlined text-lg">3d_rotation</span>
        </button>
      </div>


    </div>
  );
};
