import type { ReactNode } from 'react';

import { HexMarker } from '@/components/common/HexMarker';

export interface DistrictMapBadgeProps {
  districtName: string;
  /** Model version read from the API (`model_version`). Hidden when unknown. */
  modelVersion?: string | null;
  label?: ReactNode;
  className?: string;
  classNames?: {
    root?: string;
    version?: string;
  };
}

export const DistrictMapBadge = ({
  districtName,
  modelVersion,
  label = 'H3 flood grid',
  className = '',
  classNames = {},
}: DistrictMapBadgeProps) => (
  <div className={['absolute top-4 left-4 z-10 pointer-events-none', className].join(' ')}>
    <div
      className={[
        'px-3 py-1.5 rounded-xl glass-card border border-line dark:border-white/10 text-xs font-mono font-bold text-ink dark:text-white shadow-lg flex items-center gap-2',
        classNames.root ?? '',
      ].join(' ')}
    >
      <HexMarker />
      <span>
        {label}: {districtName}
      </span>
      {modelVersion ? (
        <span
          className={[
            'px-1.5 py-0.5 rounded bg-surface-2 dark:bg-white/10 text-[9px] font-medium text-text-secondary',
            classNames.version ?? '',
          ].join(' ')}
        >
          {modelVersion}
        </span>
      ) : null}
    </div>
  </div>
);
