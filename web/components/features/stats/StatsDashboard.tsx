'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { NavRail } from '@/components/layout/nav-rail/NavRail';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  fetchAvailableStates,
  fetchCaseStudies,
  fetchDisasterStats,
  fetchDistrictHazardSummary,
  type DisasterCaseStudyDTO,
  type DisasterStatsResponse,
  type DistrictHazardSummaryDTO,
  type HistoricalLossDTO,
} from '@/lib/api/stats';
import {
  StatsHeader,
  LossTimeSeriesChart,
  HazardCasualtyBreakdown,
  DistrictFloodRollupCard,
  FloodModelVsHistoryCard,
  ResponseCapacityCard,
  NoneyCaseStudyCard,
  DataSourcesFooter,
} from './index';

interface PilotDistrict {
  name: string;
  state: string;
  lgdCode: number;
}

const PILOT_DISTRICTS: PilotDistrict[] = [
  { name: 'Barpeta', state: 'Assam', lgdCode: 277 },
  { name: 'Dholpur', state: 'Rajasthan', lgdCode: 98 },
  { name: 'Morena', state: 'Madhya Pradesh', lgdCode: 417 },
  { name: 'Wayanad', state: 'Kerala', lgdCode: 555 },
  { name: 'Kodagu', state: 'Karnataka', lgdCode: 540 },
];

