import type { FeatureContribution } from '@/lib/api/types';
import { describeFeature, type TerrainFeatureMeta } from '@/lib/map/terrainFeatures';

import { DriverMetricRow } from './DriverMetricRow';

export interface TerrainDriverRowProps {
  contribution: FeatureContribution;
  /** This feature's share [0,1] of the total attributed score; drives the inline bar. */
  share?: number | null;
  /** Overrides the registered label, hint and formatter for this feature. */
  meta?: Partial<TerrainFeatureMeta>;
  showContribution?: boolean;
  variant?: 'default' | 'accent' | 'muted';
  className?: string;
  classNames?: {
    root?: string;
    label?: string;
    value?: string;
    bar?: string;
  };
}

/** One terrain feature: its measured value, its contribution to the score and a share bar. */
export const TerrainDriverRow = ({
  contribution,
  share = null,
  meta,
  showContribution = true,
  variant = 'accent',
  className = '',
  classNames = {},
}: TerrainDriverRowProps) => {
  const resolved = { ...describeFeature(contribution.feature), ...meta };
  const formatted = resolved.format(contribution.value);
  const value = showContribution
    ? `${formatted} · +${contribution.contribution.toFixed(3)}`
    : formatted;

  return (
    <DriverMetricRow
      label={resolved.label}
      value={value}
      fraction={share}
      hint={resolved.hint}
      variant={variant}
      className={className}
      classNames={classNames}
    />
  );
};
