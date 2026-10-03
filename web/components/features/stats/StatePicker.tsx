import type { ReactNode } from 'react';

export interface StatePickerProps {
  selectedState: string;
  onSelectState: (state: string) => void;
  availableStates: readonly string[];
  label?: ReactNode;
  className?: string;
  classNames?: {
    root?: string;
    label?: string;
    select?: string;
  };
}

export const StatePicker = ({
  selectedState,
  onSelectState,
  availableStates,
  label = 'State:',
  className = '',
  classNames = {},
}: StatePickerProps) => (
  <div
    className={[
      'flex items-center gap-1.5 px-2.5 py-1 rounded-xl glass-card border border-line dark:border-white/10',
      classNames.root ?? '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <span className={['text-[10px] font-mono text-text-muted', classNames.label ?? ''].join(' ')}>{label}</span>
    <select
      value={selectedState}
      onChange={(event) => onSelectState(event.target.value)}
      className={[
        'bg-transparent text-xs font-mono font-bold text-ink dark:text-white pr-1 py-0.5 outline-none cursor-pointer',
        classNames.select ?? '',
      ].join(' ')}
    >
      {availableStates.map((state) => (
        <option key={state} value={state} className="bg-surface-0 dark:bg-forest-dark text-ink dark:text-white">
          {state}
        </option>
      ))}
    </select>
  </div>
);
