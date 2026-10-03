export interface StatsDonutChartSkeletonProps {
  className?: string;
}

export const StatsDonutChartSkeleton = ({ className = '' }: StatsDonutChartSkeletonProps) => (
  <div
    aria-busy
    className={`glass-card p-4 rounded-2xl border border-line dark:border-white/10 animate-pulse space-y-3 ${className}`}
  >
    <div className="h-4 w-48 bg-surface-2 dark:bg-white/10 rounded" />
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-4 w-full bg-surface-2 dark:bg-white/10 rounded" />
      ))}
    </div>
  </div>
);
