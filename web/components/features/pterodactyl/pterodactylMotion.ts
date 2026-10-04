import gsap from 'gsap';

/**
 * GSAP factories for the pterodactyl easter egg. Each returns a tween/timeline so
 * the caller (`PterodactylFlyby`) owns lifecycle and cleanup.
 */

export interface FlapLoopOptions {
  /** `[data-ptero-frame]` elements, index-aligned with frame numbers */
  frames: Element[];
  /** Frame order for one full wing beat */
  sequence: readonly number[];
  /** Seconds per full wing beat */
  cycle: number;
  /** Element nudged upward on each down-stroke (wing lift) */
  liftTarget?: Element | null;
  /** Lift amplitude in px */
  liftAmplitude?: number;
}

/** Stepped sprite-sheet flap + body lift synced to the down-stroke. */
export function createFlapLoop({
  frames,
  sequence,
  cycle,
  liftTarget,
  liftAmplitude = 1.2,
}: FlapLoopOptions): gsap.core.Timeline {
  const state = { i: 0 };
  let shown = -1;
  const show = (idx: number) => {
    if (idx === shown) return;
    frames.forEach((f, k) => f.setAttribute('visibility', k === idx ? 'visible' : 'hidden'));
    shown = idx;
  };

  const tl = gsap.timeline({ repeat: -1 });
  tl.fromTo(
    state,
    { i: 0 },
    {
      i: sequence.length,
      duration: cycle,
      ease: 'none',
      onUpdate: () => show(sequence[Math.min(sequence.length - 1, Math.floor(state.i))]),
    },
    0
  );
  if (liftTarget) {
    tl.fromTo(
      liftTarget,
      { y: liftAmplitude },
      { y: -liftAmplitude, duration: cycle / 2, ease: 'sine.inOut', yoyo: true, repeat: 1 },
      0
    );
  }
  return tl;
}

/** Lazy sine bob + tilt layered over the straight flight path. */
export function createCruiseBob(target: Element, amplitude = 4, period = 2.4): gsap.core.Tween {
  return gsap.fromTo(
    target,
    { y: -amplitude, rotation: -1.5 },
    { y: amplitude, rotation: 1.5, duration: period / 2, ease: 'sine.inOut', yoyo: true, repeat: -1 }
  );
}

/** Drifting, fading pixel specks behind the tail (the icon's speed dots). */
export function createTrailLoop(specks: Element[]): gsap.core.Timeline {
  const tl = gsap.timeline();
  specks.forEach((speck, i) => {
    tl.fromTo(
      speck,
      { x: 0, y: 'random(-3, 3)', opacity: 0.55, scale: 1 },
      {
        x: 'random(-35, -15)',
        y: 'random(-1, 8)',
        opacity: 0,
        scale: 0.4,
        duration: 'random(0.5, 0.85)',
        ease: 'power1.out',
        repeat: -1,
        repeatRefresh: true,
      },
      i * 0.12
    );
  });
  return tl;
}

export interface EarthDropOptions {
  /** `[data-ptero-earth]` layer */
  earth: Element;
  /** Fall distance in px (until safely below the viewport) */
  distance: number;
  /** Gravity in px/s² — sets fall duration for a quadratic ease */
  gravity?: number;
  /** Horizontal drift behind the bird during the fall, px (negative = behind) */
  drag?: number;
}

/** Wobble ("uh-oh") then a gravity-eased, spinning fall. */
export function createEarthDrop({
  earth,
  distance,
  gravity = 2400,
  drag = -50,
}: EarthDropOptions): gsap.core.Timeline {
  const fall = Math.sqrt((2 * distance) / gravity);
  return gsap
    .timeline()
    .to(earth, { rotation: -12, duration: 0.09, ease: 'power1.out' })
    .to(earth, { rotation: 9, duration: 0.09, ease: 'power1.inOut' })
    .to(earth, { rotation: 0, y: 4, duration: 0.08, ease: 'power1.in' })
    .to(earth, { y: distance, duration: fall, ease: 'power2.in' })
    .to(earth, { x: drag, rotation: 300, duration: fall, ease: 'power1.in' }, '<')
    .set(earth, { autoAlpha: 0 });
}

/** Startled hop + frantic flapping after losing the payload. */
export function createReliefHop(target: Element, flap: gsap.core.Timeline): gsap.core.Timeline {
  return gsap
    .timeline()
    .to(target, { yPercent: -28, duration: 0.55, ease: 'back.out(2.2)' })
    .to(flap, { timeScale: 1.9, duration: 0.15 }, 0)
    .to(flap, { timeScale: 1, duration: 0.8, ease: 'power1.inOut' }, 1.2);
}
