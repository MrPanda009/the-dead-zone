import React from 'react';

export interface LossChartSkeletonProps {
  className?: string;
}

export const LossChartSkeleton: React.FC<LossChartSkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`glass-card p-6 rounded-3xl border border-line dark:border-white/10 space-y-5 animate-pulse ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-48 bg-surface-2 dark:bg-white/10 rounded-md" />
          <div className="h-3 w-72 bg-surface-2 dark:bg-white/10 rounded-md" />
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-7 w-20 bg-surface-2 dark:bg-white/10 rounded-lg" />
          ))}
        </div>
      </div>

      <div className="h-56 flex items-end gap-3 pt-8 px-2">
        {[40, 65, 30, 85, 55, 70, 90, 45, 60].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div
              className="w-full bg-surface-2 dark:bg-white/10 rounded-t-lg transition-all"
              style={{ height: `${h}%` }}
            />
            <div className="h-3 w-8 bg-surface-2 dark:bg-white/10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};
