'use client';

import React, { useCallback, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import { PterodactylSprite } from './PterodactylSprite';
import { PixelTrail } from './PixelTrail';
import {
  PTERODACTYL_FLAP_SEQUENCE,
  PTERODACTYL_SPRITE_SIZE,
} from './pterodactylSprite.data';
import {
  createCruiseBob,
  createEarthDrop,
  createFlapLoop,
  createReliefHop,
  createTrailLoop,
} from './pterodactylMotion';
import { usePterodactylScheduler } from './usePterodactylScheduler';
import type {
  AltitudeBand,
  EarthDropCause,
  FlightTrajectory,
  MsRange,
  PterodactylDirection,
  PterodactylDirectionMode,
  PterodactylFlightInfo,
  SummonDirectionMode,
  SummonSequence,
} from './types';

// Module-level cache so React 19 / StrictMode doesn't double-increment in a single page load
let cachedLoadActive: boolean | null = null;

export interface PterodactylFlybyProps {
  /** Master toggle to enable or disable easter egg */
  enabled?: boolean;
  /**
   * When true, the pterodactyl only automatically appears on alternating page loads
   * (e.g. Load 1: appears, Load 2: skips, Load 3: appears, ...).
   * Manual key summon ('ptero' / 'petro') remains accessible on every load.
   * @default true
   */
  everyOtherLoad?: boolean;
  /** Storage key used in localStorage to track alternate loads */
  loadStorageKey?: string;
  /** Flight direction across viewport for automated flights ('ltr' | 'rtl' | 'random') */
  direction?: PterodactylDirectionMode;
  /**
   * Flight direction preference when summoned via keyboard ('ltr' | 'rtl' | 'random' | 'alternate').
   * @default 'alternate' (begins on the left side, then alternates between left and right)
   */
  summonDirection?: SummonDirectionMode;
  /**
   * Probability (0 to 1) of choosing a slanted (climbing or descending) flight path.
   * @default 0.55
   */
  slantedProbability?: number;
  /** Duration in seconds to cross the screen */
  flightDurationRange?: { min: number; max: number };
  /** Altitude range as fraction of viewport height (0 = top, 1 = bottom) */
  altitudeRange?: AltitudeBand;
  /** Probability (0 to 1) that it spontaneously drops the Earth during flight */
  dropProbability?: number;
  /** Allow clicking the flying pterodactyl to startle it and drop the Earth */
  interactiveDrop?: boolean;
  /** Size multiplier for art pixels (1 gives a compact, crisp retro feel) */
  pixelScale?: number;
  /** Delay before very first flight */
  initialDelay?: MsRange;
  /** Delay between subsequent flights */
  interval?: MsRange;
  /** Secret key sequence(s) to trigger immediate flight (e.g. ['petro', 'ptero']) */
  summonSequence?: SummonSequence | null;
  /** Lifecycle callback when flight begins */
  onFlightStart?: (info: PterodactylFlightInfo) => void;
  /** Lifecycle callback when flight finishes crossing screen */
  onFlightEnd?: (info: PterodactylFlightInfo) => void;
  /** Callback when the Earth is released */
  onEarthDropped?: (cause: EarthDropCause) => void;
  /** Additional CSS class for outer container */
  className?: string;
  /** Granular class styling overrides */
  classNames?: {
    root?: string;
    flyer?: string;
    sprite?: string;
  };
  /** Micro-animation timing customization */
  animation?: {
    flapCycle?: number;
    bobAmplitude?: number;
    bobPeriod?: number;
  };
}

interface ActiveFlight {
  id: number;
  direction: PterodactylDirection;
  trajectory: FlightTrajectory;
  summoned: boolean;
  startAltitudeVw: number;
  endAltitudeVw: number;
  willDropEarth: boolean;
  dropProgress: number; // 0 to 1 along flight path
}

export const PterodactylFlyby: React.FC<PterodactylFlybyProps> = ({
  enabled = true,
  everyOtherLoad = true,
  loadStorageKey = 'setu-ptero-load-count',
  direction = 'random',
  summonDirection = 'alternate',
  slantedProbability = 0.55,
  flightDurationRange = { min: 14, max: 22 },
  altitudeRange = { min: 0.12, max: 0.48 },
  dropProbability = 0.18,
  interactiveDrop = true,
  pixelScale = 1,
  initialDelay = { min: 20000, max: 45000 },
  interval = { min: 50000, max: 110000 },
  summonSequence = ['petro', 'ptero'],
  onFlightStart,
  onFlightEnd,
  onEarthDropped,
  className = '',
  classNames = {},
  animation = {},
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMotionAllowed = enabled && !prefersReducedMotion;

  // Track alternate page loads (Load 1 = active, Load 2 = skipped, Load 3 = active...)
  const [isLoadActive] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !everyOtherLoad) return true;
    if (cachedLoadActive !== null) return cachedLoadActive;
    try {
      const stored = localStorage.getItem(loadStorageKey);
      const prev = stored ? parseInt(stored, 10) : 0;
      const count = Number.isFinite(prev) ? prev + 1 : 1;
      localStorage.setItem(loadStorageKey, count.toString());

      const active = count % 2 === 1;
      cachedLoadActive = active;
      return active;
    } catch {
      return true;
    }
  });

  const [flight, setFlight] = useState<ActiveFlight | null>(null);
  const flightCountRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const flyerRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLDivElement>(null);

  const flapTlRef = useRef<gsap.core.Timeline | null>(null);
  const earthDroppedRef = useRef(false);
  // Starts with 'rtl' so the first summoned flight enters from 'ltr' (left side)
  const lastSummonDirectionRef = useRef<PterodactylDirection>('rtl');

  // Trigger flight from scheduler or summon sequence
  const startFlight = useCallback(
    (summoned: boolean) => {
      if (flight) return; // Already airborne

      let chosenDirection: PterodactylDirection;
      if (summoned) {
        if (summonDirection === 'alternate') {
          const next: PterodactylDirection =
            lastSummonDirectionRef.current === 'ltr' ? 'rtl' : 'ltr';
          lastSummonDirectionRef.current = next;
          chosenDirection = next;
        } else if (summonDirection === 'random') {
          chosenDirection = Math.random() > 0.5 ? 'ltr' : 'rtl';
        } else {
          chosenDirection = summonDirection;
        }
      } else {
        chosenDirection =
          direction === 'random'
            ? Math.random() > 0.5
              ? 'ltr'
              : 'rtl'
            : direction;
      }

      const isSlanted = Math.random() < slantedProbability;
      let trajectory: FlightTrajectory = 'level';
      let startAlt =
        altitudeRange.min +
        Math.random() * (altitudeRange.max - altitudeRange.min);
      let endAlt = startAlt;

      if (isSlanted) {
        const isDescending = Math.random() > 0.45;
        if (isDescending) {
          trajectory = 'descending';
          startAlt = 0.08 + Math.random() * 0.14; // High entry (8% - 22%)
          endAlt = startAlt + 0.22 + Math.random() * 0.28; // Glides down diagonally to (30% - 64%)
        } else {
          trajectory = 'climbing';
          startAlt = 0.44 + Math.random() * 0.22; // Lower entry (44% - 66%)
          endAlt = Math.max(0.06, startAlt - (0.24 + Math.random() * 0.24)); // Climbs diagonally up to (8% - 22%)
        }
      } else {
        // Gentle undulating level cruise
        endAlt = Math.max(0.08, Math.min(0.65, startAlt + (Math.random() - 0.5) * 0.08));
      }

      const willDrop = Math.random() < dropProbability;
      const dropProgress = 0.35 + Math.random() * 0.3; // drops around middle of the screen

      earthDroppedRef.current = false;
      flightCountRef.current += 1;

      const newFlight: ActiveFlight = {
        id: flightCountRef.current,
        direction: chosenDirection,
        trajectory,
        summoned,
        startAltitudeVw: startAlt,
        endAltitudeVw: endAlt,
        willDropEarth: willDrop,
        dropProgress,
      };

      setFlight(newFlight);
      onFlightStart?.({ direction: chosenDirection, trajectory, summoned });
    },
    [altitudeRange, direction, dropProbability, flight, onFlightStart, slantedProbability, summonDirection]
  );

  const { scheduleNext } = usePterodactylScheduler({
    enabled: isMotionAllowed && !flight,
    autoScheduleEnabled: isLoadActive,
    initialDelay,
    interval,
    summonSequence,
    onTrigger: startFlight,
  });

  // Action to release Earth (either auto or user click)
  const dropTheEarth = useCallback(
    (cause: EarthDropCause) => {
      if (earthDroppedRef.current || !flyerRef.current) return;
      earthDroppedRef.current = true;

      const earthEl = flyerRef.current.querySelector('[data-ptero-earth]');
      const bodyEl = flyerRef.current.querySelector('[data-ptero-body]');

      if (earthEl) {
        // Fall distance to bottom of viewport plus margin
        const rect = earthEl.getBoundingClientRect();
        const dist = window.innerHeight - rect.top + 150;
        createEarthDrop({ earth: earthEl, distance: dist });
      }

      if (bodyEl && flapTlRef.current) {
        createReliefHop(bodyEl, flapTlRef.current);
      }

      onEarthDropped?.(cause);
    },
    [onEarthDropped]
  );

  // Animate flight across screen
  useGSAP(
    () => {
      if (!flight || !flyerRef.current) return;

      const flyer = flyerRef.current;
      const spriteEl = spriteRef.current;
      const isLtr = flight.direction === 'ltr';

      const spriteWidth = PTERODACTYL_SPRITE_SIZE.width * pixelScale;
      const offscreenPad = spriteWidth + 100;
      const screenW = window.innerWidth;
      const startX = isLtr ? -offscreenPad : screenW + offscreenPad;
      const endX = isLtr ? screenW + offscreenPad : -offscreenPad;
      const startY = window.innerHeight * flight.startAltitudeVw;
      const endY = window.innerHeight * flight.endAltitudeVw;

      // Compute flight trajectory slant angle
      const deltaX = Math.abs(endX - startX);
      const deltaY = endY - startY;
      const angleRad = Math.atan2(deltaY, deltaX);
      const angleDeg = (angleRad * 180) / Math.PI;
      const flyerRotation = isLtr ? angleDeg : -angleDeg;

      // Reset flyer
      gsap.set(flyer, {
        x: startX,
        y: startY,
        rotation: flyerRotation,
        scaleX: isLtr ? 1 : -1, // Flip when flying Right-to-Left
        pointerEvents: 'auto',
      });

      // 1. Wing flap loop
      const frameEls = Array.from(flyer.querySelectorAll('[data-ptero-frame]'));
      const bodyEl = flyer.querySelector('[data-ptero-body]');
      const flapTl = createFlapLoop({
        frames: frameEls,
        sequence: PTERODACTYL_FLAP_SEQUENCE,
        cycle: animation.flapCycle ?? 0.42,
        liftTarget: bodyEl,
        liftAmplitude: 3,
      });
      flapTlRef.current = flapTl;

      // 2. Cruise bobbing
      let bobTween: gsap.core.Tween | null = null;
      if (spriteEl) {
        bobTween = createCruiseBob(
          spriteEl,
          animation.bobAmplitude ?? 10,
          animation.bobPeriod ?? 2.1
        );
      }

      // 3. Pixel particle trail
      const specks = Array.from(flyer.querySelectorAll('[data-ptero-speck]'));
      let trailTl: gsap.core.Timeline | null = null;
      if (specks.length > 0) {
        trailTl = createTrailLoop(specks);
      }

      // 4. Main flight tween across viewport
      const duration =
        flightDurationRange.min +
        Math.random() * (flightDurationRange.max - flightDurationRange.min);

      const flightTween = gsap.to(flyer, {
        x: endX,
        y: endY,
        duration,
        ease: 'none',
        onUpdate: () => {
          if (
            flight.willDropEarth &&
            !earthDroppedRef.current &&
            flightTween.progress() >= flight.dropProgress
          ) {
            dropTheEarth('random');
          }
        },
        onComplete: () => {
          onFlightEnd?.({
            direction: flight.direction,
            trajectory: flight.trajectory,
            summoned: flight.summoned,
          });
          setFlight(null);
          scheduleNext();
        },
      });

      return () => {
        flightTween.kill();
        flapTl.kill();
        bobTween?.kill();
        trailTl?.kill();
      };
    },
    {
      scope: containerRef,
      dependencies: [flight, pixelScale, flightDurationRange, animation, dropTheEarth, onFlightEnd, scheduleNext],
    }
  );

  if (!isMotionAllowed) return null;

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={`fixed inset-0 pointer-events-none z-30 overflow-hidden ${className} ${classNames.root ?? ''}`}
    >
      {flight && (
        <div
          ref={flyerRef}
          onClick={interactiveDrop ? () => dropTheEarth('click') : undefined}
          title={interactiveDrop ? 'Click to surprise!' : undefined}
          className={`absolute top-0 left-0 select-none cursor-pointer opacity-80 hover:opacity-100 transition-opacity duration-300 ${classNames.flyer ?? ''}`}
          style={{ willChange: 'transform' }}
        >
          <div ref={spriteRef} className="relative">
            <PixelTrail size={Math.max(1, Math.round(pixelScale * 1.5))} />
            <PterodactylSprite
              pixelScale={pixelScale}
              className={classNames.sprite}
            />
          </div>
        </div>
      )}
    </div>
  );
};
