'use client';

import React, { useCallback, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, M3_DURATION, M3_EASE } from '@/lib/motion/m3';
import { StateLayer, type StateLayerHandle } from '@/components/ui/state-layer';
import { ContainerTransformLink } from '@/components/layout/transition';

export interface PortalAccessButtonProps {
  /** Destination route (default '/login') */
  href?: string;
  /** Label text (default 'Portal Access') */
  label?: string;
  /** Optional click handler */
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  /** Custom root className */
  className?: string;
  /** Suppress the hover tween and ripple */
  disableAnimation?: boolean;
}

export const PortalAccessButton: React.FC<PortalAccessButtonProps> = ({
  href = '/login',
  label = 'Portal Access',
  onClick,
  className = '',
  disableAnimation = false,
}) => {
  const containerRef = useRef<HTMLAnchorElement>(null);
  const stateLayerRef = useRef<StateLayerHandle>(null);

  useGSAP(
    () => {
      const el = containerRef.current;
      if (!el || disableAnimation) return;
      const icon = el.querySelector('.portal-icon');

      const onEnter = () => {
        gsap.to(el, { scale: 1.04, duration: M3_DURATION.short4, ease: M3_EASE.emphasized });
        if (icon) {
          gsap.to(icon, { x: 2, y: -2, duration: M3_DURATION.short4, ease: M3_EASE.emphasized });
        }
      };

      const onLeave = () => {
        gsap.to(el, { scale: 1, duration: M3_DURATION.medium2, ease: M3_EASE.standard });
        if (icon) {
          gsap.to(icon, { x: 0, y: 0, duration: M3_DURATION.medium2, ease: M3_EASE.standard });
        }
      };

      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mouseleave', onLeave);

      return () => {
        el.removeEventListener('mouseenter', onEnter);
        el.removeEventListener('mouseleave', onLeave);
      };
    },
    { scope: containerRef, dependencies: [disableAnimation] }
  );

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    stateLayerRef.current?.spawn(event);
  }, []);

  return (
    <ContainerTransformLink
      ref={containerRef}
      href={href}
      onClick={onClick}
      onPointerDown={handlePointerDown}
      className={`group m3-state-layer inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-m3-dock-inverse text-m3-dock-on-inverse border border-m3-dock-outline text-xs font-semibold shadow-m3-1 transition-colors duration-200 ease-m3-standard cursor-pointer select-none ${className}`}
    >
      <StateLayer ref={stateLayerRef} disabled={disableAnimation} />
      <span className="portal-icon material-symbols-outlined text-[17px]">open_in_new</span>
      <span>{label}</span>
    </ContainerTransformLink>
  );
};
