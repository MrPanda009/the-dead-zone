import type { ReactNode } from 'react';

import type { StatsDistrict } from './types';

export interface DistrictPickerProps {
  districts: StatsDistrict[];
  selected: StatsDistrict;
  onSelect: (district: StatsDistrict) => void;
  label?: ReactNode;
  className?: string;
  classNames?: {
    root?: string;
    label?: string;
    select?: string;
  };
}

export const DistrictPicker = ({
  districts,
  selected,
  onSelect,
  label = 'District:',
  className = '',
  classNames = {},
}: DistrictPickerProps) => (
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
      value={selected.lgdCode}
      onChange={(event) => {
        const found = districts.find((d) => d.lgdCode === Number(event.target.value));
        if (found) onSelect(found);
      }}
      className={[
        'bg-transparent text-xs font-mono font-bold text-ink dark:text-white pr-1 py-0.5 outline-none cursor-pointer',
        classNames.select ?? '',
      ].join(' ')}
    >
      {districts.map((d) => (
        <option
          key={d.lgdCode}
          value={d.lgdCode}
          className="bg-surface-0 dark:bg-forest-dark text-ink dark:text-white"
        >
          {d.name} ({d.state})
        </option>
      ))}
    </select>
  </div>
);
