'use client';

import React from 'react';
import { ErrorState } from '@/components/common/ErrorState';
import { ScreeningGradeNotice } from '@/components/common/ScreeningGradeNotice';
import { useHazardCellDetail } from '@/lib/hooks/useHazardCellDetail';
import { useForecastAlerts } from '@/lib/hooks/useForecastAlerts';
import type { HazardType, ForecastAlertItem, HazardCell } from '@/lib/api/types';
import { hasFloodDriverData } from '@/lib/map/drivers';

import { CoverageNotice } from './CoverageNotice';
import { RegimeContextBanner } from './RegimeContextBanner';
import { DossierEmptyState } from './DossierEmptyState';
import { DossierHeader } from './DossierHeader';
import { DossierSkeleton } from './DossierSkeleton';
import { DriverBreakdown } from './DriverBreakdown';
import { TerrainDriversSection } from './TerrainDriversSection';
import { CellMetricsBox } from './CellMetricsBox';
import { FiltersAndRulesBox } from './FiltersAndRulesBox';
import type { FloodHazardMapDisplayState } from '@/components/features/map/FloodHazardMap';

export interface CellDossierProps {
  /** Selected H3 index, or null for the empty state. */
  h3: string | null;
  hazardType?: HazardType;
  /** PRZ threshold used to colour the score card. */
  przThreshold?: number;
  /** Optional matching live forecast alert item for the selected cell */
  forecastAlert?: ForecastAlertItem | null;
  /** Optional complete list of forecast items */
  forecastItems?: ForecastAlertItem[];
  /** Optional active cell data used as fallback when no individual row exists */
  fallbackCell?: HazardCell | null;
  /** Display state for map filters and rules */
  display?: FloodHazardMapDisplayState;
  onDisplayChange?: (next: Partial<FloodHazardMapDisplayState>) => void;
  hatchedCount?: number;
  className?: string;
  classNames?: {
    root?: string;
    metrics?: string;
  };
}

/**
 * Right-panel dossier for the selected cell.
 *
 * Integrates physical drivers (flood rasters, or terrain attributions for other layers) and susceptibility/confidence with
 * real-time meteorological live forecast alert telemetry.
 */
