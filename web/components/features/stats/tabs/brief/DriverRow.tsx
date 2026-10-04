import type { DriverRowData } from '@/lib/stats/derive';

export interface DriverRowProps {
  row: DriverRowData;
  /** Tailwind background class for the bar fill. */
  barClassName?: string;
  className?: string;
  classNames?: {
    root?: string;
    label?: string;
    value?: string;
    track?: string;
    bar?: string;
    scale?: string;
  };
}

/** One measured driver with its unit and scale. The bar is position on that scale, not a share. */
export const DriverRow = ({
  row,
  barClassName = 'bg-teal-400',
  className = '',
  classNames = {},
}: DriverRowProps) => (
  <div className={['space-y-0.5', classNames.root ?? '', className].filter(Boolean).join(' ')}>
    <div className="flex items-center justify-between text-[11px] font-mono">
      <span className={['text-text-secondary', classNames.label ?? ''].join(' ')}>{row.label}</span>
      <span className={['font-bold text-ink dark:text-white', classNames.value ?? ''].join(' ')}>{row.display}</span>
    </div>
    <div className={['h-1.5 w-full bg-surface-2 dark:bg-white/10 rounded-full overflow-hidden', classNames.track ?? ''].join(' ')}>
      <div
        data-width={`${row.fraction * 100}%`}
        className={['driver-progress h-full rounded-full', barClassName, classNames.bar ?? ''].join(' ')}
        style={{ width: `${row.fraction * 100}%` }}
      />
    </div>
    <div className={['text-[8px] font-mono text-text-muted', classNames.scale ?? ''].join(' ')}>{row.scale}</div>
  </div>
);
