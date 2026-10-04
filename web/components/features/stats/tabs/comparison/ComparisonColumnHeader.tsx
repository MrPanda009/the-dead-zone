import type { ReactNode } from 'react';

import { HexMarker } from '@/components/common/HexMarker';

export type ComparisonTone = 'computed' | 'recorded';

export interface ComparisonColumnHeaderProps {
  label: ReactNode;
  tone: ComparisonTone;
  /** Right-aligned detail such as the model version or the record scope. */
  meta?: ReactNode;
  className?: string;
  classNames?: {
    root?: string;
    label?: string;
    meta?: string;
  };
}

const TONE: Record<ComparisonTone, { text: string; marker: string }> = {
  computed: { text: 'text-citron', marker: 'bg-citron' },
  recorded: { text: 'text-rose-500', marker: 'bg-rose-500' },
};

/** Keeps "computed" and "recorded" visually separate, as UPDATE_CHANGES.md requires. */
export const ComparisonColumnHeader = ({
  label,
  tone,
  meta,
  className = '',
  classNames = {},
}: ComparisonColumnHeaderProps) => (
  <div className={['flex items-center justify-between pb-1 px-1 shrink-0', classNames.root ?? '', className].filter(Boolean).join(' ')}>
    <span className={['text-[10px] font-mono font-bold uppercase flex items-center gap-1.5', TONE[tone].text, classNames.label ?? ''].join(' ')}>
      <HexMarker colorClass={TONE[tone].marker} />
      <span>{label}</span>
    </span>
    {meta ? <span className={['text-[9px] font-mono text-text-muted', classNames.meta ?? ''].join(' ')}>{meta}</span> : null}
  </div>
);
