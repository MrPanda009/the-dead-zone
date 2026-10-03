import { HexMarker } from '@/components/common/HexMarker';
import { formatInteger } from '@/lib/stats/format';
import type { HazardShare } from '@/lib/stats/history';

export interface HazardBreakdownRowProps {
  item: HazardShare;
  isHovered?: boolean;
  onHover?: (id: string | null) => void;
  className?: string;
  classNames?: {
    root?: string;
    label?: string;
    value?: string;
    track?: string;
  };
}

export const HazardBreakdownRow = ({
  item,
  isHovered = false,
  onHover,
  className = '',
  classNames = {},
}: HazardBreakdownRowProps) => (
  <div
    onMouseEnter={() => onHover?.(item.id)}
    onMouseLeave={() => onHover?.(null)}
    className={[
      'p-1.5 rounded-xl transition-all cursor-default font-mono text-xs',
      isHovered ? 'bg-surface-2 dark:bg-white/10' : 'hover:bg-surface-1 dark:hover:bg-white/5',
      classNames.root ?? '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <div className="flex items-center justify-between text-[11px] mb-1">
      <div className="flex items-center gap-2">
        <HexMarker size="md" color={item.color} />
        <span className={['text-ink dark:text-text-primary font-semibold', classNames.label ?? ''].join(' ')}>{item.label}</span>
      </div>
      <div className={['flex items-center gap-2', classNames.value ?? ''].join(' ')}>
        <span className="font-bold text-ink dark:text-white">{item.pct}%</span>
        <span className="text-[10px] text-text-muted">({formatInteger(item.count)})</span>
      </div>
    </div>
    <div className={['h-1.5 w-full bg-surface-2 dark:bg-white/10 rounded-full overflow-hidden', classNames.track ?? ''].join(' ')}>
      <div
        data-width={`${item.pct}%`}
        className="hazard-hex-bar h-full rounded-full"
        style={{ backgroundColor: item.color, width: `${item.pct}%` }}
      />
    </div>
  </div>
);
