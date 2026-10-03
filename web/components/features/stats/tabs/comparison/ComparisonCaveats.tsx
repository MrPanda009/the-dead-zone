import type { ReactNode } from 'react';

import { COMPARISON_CAVEATS } from '@/lib/stats/copy';

import { HexListItem } from '../../HexListItem';

export interface ComparisonCaveatsProps {
  /** Static methodology notes. Defaults to the shared copy. */
  caveats?: readonly string[];
  /** Extra caveats reported by the API for the selected state's records. */
  apiCaveats?: readonly string[];
  title?: ReactNode;
  className?: string;
  classNames?: {
    root?: string;
    title?: string;
    list?: string;
  };
}

/** How to read this page. Notes describe limits of the data; none of them is a result. */
export const ComparisonCaveats = ({
  caveats = COMPARISON_CAVEATS,
  apiCaveats = [],
  title = 'How to read this comparison',
  className = '',
  classNames = {},
}: ComparisonCaveatsProps) => {
  const all = [...caveats, ...apiCaveats];
  return (
    <div className={['space-y-1.5 min-h-0', classNames.root ?? '', className].filter(Boolean).join(' ')}>
      <div className={['text-[9px] font-mono uppercase tracking-wider text-text-muted font-bold', classNames.title ?? ''].join(' ')}>
        {title}
      </div>
      <ul className={['space-y-1.5 text-[11px] text-text-secondary leading-snug', classNames.list ?? ''].join(' ')}>
        {all.map((text) => (
          <HexListItem key={text}>{text}</HexListItem>
        ))}
      </ul>
    </div>
  );
};
