'use client';

import React from 'react';
import type { AboutLogoItemProps } from './types';

export const AboutLogoItem: React.FC<AboutLogoItemProps> = ({
  data,
  className = '',
}) => {
  return (
    <div
      className={`group rounded-2xl bg-surface-1/80 dark:bg-white/[0.04] border border-line/70 dark:border-white/10 px-6 py-4 flex flex-col items-center justify-center text-center shadow-sm hover:border-citron/60 dark:hover:border-citron/50 hover:bg-surface-2/60 dark:hover:bg-white/[0.08] hover:-translate-y-1 transition-all duration-300 cursor-default min-w-[130px] sm:min-w-[150px] ${className}`}
    >
      <span className="font-mono text-sm sm:text-base font-extrabold tracking-widest text-ink dark:text-neutral-100 group-hover:text-citron transition-colors uppercase">
        {data.name}
      </span>
      <span className="text-[10px] sm:text-[11px] font-sans text-text-muted dark:text-neutral-400 max-w-[140px] truncate mt-0.5 group-hover:text-text-secondary transition-colors font-medium">
        {data.fullName}
      </span>
    </div>
  );
};
