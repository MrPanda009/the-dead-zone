'use client';

import React, { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { triggerForecastRecalculation } from '@/lib/api/alerts';
import { ApiError } from '@/lib/api/client';

export interface ForecastTriggerButtonProps {
  /** Target district slug or undefined for all operational districts */
  districtKey?: string;
  /** Alias for districtKey */
  district?: string;
  /** Callback fired after trigger is accepted */
  onTriggerSuccess?: (runId: string) => void;
  /** Alias for onTriggerSuccess */
  onSuccess?: (runId?: string) => void;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional root className */
  className?: string;
}

export const ForecastTriggerButton: React.FC<ForecastTriggerButtonProps> = ({
  districtKey,
  district,
  onTriggerSuccess,
  onSuccess,
  size = 'sm',
  className = '',
}) => {
  const effectiveDistrict = district ?? districtKey;
  const handleSuccess = onTriggerSuccess ?? onSuccess;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  const [isPending, setIsPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPending) return;

    setIsPending(true);
    setFeedback(null);

    // Tactile press & spin
    if (iconRef.current) {
      gsap.to(iconRef.current, {
        rotation: '+=360',
        duration: 0.8,
        repeat: -1,
        ease: 'linear',
      });
    }

    try {
      const res = await triggerForecastRecalculation({
        district: effectiveDistrict ? effectiveDistrict.toLowerCase() : undefined,
        live: true,
        dry_run: false,
      });

      setFeedback('Enqueued (202 Accepted)');
      handleSuccess?.(res.run_id);

      setTimeout(() => {
        setFeedback(null);
      }, 4000);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Trigger failed';
      setFeedback(msg);
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setIsPending(false);
      if (iconRef.current) {
        gsap.killTweensOf(iconRef.current);
        gsap.set(iconRef.current, { rotation: 0 });
      }
    }
  };

  useGSAP(() => {
    if (!buttonRef.current) return;
    const btn = buttonRef.current;

    const handleMouseEnter = () => gsap.to(btn, { scale: 1.02, duration: 0.2 });
    const handleMouseLeave = () => gsap.to(btn, { scale: 1, duration: 0.2 });
    const handleMouseDown = () => gsap.to(btn, { scale: 0.97, duration: 0.1 });
    const handleMouseUp = () => gsap.to(btn, { scale: 1.02, duration: 0.1 });

    btn.addEventListener('mouseenter', handleMouseEnter);
    btn.addEventListener('mouseleave', handleMouseLeave);
    btn.addEventListener('mousedown', handleMouseDown);
    btn.addEventListener('mouseup', handleMouseUp);

    return () => {
      btn.removeEventListener('mouseenter', handleMouseEnter);
      btn.removeEventListener('mouseleave', handleMouseLeave);
      btn.removeEventListener('mousedown', handleMouseDown);
      btn.removeEventListener('mouseup', handleMouseUp);
    };
  }, { scope: buttonRef });

  const isSmall = size === 'sm';

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        disabled={isPending}
        title="Trigger immediate Route 1 ECMWF IFS HRES live forecast recalculation"
        className={`inline-flex items-center gap-1.5 font-mono uppercase tracking-wider rounded-lg transition-colors cursor-pointer border ${
          isSmall ? 'text-[10px] px-2 py-1' : 'text-xs px-2.5 py-1.5'
        } ${
          isPending
            ? 'bg-surface-2 text-ink-muted border-line dark:border-white/10 opacity-70'
            : 'bg-surface-1 dark:bg-white/10 hover:bg-surface-2 dark:hover:bg-white/15 text-ink-muted dark:text-cream/80 border-line dark:border-white/15 shadow-xs'
        }`}
      >
        <span
          ref={iconRef}
          className="material-symbols-outlined text-xs inline-block"
        >
          sync
        </span>
        <span>{isPending ? 'Recalculating…' : 'Run Live ECMWF'}</span>
      </button>

      {feedback && (
        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          {feedback}
        </span>
      )}
    </div>
  );
};

export default ForecastTriggerButton;