export const StatsDashboard: React.FC = () => {
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState<string>('Assam');
  const [stats, setStats] = useState<DisasterStatsResponse | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<PilotDistrict>(PILOT_DISTRICTS[0]);
  const [districtSummary, setDistrictSummary] = useState<DistrictHazardSummaryDTO | null>(null);
  const [caseStudy, setCaseStudy] = useState<DisasterCaseStudyDTO | null>(null);

  const [isLoadingStates, setIsLoadingStates] = useState<boolean>(true);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  // Load available states & case study on mount
  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        setIsLoadingStates(true);
        const [statesRes, caseStudiesRes] = await Promise.all([
          fetchAvailableStates(),
          fetchCaseStudies(),
        ]);
        if (isMounted) {
          if (statesRes?.states?.length > 0) {
            setAvailableStates(statesRes.states);
            if (!statesRes.states.includes('Assam') && statesRes.states[0]) {
              setSelectedState(statesRes.states[0]);
            }
          }
          if (caseStudiesRes?.length > 0) {
            setCaseStudy(caseStudiesRes[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load initial states or case studies', err);
      } finally {
        if (isMounted) setIsLoadingStates(false);
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch state disaster stats whenever selectedState changes
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
        console.error(`Failed to load stats for ${selectedState}`, err);
        if (isMounted) setStats(null);
      } finally {
        if (isMounted) setIsLoadingStats(false);
      }
    }
    loadStats();
    return () => {
      isMounted = false;
    };
  }, [selectedState]);

  // Fetch district hazard summary whenever selectedDistrict changes
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
        console.error(`Failed to load hazard summary for LGD ${selectedDistrict.lgdCode}`, err);
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
      const matchingDist = PILOT_DISTRICTS.find((d) => d.state.toLowerCase() === newState.toLowerCase());
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

  // Aggregated headline metrics from loss_time_series
  const totalLivesLost =
    stats?.loss_time_series?.reduce((acc: number, row: HistoricalLossDTO) => acc + (row.lives_lost ?? 0), 0) ?? 0;
  const totalHousesDamaged =
    stats?.loss_time_series?.reduce((acc: number, row: HistoricalLossDTO) => acc + (row.houses_damaged ?? 0), 0) ?? 0;
  const totalCattleLost =
    stats?.loss_time_series?.reduce((acc: number, row: HistoricalLossDTO) => acc + (row.cattle_lost ?? 0), 0) ?? 0;
  const totalCropLossHa =
    stats?.loss_time_series?.reduce(
      (acc: number, row: HistoricalLossDTO) => acc + (row.crop_area_affected_ha ?? 0),
      0
    ) ?? 0;

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex">
      {/* Pinned NavRail on Left */}
      <NavRail />

      {/* Main Content Area */}
      <main className="flex-1 pl-0 sm:pl-16 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 h-16 border-b border-line bg-surface-0/80 dark:bg-forest-dark/80 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/workspace"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
              title="Return to Workspace"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm sm:text-base font-bold text-ink dark:text-white">
                  SETU-DRR
                </span>
                <span className="text-text-muted text-xs">/</span>
                <span className="font-mono text-xs text-citron font-semibold uppercase">
                  Disaster Analytics & Open Data
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 text-[11px] font-mono text-text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>PostgreSQL Local Engine</span>
            </div>
            <ThemeToggle variant="icon" size="sm" />
          </div>
        </header>

        {/* Dashboard Scroll Body */}
        <div className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Header & State Selector */}
          <StatsHeader
            selectedState={selectedState}
            onSelectState={handleStateChange}
            availableStates={availableStates}
            fromYear={2014}
            toYear={2024}
            isLoading={isLoadingStates || isPending}
          />

          {/* Quick Stat Headline Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="glass-card p-4 rounded-3xl border border-line dark:border-white/10 space-y-1">
              <div className="text-[10px] font-mono uppercase text-text-muted">Human Fatalities (2014-22)</div>
              <div className="text-2xl font-bold font-mono text-rose-500">
                {isLoadingStats ? '...' : totalLivesLost.toLocaleString()}
              </div>
              <div className="text-[10px] text-text-muted font-mono">MHA Rajya Sabha Logs</div>
            </div>

            <div className="glass-card p-4 rounded-3xl border border-line dark:border-white/10 space-y-1">
              <div className="text-[10px] font-mono uppercase text-text-muted">Houses Damaged</div>
              <div className="text-2xl font-bold font-mono text-amber-500">
                {isLoadingStats ? '...' : totalHousesDamaged.toLocaleString()}
              </div>
              <div className="text-[10px] text-text-muted font-mono">Fully / Partially Damaged</div>
            </div>

            <div className="glass-card p-4 rounded-3xl border border-line dark:border-white/10 space-y-1">
              <div className="text-[10px] font-mono uppercase text-text-muted">Cattle Perished</div>
              <div className="text-2xl font-bold font-mono text-ink dark:text-white">
                {isLoadingStats ? '...' : totalCattleLost.toLocaleString()}
              </div>
              <div className="text-[10px] text-text-muted font-mono">Livestock Casualties</div>
            </div>

            <div className="glass-card p-4 rounded-3xl border border-line dark:border-white/10 space-y-1">
              <div className="text-[10px] font-mono uppercase text-text-muted">Crop Area Affected</div>
              <div className="text-2xl font-bold font-mono text-emerald-500">
                {isLoadingStats ? '...' : `${(totalCropLossHa / 100000).toFixed(2)} L Ha`}
              </div>
              <div className="text-[10px] text-text-muted font-mono">Agricultural Inundation</div>
            </div>
          </div>

          {/* Row 1: Time Series Loss Chart + NCRB Hazard Casualty Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <LossTimeSeriesChart
                stats={stats}
                isLoading={isLoadingStats}
              />
            </div>
            <div className="lg:col-span-4">
              <HazardCasualtyBreakdown
                stats={stats}
                isLoading={isLoadingStats}
              />
            </div>
          </div>

          {/* Section: District SAR Model Calibration vs Historical Reality */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-lg font-bold text-ink dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-accent">water</span>
                  <span>District Screening: Empirical SAR Model vs Historical Reality</span>
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Inspect Sentinel-1 SAR inundation frequency calibrated against CWC and MHA damage logs.
                </p>
              </div>

              {/* District Switcher Tabs */}
              <div className="flex flex-wrap gap-1.5 p-1 bg-surface-1 dark:bg-forest-surface rounded-2xl border border-line dark:border-white/10">
                {PILOT_DISTRICTS.map((d) => {
                  const isSelected = selectedDistrict.lgdCode === d.lgdCode;
                  return (
                    <button
                      key={d.lgdCode}
                      onClick={() => handleDistrictChange(d)}
                      className={`px-3 py-1 text-xs rounded-xl font-mono transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-citron text-black font-bold shadow-sm'
                          : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                      }`}
                    >
                      {d.name} ({d.state})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DistrictFloodRollupCard
                summary={districtSummary}
                isLoading={isLoadingSummary}
                districtName={selectedDistrict.name}
                lgdCode={selectedDistrict.lgdCode}
              />
              <FloodModelVsHistoryCard
                summary={districtSummary}
                stats={stats}
                isLoading={isLoadingStats || isLoadingSummary}
              />
            </div>
          </div>

          {/* Section: Financial Capacity & NDRF/SDRF Allocations */}
          <ResponseCapacityCard
            stats={stats}
            isLoading={isLoadingStats}
          />

          {/* Section: Landslide Incident Case Study */}
          {caseStudy && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-500">history_edu</span>
                <h3 className="font-display text-base font-bold text-ink dark:text-white">
                  Ground Truth Verification Case Study
                </h3>
              </div>
              <NoneyCaseStudyCard
                caseStudy={caseStudy}
                isLoading={isLoadingStates}
              />
            </div>
          )}

          {/* Provenance & Methodology Notice */}
          <DataSourcesFooter
            lastUpdated="September 2026"
            caveats={[
              'Landslide indicators across habitations are historical spatial occurrences and geotechnical proxies; not synthetic probabilistic hazard models.',
              'Flood susceptibility is generated from Copernicus 30m HAND and Sentinel-1 SAR backscatter time-series (v0.1); cells lacking SAR coverage are transparently reported as unmeasured rather than zero-risk.',
            ]}
          />
        </div>
      </main>
    </div>
  );
};
