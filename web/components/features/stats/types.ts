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

export interface DataSourcesFooterProps extends BaseStatsProps {
  caveats?: string[];
  lastUpdated?: string;
}
