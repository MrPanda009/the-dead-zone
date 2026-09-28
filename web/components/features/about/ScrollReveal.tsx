'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import type { ScrollRevealProps } from './types';

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  direction = 'up',
  distance = 48,
  duration = 0.9,
  delay = 0,
  stagger = 0,
  ease = 'power3.out',
  threshold = 0.12,
  className = '',
  as: Component = 'div',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasEntered, setHasEntered] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasEntered(true);
          observer.unobserve(el);
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  useGSAP(
    () => {
      if (!hasEntered || !containerRef.current) return;

      if (prefersReducedMotion) {
        gsap.set(containerRef.current, { opacity: 1, x: 0, y: 0, scale: 1 });
        return;
      }

      // Build directional entrance coordinates
      const fromVars: gsap.TweenVars = { opacity: 0 };
      const toVars: gsap.TweenVars = {
        opacity: 1,
        duration,
        delay,
        ease,
      };

      if (direction === 'left') {
        fromVars.x = -distance;
        toVars.x = 0;
      } else if (direction === 'right') {
        fromVars.x = distance;
        toVars.x = 0;
      } else if (direction === 'down') {
        fromVars.y = -distance;
        toVars.y = 0;
      } else if (direction === 'up') {
        fromVars.y = distance;
        toVars.y = 0;
      }

      if (stagger > 0) {
        // Animate immediate children with stagger
        const targets = containerRef.current.children;
        gsap.fromTo(
          targets,
          { ...fromVars, scale: 0.96 },
          {
            ...toVars,
            scale: 1,
            stagger,
          }
        );
      } else {
        // Animate the root element
        gsap.fromTo(
          containerRef.current,
          { ...fromVars, scale: 0.98 },
          {
            ...toVars,
            scale: 1,
          }
        );
      }
    },
    {
      scope: containerRef,
      dependencies: [hasEntered, direction, distance, duration, delay, stagger, ease, prefersReducedMotion],
    }
  );

  const DynamicComponent = Component as React.ElementType;

  return (
    <DynamicComponent
      ref={containerRef}
      className={`will-change-transform ${
        !hasEntered && !prefersReducedMotion ? 'opacity-0' : 'opacity-100'
      } ${className}`}
    >
      {children}
    </DynamicComponent>
  );
};
