'use client';

import React, { useMemo } from 'react';

import { HexMarker } from '@/components/common/HexMarker';
import { deriveHistoryInsights } from '@/lib/stats/history';

import { HistoryInsightsCard } from '../HistoryInsightsCard';
import { LossTimeSeriesChart } from '../LossTimeSeriesChart';
import { ResourceErrorState } from '../ResourceErrorState';
import { ResponseCapacityCard } from '../ResponseCapacityCard';
import { StatePicker } from '../StatePicker';
import { StatsDonutChart } from '../StatsDonutChart';
import type { DisasterHistoryTabProps } from '../types';
import { BriefHeader } from './brief/BriefHeader';

/**
 * Recorded disaster losses for one state: MHA series, NCRB hazard split, CWC/MoRTH/SDRF figures.
 * Every panel reads the same API payload; if it fails the tab shows the error, not a default.
 */
export const DisasterHistoryTab: React.FC<DisasterHistoryTabProps> = ({
  stats,
  selectedState,
  onSelectState,
  availableStates,
  className = '',
  classNames = {},
}) => {
  const payload = stats.data;
  const insights = useMemo(() => deriveHistoryInsights(payload), [payload]);

  return (
    <div
      className={`h-full min-h-0 flex flex-col justify-between overflow-y-auto lg:overflow-hidden ${classNames.root ?? ''} ${className}`}
    >
      <BriefHeader
        title={`Disaster History & Stats — ${selectedState}`}
        actionsSlot={
          <>
            <StatePicker
              selectedState={selectedState}
              onSelectState={onSelectState}
              availableStates={availableStates}
            />
            <div className="hidden sm:flex px-2.5 py-1 rounded-xl glass-card border border-line dark:border-white/10 text-text-secondary text-[10px] font-mono items-center gap-1.5">
              <HexMarker colorClass="bg-rose-500" />
              <span className="font-bold">RECORDED · STATE-LEVEL</span>
            </div>
          </>
        }
      />

      {!stats.isLoading && stats.error ? (
        <div className="flex-1 min-h-0">
          <ResourceErrorState title="Could not load recorded losses" error={stats.error} onRetry={stats.refetch} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          <div className="lg:col-span-7 flex flex-col min-h-0 gap-3 overflow-y-auto pr-1.5 stats-scrollbar">
            <LossTimeSeriesChart stats={payload} isLoading={stats.isLoading} />
            <ResponseCapacityCard stats={payload} isLoading={stats.isLoading} />
          </div>

          <div className="lg:col-span-5 flex flex-col min-h-0 gap-2.5 overflow-y-auto pr-1.5 stats-scrollbar">
            <StatsDonutChart stats={payload} isLoading={stats.isLoading} />
            <HistoryInsightsCard insights={insights} />
          </div>
        </div>
      )}
    </div>
  );
};
