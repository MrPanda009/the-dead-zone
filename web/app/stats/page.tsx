'use client';

import React, { Suspense } from 'react';
import { RouteStage } from '@/components/layout/transition';
import { StatsDashboard } from '@/components/features/stats';

function StatsLoadingFallback() {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <span className="material-symbols-outlined text-citron text-3xl animate-spin">
          progress_activity
        </span>
        <span className="text-xs font-mono text-text-muted tracking-wider uppercase">
          Loading Disaster Intelligence...
        </span>
      </div>
    </div>
  );
}

export default function StatsPage() {
  return (
    <RouteStage>
      <Suspense fallback={<StatsLoadingFallback />}>
        <StatsDashboard />
      </Suspense>
    </RouteStage>
  );
}
