import { MetricCardSkeleton } from '@/components/common/MetricCardSkeleton';

export interface DossierSkeletonProps {
  className?: string;
}

/** Placeholder matching CellDossier's structure while the detail request is in flight. */
export const DossierSkeleton = ({ className = '' }: DossierSkeletonProps) => (
  <div aria-busy className={['flex flex-col gap-3.5', className].filter(Boolean).join(' ')}>
    <div className="flex flex-col gap-2">
      <div className="h-5 w-36 animate-pulse rounded bg-line" />
      <div className="h-3 w-48 animate-pulse rounded bg-line" />
    </div>
    <div className="grid grid-cols-2 gap-2">
      <MetricCardSkeleton />
      <MetricCardSkeleton />
      <MetricCardSkeleton className="col-span-2" />
    </div>
  </div>
);
