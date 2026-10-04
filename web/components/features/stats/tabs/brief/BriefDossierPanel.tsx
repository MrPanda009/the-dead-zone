import type { DistrictHazardSummaryDTO } from '@/lib/api/stats';
import type { AsyncResource } from '@/lib/hooks/useAsyncResource';

import { ResourceErrorState } from '../../ResourceErrorState';
import type { StatsDistrict } from '../../types';
import { BriefDossierBody } from './BriefDossierBody';
import { BriefDossierHeader } from './BriefDossierHeader';
import { BriefDossierSkeleton } from './BriefDossierSkeleton';

export interface BriefDossierPanelProps {
  district: StatsDistrict;
  summary: AsyncResource<DistrictHazardSummaryDTO>;
  className?: string;
  classNames?: {
    root?: string;
  };
}

/** Right-hand dossier. Handles loading, error and loaded states; never falls back to constants. */
export const BriefDossierPanel = ({ district, summary, className = '', classNames = {} }: BriefDossierPanelProps) => (
  <div
    className={[
      'lg:col-span-5 flex flex-col min-h-0 glass-card p-3 sm:p-4 rounded-2xl border border-line dark:border-white/10 shadow-xl overflow-y-auto pr-1.5 stats-scrollbar gap-2.5',
      classNames.root ?? '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <BriefDossierHeader district={district} />

    {summary.isLoading ? <BriefDossierSkeleton /> : null}

    {!summary.isLoading && summary.error ? (
      <ResourceErrorState title="Could not load the district summary" error={summary.error} onRetry={summary.refetch} />
    ) : null}

    {!summary.isLoading && !summary.error && summary.data ? (
      <BriefDossierBody summary={summary.data} districtName={district.name} />
    ) : null}
  </div>
);
