import React from 'react';
import type {
  DisasterCaseStudyDTO,
  DisasterStatsResponse,
  DistrictHazardSummaryDTO,
  StateDisasterComparisonDTO,
} from '@/lib/api/stats';

export interface BaseStatsProps {
  className?: string;
  classNames?: {
    root?: string;
    header?: string;
    content?: string;
    footer?: string;
  };
}

export interface StatsHeaderProps extends BaseStatsProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  selectedState: string;
  onSelectState: (state: string) => void;
  availableStates: string[];
  fromYear: number;
  toYear: number;
  onYearRangeChange?: (fromYear: number, toYear: number) => void;
  isLoading?: boolean;
}

export interface StateSelectorProps extends BaseStatsProps {
  selectedState: string;
  onSelectState: (state: string) => void;
  availableStates: string[];
  disabled?: boolean;
}

export interface LossTimeSeriesChartProps extends BaseStatsProps {
  stats: DisasterStatsResponse | null;
  isLoading?: boolean;
  selectedMetric?: 'lives' | 'houses' | 'cattle' | 'crop';
  onMetricChange?: (metric: 'lives' | 'houses' | 'cattle' | 'crop') => void;
}

export interface HazardCasualtyBreakdownProps extends BaseStatsProps {
  stats: DisasterStatsResponse | null;
  isLoading?: boolean;
}

export interface DistrictFloodRollupCardProps extends BaseStatsProps {
  summary: DistrictHazardSummaryDTO | null;
  isLoading?: boolean;
  districtName: string;
  lgdCode?: number;
  onSelectDistrict?: (lgdCode: number) => void;
}

export interface FloodModelVsHistoryCardProps extends BaseStatsProps {
  summary: DistrictHazardSummaryDTO | null;
  stats: DisasterStatsResponse | null;
  isLoading?: boolean;
}

export interface ResponseCapacityCardProps extends BaseStatsProps {
  stats: DisasterStatsResponse | null;
  isLoading?: boolean;
}

export interface NoneyCaseStudyCardProps extends BaseStatsProps {
  caseStudy: DisasterCaseStudyDTO | null;
  isLoading?: boolean;
}

export type StatsTabId = 'history' | 'brief' | 'comparison' | 'sources';

export interface PilotDistrict {
  name: string;
  state: string;
  lgdCode: number;
  lat: number;
  lng: number;
  zoom?: number;
  highSharePct: number;
  habitationsAtRisk: number;
  populationAtRisk: number;
  nearestPhcKm: number;
  highwaysDamaged: number;
  bridgesDamaged: number;
  schoolsDamaged: number;
  drivers: {
    handPct: number;
    slopePct: number;
    croplandPct: number;
    rainfallPct: number;
  };
}

export interface DatasetProvenanceItem {
  id: string;
  dataset: string;
  ministry: string;
  years: string;
  granularity: string;
  freshness: string;
  limitations: string;
  hasApi: boolean;
  icon: string;
  sourceUrl?: string;
}

export interface StatsSubNavProps extends BaseStatsProps {
  activeTab: StatsTabId;
  onSelectTab: (tabId: StatsTabId) => void;
}

export interface DisasterHistoryTabProps extends BaseStatsProps {
  stats: DisasterStatsResponse | null;
  selectedState: string;
  onSelectState: (state: string) => void;
  availableStates: string[];
  caseStudy: DisasterCaseStudyDTO | null;
  isLoading?: boolean;
  onOpenCaseStudyModal?: (caseStudy: DisasterCaseStudyDTO) => void;
}

export interface DistrictBriefTabProps extends BaseStatsProps {
  districts: PilotDistrict[];
  selectedDistrict: PilotDistrict;
  onSelectDistrict: (district: PilotDistrict) => void;
  summary: DistrictHazardSummaryDTO | null;
  isLoading?: boolean;
}

export interface ModelVsHistoryTabProps extends BaseStatsProps {
  districts: PilotDistrict[];
  selectedDistrict: PilotDistrict;
  onSelectDistrict: (district: PilotDistrict) => void;
  summary: DistrictHazardSummaryDTO | null;
  stats: DisasterStatsResponse | null;
  onNavigateToSources?: () => void;
  isLoading?: boolean;
}

export interface DataProvenanceTabProps extends BaseStatsProps {
  datasets?: DatasetProvenanceItem[];
  lastUpdated?: string;
  onSelectDataset?: (item: DatasetProvenanceItem) => void;
}

export interface StatsDonutChartProps extends BaseStatsProps {
  stats: DisasterStatsResponse | null;
  totalLives?: number;
  isLoading?: boolean;
}

export interface CaseStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseStudy: DisasterCaseStudyDTO | null;
}

export interface DataSourcesFooterProps extends BaseStatsProps {
  caveats?: string[];
  lastUpdated?: string;
}
