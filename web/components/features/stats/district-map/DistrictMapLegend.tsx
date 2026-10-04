import type { ReactNode } from 'react';

import { HexMarker } from '@/components/common/HexMarker';
import type { HazardLayerCoverage, HazardLayerLegend } from '@/lib/api/types';
import { buildLegendClasses, rgbaToCss } from '@/lib/map/colorScale';
import { HARD_ZERO_COLOR, NO_COVERAGE_OUTLINE_COLOR } from '@/lib/map/constants';

export interface DistrictMapLegendProps {
  legend: HazardLayerLegend;
  coverage?: HazardLayerCoverage | null;
  title?: ReactNode;
  hardZeroLabel?: ReactNode;
  noDataLabel?: ReactNode;
  className?: string;
  classNames?: {
    root?: string;
    title?: string;
    row?: string;
    note?: string;
  };
}

/**
 * Legend built from the API's own class breaks, so it can never disagree with the fill.
 * The two off-ramp entries explain cells that are not "low risk": structurally safe terrain
 * and cells with no satellite observation.
 */
export const DistrictMapLegend = ({
  legend,
  coverage,
  title = 'Susceptibility (quantile classes)',
  hardZeroLabel = 'Hard-zero terrain',
  noDataLabel = 'No data (unmeasured, not safe)',
  className = '',
  classNames = {},
}: DistrictMapLegendProps) => {
  const classes = buildLegendClasses(legend.breaks, legend.domain).slice().reverse();
  const rowClass = ['flex items-center gap-1.5 text-text-secondary', classNames.row ?? ''].join(' ');

  return (
    <div
      className={[
        'absolute bottom-3 right-3 z-20 glass-card p-2.5 rounded-xl border border-line dark:border-white/10 text-[9px] font-mono shadow-xl space-y-1 backdrop-blur-xl pointer-events-none select-none',
        classNames.root ?? '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className={[
          'font-bold text-ink dark:text-white uppercase tracking-wider text-[8px] flex items-center gap-1.5 border-b border-line dark:border-white/10 pb-1',
          classNames.title ?? '',
        ].join(' ')}
      >
        <HexMarker size="xs" />
        <span>{title}</span>
      </div>

      <div className="space-y-0.5 pt-0.5">
        {classes.map((item) => (
          <div key={item.label} className={rowClass}>
            <HexMarker size="md" color={rgbaToCss(item.color)} />
            <span>{item.label}</span>
          </div>
        ))}
        <div className={rowClass}>
          <HexMarker size="md" color={rgbaToCss(HARD_ZERO_COLOR)} />
          <span>{hardZeroLabel}</span>
        </div>
        <div className={rowClass}>
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 shrink-0 border"
            style={{ borderColor: rgbaToCss(NO_COVERAGE_OUTLINE_COLOR) }}
          />
          <span>
            {noDataLabel}
            {coverage ? ` · ${coverage.no_coverage}` : ''}
          </span>
        </div>
      </div>
    </div>
  );
};
