'use client';

import React from 'react';

export interface TouristSafetyTipsProps {
  /** Optional custom root className */
  className?: string;
}

export const TouristSafetyTips: React.FC<TouristSafetyTipsProps> = ({
  className = '',
}) => {
  return (
    <div
      className={`glass-card p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-line dark:border-white/10 bg-surface-0/90 dark:bg-[#0e261d]/90 shadow-md flex flex-col justify-between gap-2.5 text-ink dark:text-cream select-none transition-all ${className}`}
    >
      <div className="flex items-center justify-between border-b border-line/50 dark:border-white/10 pb-1.5 px-0.5">
        <h4 className="text-xs sm:text-[13px] font-bold tracking-tight text-ink dark:text-cream">
          Stay Informed. Stay safe.
        </h4>
        <span className="text-[10px] font-mono text-emerald-700 dark:text-citron uppercase font-semibold">
          Tourist Guidance
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        {/* Tip 1 */}
        <div className="flex items-start gap-2 p-2 rounded-xl bg-surface-1/60 dark:bg-white/5 border border-line/60 dark:border-white/5">
          <span className="material-symbols-outlined text-base text-amber-600 dark:text-citron shrink-0 mt-0.5">
            warning
          </span>
          <span className="text-[11px] font-sans text-ink-muted dark:text-cream/80 leading-snug">
            Weather alerts & landslide warnings in real time.
          </span>
        </div>

        {/* Tip 2 */}
        <div className="flex items-start gap-2 p-2 rounded-xl bg-surface-1/60 dark:bg-white/5 border border-line/60 dark:border-white/5">
          <span className="material-symbols-outlined text-base text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
            water_drop
          </span>
          <span className="text-[11px] font-sans text-ink-muted dark:text-cream/80 leading-snug">
            Monsoon impact & district advisories.
          </span>
        </div>

        {/* Tip 3 */}
        <div className="flex items-start gap-2 p-2 rounded-xl bg-surface-1/60 dark:bg-white/5 border border-line/60 dark:border-white/5">
          <span className="material-symbols-outlined text-base text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
            verified_user
          </span>
          <span className="text-[11px] font-sans text-ink-muted dark:text-cream/80 leading-snug">
            Travel safety tips & emergency contacts.
          </span>
        </div>
      </div>
    </div>
  );
};

export default TouristSafetyTips;
