'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export interface FooterBrandProps {
  /** Optional custom className */
  className?: string;
  /** Optional custom emblem slot (defaults to pterodactyl icon) */
  emblem?: React.ReactNode;
}

export const FooterBrand: React.FC<FooterBrandProps> = ({
  className = '',
  emblem,
}) => {
  return (
    <div className={`flex flex-col items-start gap-1.5 ${className}`}>
      <Link
        href="/"
        className="flex items-center gap-2.5 group transition-transform active:scale-95"
      >
        {/* Emblem Crest */}
        {emblem ?? (
          <div className="w-7 h-7 rounded-md bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/15 flex items-center justify-center shadow-xs overflow-hidden p-0.5 group-hover:border-accent/40 transition-colors">
            <Image
              src="/icon.png"
              alt="TERRA Pterodactyl Emblem"
              width={24}
              height={24}
              className="w-full h-full object-contain [image-rendering:pixelated]"
            />
          </div>
        )}
        <div className="flex items-baseline gap-2">
          <span className="font-display font-bold text-sm tracking-tight text-ink dark:text-text-primary group-hover:text-accent transition-colors">
            TERRA
          </span>
          <span className="text-[11px] font-mono text-ink-muted dark:text-text-muted">
            v1.0
          </span>
        </div>
      </Link>

      <p className="text-xs text-ink-muted dark:text-text-secondary max-w-md leading-relaxed">
        TERRA · Terrain-based Environmental Risk and Relocation Analytics · Disaster Management Division · Ministry of Home Affairs · Government of India.
      </p>
    </div>
  );
};

