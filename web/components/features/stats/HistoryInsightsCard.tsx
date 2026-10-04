import type { ReactNode } from 'react';

import { HexMarker } from '@/components/common/HexMarker';
import type { HistoryInsight } from '@/lib/stats/history';

import { HexListItem } from './HexListItem';

export interface HistoryInsightsCardProps {
  insights: readonly HistoryInsight[];
  title?: ReactNode;
  className?: string;
  classNames?: {
    root?: string;
    title?: string;
    list?: string;
  };
}

/** Statements derived from the loaded records. Renders nothing when the data supports none. */
export const HistoryInsightsCard = ({
  insights,
  title = 'FROM THE RECORDS',
  className = '',
  classNames = {},
}: HistoryInsightsCardProps) => {
  if (insights.length === 0) return null;
  return (
    <div
      className={[
        'glass-card p-3 rounded-2xl border border-line dark:border-white/10 space-y-1.5 shrink-0',
        classNames.root ?? '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={['text-[9px] font-mono uppercase tracking-wider text-citron font-bold flex items-center gap-1.5', classNames.title ?? ''].join(' ')}>
        <HexMarker />
        <span>{title}</span>
      </div>
      <ul className={['space-y-1 text-[11px] text-text-secondary font-sans leading-tight', classNames.list ?? ''].join(' ')}>
        {insights.map((insight) => (
          <HexListItem key={insight.id} markerClassName="bg-citron">
            {insight.text}
          </HexListItem>
        ))}
      </ul>
    </div>
  );
};
