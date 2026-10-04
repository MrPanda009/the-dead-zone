'use client';

import React, { useCallback, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useDisasterStats } from '@/lib/hooks/useDisasterStats';
import { useDistrictHazardSummary } from '@/lib/hooks/useDistrictHazardSummary';
import { useHazardLayer } from '@/lib/hooks/useHazardLayer';
import { useStatsAvailableStates } from '@/lib/hooks/useStatsAvailableStates';

import { STATS_DISTRICTS } from './statsDistricts';
import { StatsSubNav } from './StatsSubNav';
import { StatsTopBar } from './StatsTopBar';
import { DataProvenanceTab } from './tabs/DataProvenanceTab';
import { DisasterHistoryTab } from './tabs/DisasterHistoryTab';
import { DistrictBriefTab } from './tabs/DistrictBriefTab';
import { ModelVsHistoryTab } from './tabs/ModelVsHistoryTab';
import type { StatsDistrict, StatsTabId } from './types';

const VALID_TABS: readonly StatsTabId[] = ['history', 'brief', 'comparison', 'sources'];

/** States offered before (or without) the API list. A state with no records shows an empty state. */
const DEFAULT_STATES: readonly string[] = [
  'All India',
  'Jammu & Kashmir',
  'Ladakh',
  'Manipur',
  'Assam',
  'Kerala',
  'Uttarakhand',
  'Himachal Pradesh',
  'Rajasthan',
  'Madhya Pradesh',
  'Karnataka',
  'Bihar',
  'West Bengal',
  'Maharashtra',
];

/**
 * Orchestrates the Stats screens: owns tab, state and district selection and every request.
 * Tabs receive resources as props and never fetch. A failed request is passed down as an
 * error; no tab substitutes default numbers.
 */
export const StatsDashboard: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const tabParam = searchParams.get('tab') as StatsTabId | null;
  const [activeTab, setActiveTab] = useState<StatsTabId>(
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'history',
  );
  const [selectedState, setSelectedState] = useState<string>('Manipur');
  const [selectedDistrict, setSelectedDistrict] = useState<StatsDistrict>(STATS_DISTRICTS[0]);

  const availableStates = useStatsAvailableStates(DEFAULT_STATES);
  const needsDistrict = activeTab === 'brief' || activeTab === 'comparison';

  // History uses the state picked on that tab; Model vs History always uses the district's own state.
  const historyStats = useDisasterStats(selectedState, { enabled: activeTab === 'history' });
  const districtStats = useDisasterStats(selectedDistrict.state, { enabled: activeTab === 'comparison' });
  const summary = useDistrictHazardSummary(selectedDistrict.lgdCode, { enabled: needsDistrict });
  const layer = useHazardLayer({ admin: selectedDistrict.lgdCode, enabled: needsDistrict });

  const handleSelectTab = useCallback(
    (tabId: StatsTabId) => {
      setActiveTab(tabId);
      const params = new URLSearchParams(window.location.search);
      params.set('tab', tabId);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  const handleStateChange = useCallback((nextState: string) => {
    startTransition(() => {
      setSelectedState(nextState);
      const match = STATS_DISTRICTS.find((d) => d.state.toLowerCase() === nextState.toLowerCase());
      if (match) setSelectedDistrict(match);
    });
  }, []);

  const handleDistrictChange = useCallback(
    (district: StatsDistrict) => {
      startTransition(() => {
        setSelectedDistrict(district);
        if (district.state !== selectedState && availableStates.includes(district.state)) {
          setSelectedState(district.state);
        }
      });
    },
    [selectedState, availableStates],
  );

  return (
    <div
      aria-busy={isPending}
      className="h-dvh min-h-screen w-full overflow-hidden bg-bg-base dark:bg-forest-base text-ink dark:text-text-primary flex flex-col font-sans transition-colors duration-200 select-none"
    >
      <main className="flex-1 min-h-0 flex flex-col h-full w-full overflow-hidden">
        <StatsTopBar />

        <div className="shrink-0 px-2 sm:px-4 pt-1.5 pb-0.5 max-w-[1680px] w-full mx-auto overflow-x-auto no-scrollbar">
          <StatsSubNav activeTab={activeTab} onSelectTab={handleSelectTab} />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden w-full max-w-[1680px] mx-auto px-2 sm:px-4 pb-2 pt-0.5">
          {activeTab === 'history' && (
            <DisasterHistoryTab
              stats={historyStats}
              selectedState={selectedState}
              onSelectState={handleStateChange}
              availableStates={availableStates}
            />
          )}

          {activeTab === 'brief' && (
            <DistrictBriefTab
              districts={STATS_DISTRICTS}
              selectedDistrict={selectedDistrict}
              onSelectDistrict={handleDistrictChange}
              summary={summary}
              layer={layer}
            />
          )}

          {activeTab === 'comparison' && (
            <ModelVsHistoryTab
              districts={STATS_DISTRICTS}
              selectedDistrict={selectedDistrict}
              onSelectDistrict={handleDistrictChange}
              summary={summary}
              layer={layer}
              stats={districtStats}
            />
          )}

          {activeTab === 'sources' && <DataProvenanceTab />}
        </div>
      </main>
    </div>
  );
};
