'use client';

import React from 'react';
import type { ChatCitationBadgeProps } from './types';

export const ChatCitationBadge: React.FC<ChatCitationBadgeProps> = ({
  citation,
  className = '',
}) => {
  const isAuthoritative = citation.provenance === 'authoritative';
  const isExternal = citation.provenance === 'external_gis';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border transition-colors ${
        isAuthoritative
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
          : isExternal
            ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20'
            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
      } ${className}`}
      title={citation.detail}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      <span className="font-semibold">{citation.source}</span>
      {citation.metric && (
        <span className="opacity-75 text-[10px] hidden sm:inline">
          ({citation.metric})
        </span>
      )}
    </span>
  );
};
