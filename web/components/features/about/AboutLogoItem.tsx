'use client';

import React from 'react';
import type { AboutLogoItemProps } from './types';

export const AboutLogoItem: React.FC<AboutLogoItemProps> = ({
  data,
  className = '',
}) => {
  return (
    <div
      className={`group px-5 py-3 flex flex-col items-center justify-center text-center transition-all duration-300 hover:-translate-y-1 cursor-default min-w-[120px] sm:min-w-[140px] ${className}`}
    >
      <span className="font-mono text-base sm:text-lg font-bold tracking-widest text-ink/80 dark:text-neutral-200 group-hover:text-citron transition-colors uppercase">
        {data.name}
      </span>
      <span className="text-[11px] font-sans text-text-muted dark:text-neutral-400 max-w-[140px] truncate mt-0.5 group-hover:text-ink dark:group-hover:text-neutral-200 transition-colors font-medium">
        {data.fullName}
      </span>
    </div>
  );
};
