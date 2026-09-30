'use client';

import React from 'react';
import { RouteStage } from '@/components/layout/transition';
import { StatsDashboard } from '@/components/features/stats';

export default function StatsPage() {
  return (
    <RouteStage>
      <StatsDashboard />
    </RouteStage>
  );
}
