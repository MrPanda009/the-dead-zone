import type { ReactNode } from 'react';

export interface RegimeComparabilityNoteProps {
  children?: ReactNode;
  className?: string;
}

/**
 * Warns that one ranking mixes scores from different formulas. Char-belt and floodplain
 * scores sit on the same 0–1 scale but measure different threats and are validated differently.
 */
export const RegimeComparabilityNote = ({
  children = 'Char-belt (erosion) and floodplain (flood) scores come from different formulas. Compare cells within a regime, or group by regime.',
  className = '',
}: RegimeComparabilityNoteProps) => (
  <p
    role="note"
    className={[
      'rounded-lg border border-amber-500/30 bg-amber-500/8 px-2 py-1.5 text-[9px] leading-snug text-ink-muted',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {children}
  </p>
);