export const CellDossier: React.FC<CellDossierProps> = ({
  h3,
  hazardType = 'riverine_flood',
  przThreshold = 0.85,
  forecastAlert,
  forecastItems,
  fallbackCell,
  display,
  onDisplayChange,
  hatchedCount,
  className = '',
  classNames = {},
}) => {
  const { detail, isLoading, error } = useHazardCellDetail(h3, hazardType, fallbackCell);

  // Auto-fetch forecast alerts if not provided by parent
  const internalForecast = useForecastAlerts({
    admin: 178,
    enabled: !forecastItems || forecastItems.length === 0,
  });

  const effectiveForecastItems = forecastItems && forecastItems.length > 0
    ? forecastItems
    : internalForecast.items;

  const resolvedForecastAlert =
    forecastAlert ??
    (h3 ? effectiveForecastItems.find((item) => item.h3 === h3) ?? null : null);

  const isWayanadDistrict =
    detail?.admin_name?.toLowerCase().includes('wayanad') ?? false;

  if (!h3) {
    return (
      <div className={['flex flex-col gap-3.5', className].filter(Boolean).join(' ')}>
        <DossierEmptyState />
        {display && onDisplayChange && (
          <FiltersAndRulesBox
            confidenceThreshold={display.confidenceThreshold}
            onConfidenceThresholdChange={(confidenceThreshold) =>
              onDisplayChange({ confidenceThreshold })
            }
            showHardZero={display.showHardZero}
            onShowHardZeroChange={(showHardZero) => onDisplayChange({ showHardZero })}
            showNoCoverage={display.showNoCoverage}
            onShowNoCoverageChange={(showNoCoverage) => onDisplayChange({ showNoCoverage })}
            hatchedCount={hatchedCount}
          />
        )}
      </div>
    );
  }

  if (isLoading) return <DossierSkeleton className={className} />;

  if (error) {
    return (
      <div className={['flex flex-col gap-3.5', className].filter(Boolean).join(' ')}>
        <ErrorState
          title="Cell unavailable"
          message={error.message}
          code={error.code}
          requestId={error.requestId}
        />
        {display && onDisplayChange && (
          <FiltersAndRulesBox
            confidenceThreshold={display.confidenceThreshold}
            onConfidenceThresholdChange={(confidenceThreshold) =>
              onDisplayChange({ confidenceThreshold })
            }
            showHardZero={display.showHardZero}
            onShowHardZeroChange={(showHardZero) => onDisplayChange({ showHardZero })}
            showNoCoverage={display.showNoCoverage}
            onShowNoCoverageChange={(showNoCoverage) => onDisplayChange({ showNoCoverage })}
            hatchedCount={hatchedCount}
          />
        )}
      </div>
    );
  }

  if (!detail) {
    return (
      <div className={['flex flex-col gap-3.5', className].filter(Boolean).join(' ')}>
        <DossierEmptyState />
        {display && onDisplayChange && (
          <FiltersAndRulesBox
            confidenceThreshold={display.confidenceThreshold}
            onConfidenceThresholdChange={(confidenceThreshold) =>
              onDisplayChange({ confidenceThreshold })
            }
            showHardZero={display.showHardZero}
            onShowHardZeroChange={(showHardZero) => onDisplayChange({ showHardZero })}
            showNoCoverage={display.showNoCoverage}
            onShowNoCoverageChange={(showNoCoverage) => onDisplayChange({ showNoCoverage })}
            hatchedCount={hatchedCount}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={['flex flex-col gap-3.5', classNames.root ?? '', className]
        .filter(Boolean)
        .join(' ')}
    >
      <DossierHeader detail={detail} />

      <CoverageNotice flag={detail.quality_flag} />

      {detail.regime_context ? <RegimeContextBanner context={detail.regime_context} /> : null}

      {/* Information Box with Susceptibility, Confidence, and Live Forecast */}
      <CellMetricsBox
        detail={detail}
        przThreshold={przThreshold}
        forecastAlert={resolvedForecastAlert}
        districtForecastActive={isWayanadDistrict}
        districtForecastSummary={{
          totalCells: internalForecast.data?.total_forecast_cells ?? effectiveForecastItems.length,
          totalExposed: internalForecast.data?.total_exposed_population ?? undefined,
          cycleAt: internalForecast.forecastCycleAt,
          horizonHours: internalForecast.data?.horizon_hours,
        }}
        classNames={{ root: classNames.metrics }}
      />

      {detail.drivers && hasFloodDriverData(detail.drivers) ? (
        <DriverBreakdown
          drivers={detail.drivers}
          regime={detail.regime_context?.regime ?? detail.drivers.hazard_regime ?? null}
          keyDrivers={detail.regime_context?.key_drivers}
          includeSecondary={detail.regime_context?.regime !== 'channel'}
        />
      ) : (
        <TerrainDriversSection
          h3={detail.h3}
          hazardType={hazardType}
          scoreModelVersion={detail.model_version}
        />
      )}

      <ScreeningGradeNotice notice={detail.screening_grade} className="rounded-xl border" />

      {/* Map Filters & Rules */}
      {display && onDisplayChange && (
        <FiltersAndRulesBox
          confidenceThreshold={display.confidenceThreshold}
          onConfidenceThresholdChange={(confidenceThreshold) =>
            onDisplayChange({ confidenceThreshold })
          }
          showHardZero={display.showHardZero}
          onShowHardZeroChange={(showHardZero) => onDisplayChange({ showHardZero })}
          showNoCoverage={display.showNoCoverage}
          onShowNoCoverageChange={(showNoCoverage) => onDisplayChange({ showNoCoverage })}
          hatchedCount={hatchedCount}
        />
      )}
    </div>
  );
};
