import type { ReactNode } from 'react';

export interface RegimeHazardTagProps {
  children: ReactNode;
  className?: string;
}

/** One named hazard mechanism in the regime banner. */
export const RegimeHazardTag = ({ children, className = '' }: RegimeHazardTagProps) => (
  <span
    className={[
      'rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[9px] font-mono text-ink-muted dark:bg-white/5',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {children}
  </span>
);
