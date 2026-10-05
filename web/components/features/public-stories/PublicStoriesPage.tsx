'use client';

import React, { useState } from 'react';
import { ZoneId, REGIONAL_STORIES } from './storyData';
import { StoriesHeaderCoordinates } from './StoriesHeaderCoordinates';
import { IndiaStoriesMap } from './IndiaStoriesMap';
import { TouristDistrictCard } from './TouristDistrictCard';
import { DistrictDropdown } from './DistrictDropdown';
import { SafeTravelRadarCard } from './SafeTravelRadarCard';
import { TouristWeatherStrip } from './TouristWeatherStrip';
import { MapLegendOverlay } from './MapLegendOverlay';
import { DistrictRiskModal } from './DistrictRiskModal';
import { OfflineTouristPassModal } from './OfflineTouristPassModal';
import { useDistrictForecastTelemetry } from '@/lib/hooks/useDistrictForecastTelemetry';

export interface PublicStoriesPageProps {
  /** Target link for returning to landing page / overview (default '/') */
  overviewHref?: string;
  /** Target link for switching to Government Official Portal (default '/gov') */
  govHref?: string;
  /** Callback to return to landing page / overview */
  onBackToOverview?: () => void;
  /** Callback to switch to Government Official Portal */
  onSwitchToGovPortal?: () => void;
  /** Custom root className */
  className?: string;
}

export const PublicStoriesPage: React.FC<PublicStoriesPageProps> = ({
  overviewHref = '/',
  govHref = '/gov',
  onBackToOverview,
  onSwitchToGovPortal,
  className = '',
}) => {
  // Default to Kodagu as showcased in the design reference
  const [selectedZone, setSelectedZone] = useState<ZoneId>('Kodagu');
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [isOfflinePassOpen, setIsOfflinePassOpen] = useState(false);

  // Live forecast telemetry across all operational corridors
  const { districtMap, getDistrictStatus } = useDistrictForecastTelemetry({
    pollIntervalMs: 30000,
  });

  const activeStory = REGIONAL_STORIES[selectedZone] || REGIONAL_STORIES.Kodagu;
  const activeDistrictStatus = getDistrictStatus(selectedZone);

  return (
    <div
      className={`relative w-full min-h-screen xl:h-screen xl:max-h-screen flex flex-col justify-between p-2 sm:p-2.5 lg:p-3 xl:p-4 select-none transition-colors duration-300 overflow-x-hidden overflow-y-auto xl:overflow-hidden ${className}`}
    >
      {/* Background Subtle Ambient Vignette matching reference picture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 via-bg-base to-forest-deep/10 dark:from-[#0d2a1f]/40 dark:via-[#061710] dark:to-[#030c08] pointer-events-none" />

      {/* 1. TOP HEADER: Navigation, Page Title & Coordinates Readout */}
      <div className="relative z-20 w-full mb-1 sm:mb-2 shrink-0">
        <StoriesHeaderCoordinates
          latitude={activeStory.coordinates.display.lat}
          longitude={activeStory.coordinates.display.lng}
          overviewHref={overviewHref}
          govHref={govHref}
          onBackToOverview={onBackToOverview}
          onSwitchToGovPortal={onSwitchToGovPortal}
        />
      </div>

      {/* 2. MAIN INTERACTION CANVAS: Balanced 3-Column Layout matching screenshot */}
      <div className="relative z-10 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 items-start gap-2.5 sm:gap-3 xl:gap-4 min-h-0 my-auto py-1 lg:py-0">
        {/* Left Column (Cols 1-4): TERRA Tourist Hazard Advisory Card */}
        <div className="col-span-1 lg:col-span-4 flex flex-col justify-start items-stretch w-full lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-y-auto custom-scrollbar">
          <TouristDistrictCard
            zone={selectedZone}
            weatherState={activeDistrictStatus?.weather_state}
            dangerCellsCount={activeDistrictStatus?.danger_cells}
            lastCycleAt={activeDistrictStatus?.last_cycle_at || undefined}
            onOpenDetails={() => setIsRiskModalOpen(true)}
            onOpenOfflinePass={() => setIsOfflinePassOpen(true)}
          />
        </div>

        {/* Center Column (Cols 5-8): India Map with Legend on top */}
        <div className="col-span-1 lg:col-span-4 h-full w-full flex flex-col items-center justify-center relative min-h-[300px] lg:min-h-0">
          {/* Map Legend Overlay (Matching Reference Image) */}
          <div className="mb-1.5 sm:mb-2 z-10 shrink-0">
            <MapLegendOverlay />
          </div>

          {/* India Map Component */}
          <div className="w-full flex-1 flex items-center justify-center relative min-h-0">
            <IndiaStoriesMap
              selectedZone={selectedZone}
              onSelectZone={(zone) => setSelectedZone(zone)}
              onOpenSlideshow={() => setIsRiskModalOpen(true)}
            />
          </div>
        </div>

        {/* Right Column (Cols 9-12): Dropdown + 72h Radar + 5-Day Weather */}
        <div className="col-span-1 lg:col-span-4 flex flex-col gap-2 sm:gap-2.5 xl:gap-3 justify-start w-full lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-y-auto custom-scrollbar">
          {/* 1. Choose District Dropdown Menu (Aligned with Left Advisory Box) */}
          <DistrictDropdown
            selectedZone={selectedZone}
            onSelectZone={(zone) => setSelectedZone(zone)}
            getDistrictStatus={getDistrictStatus}
            weatherMap={districtMap}
          />

          {/* 2. Live Travel Status & 72-Hour Safe Travel Window Radar */}
          <SafeTravelRadarCard zone={selectedZone} />

          {/* 3. 5-Day Forecast Weather Card */}
          <TouristWeatherStrip zone={selectedZone} />
        </div>
      </div>

      {/* 3. MODALS */}
      {/* Deep Scientific Risk Assessment Modal */}
      <DistrictRiskModal
        isOpen={isRiskModalOpen}
        zone={selectedZone}
        onClose={() => setIsRiskModalOpen(false)}
      />

      {/* Feature 5: One-Click Offline Tourist Emergency Pass Modal */}
      <OfflineTouristPassModal
        isOpen={isOfflinePassOpen}
        zone={selectedZone}
        onClose={() => setIsOfflinePassOpen(false)}
      />
    </div>
  );
};

export default PublicStoriesPage;
