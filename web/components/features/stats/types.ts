import React from 'react';
import type {
  DisasterCaseStudyDTO,
  DisasterStatsResponse,
  DistrictHazardSummaryDTO,
} from '@/lib/api/stats';
import type { AsyncResource } from '@/lib/hooks/useAsyncResource';
import type { UseHazardLayerResult } from '@/lib/hooks/useHazardLayer';

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
  /** Stacks the header and shortens the chart for narrow columns. */
  compact?: boolean;
  onMetricChange?: (metric: 'lives' | 'houses' | 'cattle' | 'crop') => void;
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

/**
 * A district offered on the District Brief and Model vs History tabs.
 *
 * Identity and map framing only. Every number shown for a district comes from the API
 * (`DistrictHazardSummaryDTO` and the hazard cell layer).
 */
export interface StatsDistrict {
  name: string;
  state: string;
  lgdCode: number;
  lat: number;
  lng: number;
  zoom?: number;
}

export interface DatasetProvenanceItem {
  id: string;
  dataset: string;
  ministry: string;
  years: string;
  granularity: string;
  /** Neutral label such as "Snapshot". Never an asserted date unless the ingest date is recorded. */
  freshness: string;
  limitations: string;
  /** True when the data is loaded into our database and served by our API. */
  integrated: boolean;
  icon: string;
  sourceUrl?: string;
}

export interface StatsSubNavProps extends BaseStatsProps {
  activeTab: StatsTabId;
  onSelectTab: (tabId: StatsTabId) => void;
}

export interface DisasterHistoryTabProps extends BaseStatsProps {
  stats: AsyncResource<DisasterStatsResponse>;
  selectedState: string;
  onSelectState: (state: string) => void;
  availableStates: string[];
}

export interface DistrictBriefTabProps extends BaseStatsProps {
  districts: StatsDistrict[];
  selectedDistrict: StatsDistrict;
  onSelectDistrict: (district: StatsDistrict) => void;
  summary: AsyncResource<DistrictHazardSummaryDTO>;
  layer: UseHazardLayerResult;
}

export interface ModelVsHistoryTabProps extends BaseStatsProps {
  districts: StatsDistrict[];
  selectedDistrict: StatsDistrict;
  onSelectDistrict: (district: StatsDistrict) => void;
  summary: AsyncResource<DistrictHazardSummaryDTO>;
  layer: UseHazardLayerResult;
  stats: AsyncResource<DisasterStatsResponse>;
  /**
   * Slot for a measured validation result. Phase U always leaves it empty, which renders the
   * "Not yet validated" notice. A later phase passes a metrics card here once a validation
   * run exists; nothing on this page may show an agreement figure without one.
   */
  validationSlot?: React.ReactNode;
}

export interface DataProvenanceTabProps extends BaseStatsProps {
  datasets?: DatasetProvenanceItem[];
}

export interface StatsDonutChartProps extends BaseStatsProps {
  stats: DisasterStatsResponse | null;
  isLoading?: boolean;
}

export interface CaseStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseStudy: DisasterCaseStudyDTO | null;
}

