import { formatInteger } from '@/lib/stats/format';
import type { YearTrendPoint } from '@/lib/stats/history';

export interface YearTrendColumnProps {
  point: YearTrendPoint;
  /** Tallest value in the series, used to scale the bar. */
  max: number;
  isHovered?: boolean;
  onHover?: (point: YearTrendPoint | null) => void;
  className?: string;
  classNames?: {
    root?: string;
    bar?: string;
    axis?: string;
  };
}

export const YearTrendColumn = ({
  point,
  max,
  isHovered = false,
  onHover,
  className = '',
  classNames = {},
}: YearTrendColumnProps) => {
  const heightPct = Math.max(12, Math.round((point.deaths / Math.max(max, 1)) * 100));
  const isPeak = point.deaths === max && max > 0;

  return (
    <div
      onMouseEnter={() => onHover?.(point)}
      onMouseLeave={() => onHover?.(null)}
      className={['flex-1 h-full flex flex-col justify-end items-center cursor-pointer', classNames.root ?? '', className]
        .filter(Boolean)
        .join(' ')}
      title={`${point.key}: ${formatInteger(point.deaths)} lives lost`}
    >
      <div
        className={[
          'trend-col-bar w-full rounded-t-sm transition-colors',
          isHovered ? 'bg-citron' : isPeak ? 'bg-rose-500' : 'bg-emerald-500/70 hover:bg-emerald-400',
          classNames.bar ?? '',
        ].join(' ')}
        style={{ height: `${heightPct}%` }}
      />
      <span className={['text-[8px] font-mono text-text-muted mt-1 select-none', classNames.axis ?? ''].join(' ')}>
        {point.axis}
      </span>
    </div>
  );
};
