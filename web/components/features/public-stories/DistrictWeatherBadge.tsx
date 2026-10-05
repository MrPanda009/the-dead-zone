'use client';

import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { WeatherState } from '@/lib/api/types';

export interface DistrictWeatherBadgeProps {
  /** Dynamic weather state from Route 1 live forecast architecture */
  state?: WeatherState;
  /** Alias for state */
  weatherState?: WeatherState;
  /** Number of danger cells crossing MHI >= 0.75 threshold in current cycle */
  dangerCellsCount?: number;
  /** Timestamp of the latest cycle execution */
  lastCycleAt?: string | null;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show descriptive subtitle / caption */
  showCaption?: boolean;
  /** Optional click handler */
  onClick?: () => void;
  /** Additional root className */
  className?: string;
  /** Granular styling overrides */
  classNames?: {
    root?: string;
    badge?: string;
    dot?: string;
    caption?: string;
  };
}

export const DistrictWeatherBadge: React.FC<DistrictWeatherBadgeProps> = ({
  state = 'CLEAR',
  weatherState,
  dangerCellsCount = 0,
  lastCycleAt,
  size = 'md',
  showCaption = false,
  onClick,
  className = '',
  classNames = {},
}) => {
  const activeState = weatherState ?? state;
  const containerRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current,
      { scale: 0.96, opacity: 0.8 },
      { scale: 1, opacity: 1, duration: 0.3, ease: 'power2.out' },
    );

    if (dotRef.current && activeState === 'CLEAR') {
      gsap.to(dotRef.current, {
        scale: 1.3,
        opacity: 0.7,
        repeat: -1,
        yoyo: true,
        duration: 1.2,
        ease: 'sine.inOut',
      });
    }
  }, { scope: containerRef, dependencies: [activeState, dangerCellsCount] });

  const isClear = activeState === 'CLEAR' || (dangerCellsCount === 0 && Boolean(lastCycleAt));
  const isAlert = activeState === 'ALERT_ACTIVE' || dangerCellsCount > 0;

  // Format relative cycle time deterministically to prevent SSR hydration mismatch
  const formattedCycle = React.useMemo(() => {
    if (!lastCycleAt) return null;
    try {
      const d = new Date(lastCycleAt);
      if (isNaN(d.getTime())) return null;
      const hours = d.getUTCHours().toString().padStart(2, '0');
      const mins = d.getUTCMinutes().toString().padStart(2, '0');
      return `${hours}:${mins} UTC`;
    } catch {
      return null;
    }
  }, [lastCycleAt]);

  const sizeClasses = {
    sm: 'text-[9px] px-2 py-0.5 gap-1',
    md: 'text-[10px] sm:text-[11px] px-2.5 py-1 gap-1.5',
    lg: 'text-xs px-3 py-1.5 gap-2',
  }[size];

  const dotSizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  }[size];

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className={`inline-flex flex-col select-none ${onClick ? 'cursor-pointer hover:opacity-95' : ''} ${classNames.root ?? ''} ${className}`}
    >
      <div
        className={`inline-flex items-center rounded-full font-mono uppercase font-bold tracking-wider border transition-all ${sizeClasses} ${
          isClear
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.12)]'
            : isAlert
            ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/35 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
            : 'bg-surface-2 dark:bg-white/10 text-ink-muted dark:text-cream/60 border-line dark:border-white/10'
        } ${classNames.badge ?? ''}`}
      >
        {/* State Indicator Dot */}
        <span
          ref={dotRef}
          className={`rounded-full shrink-0 ${dotSizeClasses} ${
            isClear
              ? 'bg-emerald-500'
              : isAlert
              ? 'bg-red-500 animate-pulse'
              : 'bg-zinc-400 dark:bg-zinc-500'
          } ${classNames.dot ?? ''}`}
        />

        {/* Status Text */}
        <span>
          {isClear
            ? 'Clear Weather • 0 Alerts'
            : isAlert
            ? `${dangerCellsCount} Danger Cell${dangerCellsCount === 1 ? '' : 's'} Active`
            : 'Baseline Monitored'}
        </span>

        {/* Cycle time tag if provided */}
        {formattedCycle && (
          <span
            suppressHydrationWarning
            className="opacity-70 font-normal border-l border-current/25 pl-1.5 normal-case tracking-normal"
          >
            Cycle {formattedCycle}
          </span>
        )}
      </div>

      {/* Explanatory Caption for Clear Weather */}
      {showCaption && (
        <span className={`text-[10px] font-sans mt-1 text-ink-faint dark:text-cream/50 ${classNames.caption ?? ''}`}>
          {isClear
            ? 'Peak forecast rainfall envelope < 10mm/h. Zero alert threshold crossings predicted across 72h window.'
            : isAlert
            ? 'Forecast rainfall intensity exceeds emergency trigger envelope. Extreme caution in lowlands and steep slopes.'
            : 'Permanent geological baseline risk monitoring active.'}
        </span>
      )}
    </div>
  );
};

export default DistrictWeatherBadge;
