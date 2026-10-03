import type { ReactNode } from 'react';

export interface RecordedLossRowProps {
  label: ReactNode;
  value: ReactNode;
  /** Tailwind text colour for the value. */
  valueClassName?: string;
  className?: string;
  classNames?: {
    root?: string;
    label?: string;
    value?: string;
  };
}

export const RecordedLossRow = ({
  label,
  value,
  valueClassName = 'text-ink dark:text-white',
  className = '',
  classNames = {},
}: RecordedLossRowProps) => (
  <div
    className={[
      'flex justify-between py-1 border-b border-line dark:border-white/5 text-xs',
      classNames.root ?? '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <span className={['text-text-secondary', classNames.label ?? ''].join(' ')}>{label}</span>
    <span className={['font-mono font-bold', valueClassName, classNames.value ?? ''].join(' ')}>{value}</span>
  </div>
);
