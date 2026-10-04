import { HexMarker } from '@/components/common/HexMarker';
import type { DistrictCellProperties } from '@/lib/map/districtGeoJson';
import { COVERAGE_LABELS } from '@/lib/map/constants';
import { formatH3, formatPercent, formatScore } from '@/lib/map/format';

export interface DistrictMapTooltipProps {
  cell: DistrictCellProperties | null;
  className?: string;
  classNames?: {
    root?: string;
    title?: string;
    meta?: string;
  };
}

/** Hover card for one cell. Every value is read from the API payload; nothing is labelled by hand. */
export const DistrictMapTooltip = ({ cell, className = '', classNames = {} }: DistrictMapTooltipProps) => {
  if (!cell) return null;

  const unobserved = cell.render === 'no_coverage';
  const swatch = unobserved ? cell.outline : cell.fill;

  return (
    <div
      className={[
        'absolute top-16 left-4 z-20 px-3.5 py-2.5 rounded-xl bg-black/85 backdrop-blur-md border border-white/20 text-white text-[11px] font-mono shadow-2xl pointer-events-none space-y-0.5',
        classNames.root ?? '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={['font-bold flex items-center gap-1.5', classNames.title ?? ''].join(' ')}>
        <HexMarker size="md" color={swatch} />
        <span>{unobserved ? 'No data' : `Susceptibility ${formatScore(cell.susceptibility, 3)}`}</span>
      </div>
      {cell.render === 'hard_zero' && (
        <div className="text-white/70">Hard-zero terrain: safe by construction</div>
      )}
      <div className="text-white/80">
        {COVERAGE_LABELS[cell.quality_flag]} · relative confidence {formatPercent(cell.confidence)}
      </div>
      <div className={['text-[10px] text-white/50', classNames.meta ?? ''].join(' ')}>
        H3 {formatH3(cell.id)}
      </div>
    </div>
  );
};
