'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { MsRange, SummonSequence } from './types';

export interface UsePterodactylSchedulerOptions {
  /** Master switch (e.g. false under reduced motion) */
  enabled: boolean;
  /** Whether automatic timer scheduling is enabled (default true). If false, manual summon still works. */
  autoScheduleEnabled?: boolean;
  /** Delay before the very first flight */
  initialDelay: MsRange;
  /** Delay between subsequent flights */
  interval: MsRange;
  /** Typed key sequence(s) that summon the bird on demand (e.g. 'petro' or ['petro', 'ptero'], null disables) */
  summonSequence: SummonSequence | null;
  /** Fired when a flight should start */
  onTrigger: (summoned: boolean) => void;
}

const randIn = ({ min, max }: MsRange) => min + Math.random() * Math.max(0, max - min);

const isTypingTarget = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

/**
 * Randomised timer chain + secret key sequence for the flyby easter egg.
 * Skips flights while the tab is hidden so nobody misses the show.
 */
export function usePterodactylScheduler({
  enabled,
  autoScheduleEnabled = true,
  initialDelay,
  interval,
  summonSequence,
  onTrigger,
}: UsePterodactylSchedulerOptions) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef(onTrigger);
  const intervalRef = useRef(interval);

  useEffect(() => {
    triggerRef.current = onTrigger;
    intervalRef.current = interval;
  });

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const arm = useCallback((ms: number) => {
    clear();
    timer.current = setTimeout(function fire() {
      if (document.hidden) {
        timer.current = setTimeout(fire, 5000);
        return;
      }
      timer.current = null;
      triggerRef.current(false);
    }, ms);
  }, []);

  /** Queue the next random flight (call after a flight finishes). */
  const scheduleNext = useCallback(() => {
    if (enabled && autoScheduleEnabled) arm(randIn(intervalRef.current));
  }, [arm, enabled, autoScheduleEnabled]);

  const { min: initMin, max: initMax } = initialDelay;
  useEffect(() => {
    if (!enabled || !autoScheduleEnabled) return;
    arm(randIn({ min: initMin, max: initMax }));
    return clear;
  }, [arm, enabled, autoScheduleEnabled, initMin, initMax]);

  useEffect(() => {
    if (!enabled || !summonSequence) return;
    const seqList = (Array.isArray(summonSequence) ? summonSequence : [summonSequence])
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);

    if (seqList.length === 0) return;
    const maxLen = Math.max(...seqList.map((s) => s.length));

    let buffer = '';
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.key.length !== 1) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-maxLen);
      if (seqList.some((seq) => buffer.endsWith(seq))) {
        buffer = '';
        clear();
        triggerRef.current(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, summonSequence]);

  return { scheduleNext };
}
