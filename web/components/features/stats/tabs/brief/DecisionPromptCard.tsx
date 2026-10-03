import type { ReactNode } from 'react';

import { HexMarker } from '@/components/common/HexMarker';

export interface DecisionPromptCardProps {
  /** `officer_decision_prompt` from the API: a factual sentence, never a recommendation. */
  prompt: ReactNode;
  /** Coverage breakdown line, so unmeasured cells are visible next to the exposure numbers. */
  coverageLine?: ReactNode;
  title?: ReactNode;
  className?: string;
  classNames?: {
    root?: string;
    title?: string;
    prompt?: string;
    coverage?: string;
  };
}

export const DecisionPromptCard = ({
  prompt,
  coverageLine,
  title = 'Officer decision prompt',
  className = '',
  classNames = {},
}: DecisionPromptCardProps) => (
  <div
    className={[
      'p-2.5 rounded-xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 space-y-1',
      classNames.root ?? '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <div className={['text-[9px] font-mono uppercase tracking-wider text-citron font-bold flex items-center gap-1', classNames.title ?? ''].join(' ')}>
      <HexMarker size="xs" />
      <span>{title}</span>
    </div>
    <p className={['text-[11px] leading-snug text-text-secondary', classNames.prompt ?? ''].join(' ')}>{prompt}</p>
    {coverageLine ? (
      <p className={['text-[9px] font-mono text-text-muted', classNames.coverage ?? ''].join(' ')}>{coverageLine}</p>
    ) : null}
  </div>
);
