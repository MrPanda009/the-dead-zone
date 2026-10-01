'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  fetchAvailableStates,
  fetchDisasterStats,
  fetchDistrictHazardSummary,
  type DisasterStatsResponse,
  type DistrictHazardSummaryDTO,
} from '@/lib/api/stats';
import {
  StatsSubNav,
  DisasterHistoryTab,
  DistrictBriefTab,
  ModelVsHistoryTab,
  DataProvenanceTab,
  PILOT_DISTRICTS,
  type StatsTabId,
  type PilotDistrict,
} from './index';

export const StatsDashboard: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab State
  const tabParam = (searchParams.get('tab') as StatsTabId) || 'history';
  const validTabs: StatsTabId[] = ['history', 'brief', 'comparison', 'sources'];
  const [activeTab, setActiveTab] = useState<StatsTabId>(
    validTabs.includes(tabParam) ? tabParam : 'history'
  );

  // Core Data States
  const [availableStates, setAvailableStates] = useState<string[]>([
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
  ]);
  const [selectedState, setSelectedState] = useState<string>('Manipur');
  const [stats, setStats] = useState<DisasterStatsResponse | null>(null);

  // Pilot District State (Rudraprayag is default as in reference picture)
  const [selectedDistrict, setSelectedDistrict] = useState<PilotDistrict>(PILOT_DISTRICTS[0]);
  const [districtSummary, setDistrictSummary] = useState<DistrictHazardSummaryDTO | null>(null);

  // Loading States
  const [isLoadingStates, setIsLoadingStates] = useState<boolean>(false);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  // Sync tab with URL
  const handleSelectTab = useCallback(
    (tabId: StatsTabId) => {
      setActiveTab(tabId);
      const params = new URLSearchParams(window.location.search);
      params.set('tab', tabId);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  // Load available states
  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        setIsLoadingStates(true);
        const statesRes = await fetchAvailableStates().catch(() => null);
        if (isMounted && statesRes?.states && statesRes.states.length > 0) {
          setAvailableStates((prev) => Array.from(new Set([...prev, ...statesRes.states])));
        }
      } catch (err) {
        console.error('Failed to load initial states', err);
      } finally {
        if (isMounted) setIsLoadingStates(false);
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch state disaster statistics
  useEffect(() => {
    if (!selectedState) return;
    let isMounted = true;
    async function loadStats() {
      try {
        setIsLoadingStats(true);
        const data = await fetchDisasterStats({ state: selectedState, from_year: 2014, to_year: 2024 });
        if (isMounted) {
          setStats(data);
        }
      } catch (err) {
        console.warn(`Failed to fetch live stats for ${selectedState}, using fallback aggregation`, err);
      } finally {
        if (isMounted) setIsLoadingStats(false);
      }
    }
    loadStats();
    return () => {
      isMounted = false;
    };
  }, [selectedState]);

  // Fetch district hazard summary
  useEffect(() => {
    if (!selectedDistrict.lgdCode) return;
    let isMounted = true;
    async function loadSummary() {
      try {
        setIsLoadingSummary(true);
        const data = await fetchDistrictHazardSummary(selectedDistrict.lgdCode);
        if (isMounted) {
          setDistrictSummary(data);
        }
      } catch (err) {
        console.warn(`Failed to fetch hazard summary for LGD ${selectedDistrict.lgdCode}`, err);
        if (isMounted) setDistrictSummary(null);
      } finally {
        if (isMounted) setIsLoadingSummary(false);
      }
    }
    loadSummary();
    return () => {
      isMounted = false;
    };
  }, [selectedDistrict]);

  const handleStateChange = useCallback((newState: string) => {
    startTransition(() => {
      setSelectedState(newState);
      const matchingDist = PILOT_DISTRICTS.find(
        (d) => d.state.toLowerCase() === newState.toLowerCase()
      );
      if (matchingDist) {
        setSelectedDistrict(matchingDist);
      }
    });
  }, []);

  const handleDistrictChange = useCallback((district: PilotDistrict) => {
    startTransition(() => {
      setSelectedDistrict(district);
      if (district.state !== selectedState && availableStates.includes(district.state)) {
        setSelectedState(district.state);
      }
    });
  }, [selectedState, availableStates]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-bg-base dark:bg-forest-base text-ink dark:text-text-primary flex flex-col font-sans transition-colors duration-200 select-none">
      {/* Main Content Area (Full-Width, 100vh Fits-on-Screen, No Scrolling) */}
      <main className="flex-1 min-h-0 flex flex-col h-full w-full overflow-hidden">
        {/* Top Navbar matching the rest of the application */}
        <header className="shrink-0 h-12 border-b border-line dark:border-white/10 bg-surface-0/90 dark:bg-[#0c1524]/90 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between transition-colors z-30">
          {/* Left Brand & Return */}
          <div className="flex items-center gap-3 min-w-[200px]">
            <Link
              href="/"
              className="flex items-center gap-2 group cursor-pointer"
              title="Return to Home Overview"
            >
              <span className="material-symbols-outlined text-citron text-xl group-hover:rotate-90 transition-transform">
                emergency
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-mono font-bold tracking-wider text-citron">
                  TERRA
                </span>
                <span className="text-[9px] font-mono text-text-muted tracking-tight">
                  TERRAIN RISK &amp; RELOCATION ANALYTICS
                </span>
              </div>
            </Link>
          </div>

          {/* Center Nav Links - Truly Centered */}
          <nav className="hidden md:flex items-center gap-1.5 md:absolute md:left-1/2 md:-translate-x-1/2" aria-label="Main App Navigation">
            <Link
              href="/"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-surface-1 dark:hover:bg-white/5 border border-line dark:border-white/10 transition-colors cursor-pointer"
              title="Home Overview"
            >
              <span className="material-symbols-outlined text-xs">home</span>
              <span>Home</span>
            </Link>

            <Link
              href="/gov"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-surface-1 dark:hover:bg-white/5 border border-line dark:border-white/10 transition-colors cursor-pointer"
              title="3D Subcontinent &amp; 2D View"
            >
              <span className="material-symbols-outlined text-xs">view_in_ar</span>
              <span>3D &amp; 2D</span>
            </Link>

            <Link
              href="/relocation"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-surface-1 dark:hover:bg-white/5 border border-line dark:border-white/10 transition-colors cursor-pointer"
              title="Relocation Solver Grid"
            >
              <span className="material-symbols-outlined text-xs">moving</span>
              <span>Relocation</span>
            </Link>

            <Link
              href="/stories"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-surface-1 dark:hover:bg-white/5 border border-line dark:border-white/10 transition-colors cursor-pointer"
              title="Assess &amp; Citizen Advisories"
            >
              <span className="material-symbols-outlined text-xs">auto_stories</span>
              <span>Assess</span>
            </Link>

            <Link
              href="/stats"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-citron bg-citron/10 border border-citron/40 transition-colors cursor-pointer font-bold shadow-sm"
              title="Disaster History &amp; Statistics"
            >
              <span className="material-symbols-outlined text-xs">query_stats</span>
              <span>Stats</span>
            </Link>
          </nav>

          {/* Right Tools: India Location & Universal Theme Toggle */}
          <div className="flex items-center gap-2 min-w-[200px] justify-end">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 text-[11px] font-mono text-text-secondary">
              <span className="material-symbols-outlined text-xs text-citron">location_on</span>
              <span>India</span>
            </div>

            <ThemeToggle />
          </div>
        </header>

        {/* Sub-navigation Segment Tabs (Switching between the 4 pages) */}
        <div className="shrink-0 px-4 pt-1.5 pb-0.5 max-w-[1680px] w-full mx-auto">
          <StatsSubNav activeTab={activeTab} onSelectTab={handleSelectTab} />
        </div>

        {/* Dashboard Active Tab Body (100% Screen Height, No Page Scroll) */}
        <div className="flex-1 min-h-0 overflow-hidden w-full max-w-[1680px] mx-auto px-4 pb-2 pt-0.5">
          {activeTab === 'history' && (
            <DisasterHistoryTab
              stats={stats}
              selectedState={selectedState}
              onSelectState={handleStateChange}
              availableStates={availableStates}
              isLoading={isLoadingStats || isPending}
            />
          )}

          {activeTab === 'brief' && (
            <DistrictBriefTab
              districts={PILOT_DISTRICTS}
              selectedDistrict={selectedDistrict}
              onSelectDistrict={handleDistrictChange}
              summary={districtSummary}
              isLoading={isLoadingSummary || isPending}
            />
          )}

          {activeTab === 'comparison' && (
            <ModelVsHistoryTab
              districts={PILOT_DISTRICTS}
              selectedDistrict={selectedDistrict}
              onSelectDistrict={handleDistrictChange}
              summary={districtSummary}
              stats={stats}
              isLoading={isLoadingStats || isLoadingSummary}
            />
          )}

          {activeTab === 'sources' && (
            <DataProvenanceTab
              lastUpdated="September 2024"
            />
          )}
        </div>
      </main>
    </div>
  );
};
