'use client';

import React, { useState } from 'react';
import { ZoneId, REGIONAL_STORIES } from './storyData';
import { StoriesHeaderCoordinates } from './StoriesHeaderCoordinates';
import { ZoneTickSelector } from './ZoneTickSelector';
import { IndiaStoriesMap } from './IndiaStoriesMap';
import { DistrictRiskModal } from './DistrictRiskModal';
import { TouristDistrictCard } from './TouristDistrictCard';

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
  // Default to Wayanad (supported backend pilot district)
  const [selectedZone, setSelectedZone] = useState<ZoneId>('Wayanad');
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);

  const activeStory = REGIONAL_STORIES[selectedZone] || REGIONAL_STORIES.Wayanad;

  return (
    <div
      className={`relative w-full min-h-screen lg:h-screen overflow-y-auto lg:overflow-hidden bg-bg-base text-text-primary dark:bg-[#0e261d] dark:text-cream flex flex-col justify-between p-3 sm:p-5 lg:p-6 xl:p-8 select-none transition-colors duration-300 ${className}`}
    >
      {/* Background Subtle Ambient Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-forest-mid/25 via-bg-base to-forest-deep/15 dark:from-[#143d2c]/40 dark:via-[#0e261d] dark:to-[#081813] pointer-events-none" />

      {/* 1. TOP HEADER: Navigation & Coordinates Readout */}
      <div className="relative z-20 w-full mb-2">
        <StoriesHeaderCoordinates
          latitude={activeStory.coordinates.display.lat}
          longitude={activeStory.coordinates.display.lng}
          overviewHref={overviewHref}
          govHref={govHref}
          onBackToOverview={onBackToOverview}
          onSwitchToGovPortal={onSwitchToGovPortal}
        />
      </div>

      {/* 2. MAIN INTERACTION CANVAS: Left Card + Center Map + Right Zone Selector */}
      <div className="relative z-10 flex-1 w-full grid grid-cols-1 md:grid-cols-12 items-center gap-4 lg:gap-6 min-h-0">
        {/* Left Column: Tourist District Card & Live Advisory */}
        <div className="hidden md:flex md:col-span-5 lg:col-span-4 h-full flex-col justify-center pl-1 lg:pl-2">
          <TouristDistrictCard
            zone={selectedZone}
            onOpenDetails={() => setIsRiskModalOpen(true)}
          />
        </div>

        {/* Center Column: Interactive India Map with Region Cutout */}
        <div className="col-span-1 md:col-span-5 lg:col-span-6 h-full w-full flex items-center justify-center relative">
          <IndiaStoriesMap
            selectedZone={selectedZone}
            onSelectZone={(zone) => setSelectedZone(zone)}
            onOpenSlideshow={() => setIsRiskModalOpen(true)}
          />
        </div>

        {/* Right Column: Zone Tick Ruler Selector */}
        <div className="hidden md:flex md:col-span-2 lg:col-span-2 h-full flex-col justify-center items-end pr-2 lg:pr-4">
          <ZoneTickSelector
            selectedZone={selectedZone}
            onSelectZone={(zone) => setSelectedZone(zone)}
          />
        </div>
      </div>

      {/* Mobile/Tablet Fallback: District Selector and Tourist District Card */}
      <div className="md:hidden relative z-20 flex flex-col gap-3 pt-3 border-t border-line dark:border-white/10">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {(['North', 'West', 'Central', 'East', 'Kodagu', 'South'] as ZoneId[]).map((zone) => (
            <button
              key={zone}
              type="button"
              onClick={() => setSelectedZone(zone)}
              className={`px-2.5 py-1 text-xs rounded-xl font-mono transition-colors ${
                selectedZone === zone
                  ? 'bg-citron text-[#06100c] font-bold shadow'
                  : 'bg-surface-1 dark:bg-white/10 text-ink-muted dark:text-cream/60'
              }`}
            >
              {zone === 'North'
                ? 'Joshimath'
                : zone === 'West'
                ? 'Kachchh'
                : zone === 'Central'
                ? 'Satpura'
                : zone === 'East'
                ? 'Barpeta'
                : zone === 'Kodagu'
                ? 'Kodagu'
                : 'Wayanad'}
            </button>
          ))}
        </div>
        <TouristDistrictCard
          zone={selectedZone}
          onOpenDetails={() => setIsRiskModalOpen(true)}
        />
      </div>

      {/* 3. LIVE DISTRICT RISK ASSESSMENT MODAL */}
      <DistrictRiskModal
        isOpen={isRiskModalOpen}
        zone={selectedZone}
        onClose={() => setIsRiskModalOpen(false)}
      />
    </div>
  );
};

export default PublicStoriesPage;
