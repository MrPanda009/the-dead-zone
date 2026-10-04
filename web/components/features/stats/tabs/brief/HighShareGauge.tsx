'use client';

import { useRef, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { HexMarker } from '@/components/common/HexMarker';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import { HIGH_SHARE_THRESHOLD } from '@/lib/stats/derive';

export interface HighShareGaugeProps {
  /** Percentage of cells in the high bands, or null when there is no computed layer. */
  value: number | null;
  title?: ReactNode;
  /** States the threshold, so the number is never read as a generic "risk share". */
  caption?: ReactNode;
  unavailableLabel?: ReactNode;
  animation?: { disabled?: boolean; duration?: number };
  className?: string;
  classNames?: {
    root?: string;
    ring?: string;
    value?: string;
    title?: string;
    caption?: string;
  };
}

const HEX_POINTS = '32,4 58,19 58,45 32,60 6,45 6,19';

/** Hexagonal ring showing the share of modelled cells with susceptibility in the high bands. */
export const HighShareGauge = ({
  value,
  title = 'High susceptibility share',
  caption = `Share of modelled cells with susceptibility ≥ ${HIGH_SHARE_THRESHOLD.toFixed(2)} (high + very high bands).`,
  unavailableLabel = '—',
  animation = {},
  className = '',
  classNames = {},
}: HighShareGaugeProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotion();
  const shown = value === null ? 0 : Math.min(100, Math.max(0, value));

  useGSAP(
    () => {
      const ring = rootRef.current?.querySelector<SVGPolygonElement>('.gauge-ring');
      if (!ring) return;
      const target = 100 - shown;
      if (reduceMotion || animation.disabled) {
        gsap.set(ring, { strokeDashoffset: target });
        return;
      }
      gsap.fromTo(
        ring,
        { strokeDashoffset: 100 },
        { strokeDashoffset: target, duration: animation.duration ?? 0.7, ease: 'power3.out' },
      );
    },
    { scope: rootRef, dependencies: [shown, reduceMotion, animation.disabled, animation.duration] },
  );

  return (
    <div
      ref={rootRef}
      className={[
        'p-3 rounded-xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 flex items-center gap-3.5 shrink-0',
        classNames.root ?? '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={['relative w-16 h-16 shrink-0 flex items-center justify-center', classNames.ring ?? ''].join(' ')}>
        <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
          <polygon
            points={HEX_POINTS}
            fill="rgba(239,68,68,0.08)"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-surface-2 dark:text-white/15"
          />
          <polygon
            points={HEX_POINTS}
            pathLength={100}
            fill="none"
            stroke="#ef4444"
            strokeWidth="3.2"
            strokeDasharray={100}
            strokeDashoffset={100}
            strokeLinecap="round"
            className="gauge-ring"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={['text-sm font-bold font-mono text-ink dark:text-white leading-none', classNames.value ?? ''].join(' ')}>
            {value === null ? unavailableLabel : `${Math.round(shown)}%`}
          </span>
        </div>
      </div>

      <div className="space-y-0.5">
        <div className={['text-xs font-bold text-ink dark:text-white flex items-center gap-1.5', classNames.title ?? ''].join(' ')}>
          <HexMarker size="md" colorClass="bg-rose-500" />
          <span>{title}</span>
        </div>
        <div className={['text-[10px] text-text-muted font-mono leading-tight', classNames.caption ?? ''].join(' ')}>
          {caption}
        </div>
      </div>
    </div>
  );
};
