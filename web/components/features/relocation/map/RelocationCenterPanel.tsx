'use client';

import { useState } from 'react';

import type {
  AllocationAssignment,
  AllocationPlanResponse,
  CandidateSiteItem,
  HabitationListItem,
} from '@/lib/api/types';

import { RelocationCenterMap } from './RelocationCenterMap';
import { RelocationMapLayerCard } from './RelocationMapLayerCard';
import { RelocationMapTopHud } from './RelocationMapTopHud';
import { RelocationParcelDrawer } from './RelocationParcelDrawer';
import { RelocationSitesPanel } from '../sites/RelocationSitesPanel';

export interface RelocationCenterPanelProps {
  habitation: HabitationListItem | null;
  sites: CandidateSiteItem[];
  allocatableSites: CandidateSiteItem[];
  totalInRange?: number;
  radiusKm: number;
  isLoadingSites?: boolean;
  selectedSiteId: number | null;
  onSelectSite: (site: CandidateSiteItem) => void;
  onSimulateCapacity?: (site: CandidateSiteItem) => void;
  onRetrySites?: () => void;
  includeScreening: boolean;
  onIncludeScreeningChange: (include: boolean) => void;
  plan: AllocationPlanResponse | null;
  habitations: HabitationListItem[];
  onSelectAssignment?: (assignment: AllocationAssignment) => void;
  /** Collapsible state and handlers */
  isLeftCollapsed: boolean;
  onToggleLeftCollapse: () => void;
  isRightCollapsed: boolean;
  onToggleRightCollapse: () => void;
  className?: string;
}

export const RelocationCenterPanel = ({
  habitation,
  sites,
  allocatableSites,
  totalInRange,
  radiusKm,
  isLoadingSites = false,
  selectedSiteId,
  onSelectSite,
  onSimulateCapacity,
  onRetrySites,
  includeScreening,
  onIncludeScreeningChange,
  plan,
  habitations,
  onSelectAssignment,
  isLeftCollapsed,
  onToggleLeftCollapse,
  isRightCollapsed,
  onToggleRightCollapse,
  className = '',
}: RelocationCenterPanelProps) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [is3DMode, setIs3DMode] = useState(true);

  // GIS Display settings
  const [opacity, setOpacity] = useState(0.85);
  const [showConfidenceHatch, setShowConfidenceHatch] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
  const [showHardZero, setShowHardZero] = useState(true);
  const [showNoCoverage, setShowNoCoverage] = useState(true);

  return (
    <div className={['relative flex h-full w-full min-w-0 flex-1 flex-col overflow-hidden', className].filter(Boolean).join(' ')}>
      {/* Main MapLibre + Deck.gl 3D Canvas */}
      <RelocationCenterMap
        habitation={habitation}
        sites={includeScreening ? sites : allocatableSites}
        selectedSiteId={selectedSiteId}
        onSelectSite={onSelectSite}
        plan={plan}
        habitations={habitations}
        onSelectAssignment={onSelectAssignment}
        is3DMode={is3DMode}
        opacity={opacity}
        showConfidenceHatch={showConfidenceHatch}
        confidenceThreshold={confidenceThreshold}
        showHardZero={showHardZero}
        showNoCoverage={showNoCoverage}
      />

      {/* Top Status & Mode HUD */}
      <RelocationMapTopHud
        habitation={habitation}
        totalSites={sites.length}
        allocatableCount={allocatableSites.length}
        isDrawerOpen={isDrawerOpen}
        onToggleDrawer={() => setIsDrawerOpen((open) => !open)}
        is3DMode={is3DMode}
        onToggle3D={() => setIs3DMode((mode) => !mode)}
      />

      {/* Right Floating GIS Controls Card */}
      <RelocationMapLayerCard
        opacity={opacity}
        onOpacityChange={setOpacity}
        showConfidenceHatch={showConfidenceHatch}
        onShowConfidenceHatchChange={setShowConfidenceHatch}
        confidenceThreshold={confidenceThreshold}
        onConfidenceThresholdChange={setConfidenceThreshold}
        showHardZero={showHardZero}
        onShowHardZeroChange={setShowHardZero}
        showNoCoverage={showNoCoverage}
        onShowNoCoverageChange={setShowNoCoverage}
      />

      {/* Candidate Parcels Slide-Over Drawer */}
      <RelocationParcelDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
        <RelocationSitesPanel
          habitation={habitation}
          sites={sites}
          allocatableSites={allocatableSites}
          totalInRange={totalInRange}
          radiusKm={radiusKm}
          isLoading={isLoadingSites}
          selectedSiteId={selectedSiteId}
          onSelectSite={onSelectSite}
          onSimulateCapacity={onSimulateCapacity}
          onRetry={onRetrySites}
          includeScreening={includeScreening}
          onIncludeScreeningChange={onIncludeScreeningChange}
        />
      </RelocationParcelDrawer>
    </div>
  );
};
