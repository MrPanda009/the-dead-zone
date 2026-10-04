'use client';

import React from 'react';

import { FLOOD_MODEL_INPUTS } from '@/lib/stats/copy';
import { useHazardValidation } from '@/lib/hooks/useHazardValidation';

import { DistrictMapPanel } from '../DistrictMapPanel';
import { DistrictPicker } from '../DistrictPicker';
import type { ModelVsHistoryTabProps } from '../types';
import { BriefHeader } from './brief/BriefHeader';
import { ModelStatusBadge } from './brief/ModelStatusBadge';
import { ComparisonColumnHeader } from './comparison/ComparisonColumnHeader';
import { RecordedLossesPanel } from './comparison/RecordedLossesPanel';
import { ValidationStatusCard } from './comparison/ValidationStatusCard';
import { ValidationResultDetails } from './comparison/ValidationResultDetails';

/**
 * Computed flood susceptibility next to recorded state-level losses.
 *
 * Implements Phase 5 (§8) product surface:
 * Reads `GET /hazard/validation?admin=...` and renders measured agreement metrics
 * (reference, years, n cells, ROC-AUC with CI, prevalence, caveat text).
 * If the endpoint returns 'not_validated', the card displays 'Not yet validated'.
 */
export const ModelVsHistoryTab: React.FC<ModelVsHistoryTabProps> = ({
  districts,
  selectedDistrict,
  onSelectDistrict,
  summary,
  layer,
  stats,
  validationSlot,
  className = '',
  classNames = {},
}) => {
  const version = layer.data?.model_version ?? summary.data?.model_version ?? null;
  const notComputed = summary.data?.model_status === 'not_computed';
  const validation = useHazardValidation(selectedDistrict.lgdCode);

  const activeValidationSlot =
    validationSlot ??
    (validation.data && validation.data.status === 'validated' ? (
      <ValidationResultDetails data={validation.data} />
    ) : undefined);

  return (
    <div
      className={`h-full min-h-0 flex flex-col justify-between overflow-y-auto lg:overflow-hidden ${classNames.root ?? ''} ${className}`}
    >
      <BriefHeader
        title={`Model vs History — ${selectedDistrict.name} (${selectedDistrict.state})`}
        actionsSlot={
          <>
            <DistrictPicker districts={districts} selected={selectedDistrict} onSelect={onSelectDistrict} />
            <ModelStatusBadge summary={summary.data} isLoading={summary.isLoading} hasError={summary.error !== null} />
          </>
        }
      />

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        <DistrictMapPanel
          className="lg:col-span-4 h-[300px] sm:h-[350px] lg:h-full"
          district={selectedDistrict}
          summary={summary}
          layer={layer}
          headerSlot={
            <ComparisonColumnHeader
              tone="computed"
              label="FLOOD SUSCEPTIBILITY LAYER"
              meta={notComputed ? 'Not computed' : version ? `${version} · H3 res-8` : 'H3 res-8'}
            />
          }
          captionSlot={
            <div className="text-[9px] font-mono text-text-muted pt-1 px-1 shrink-0">{FLOOD_MODEL_INPUTS}</div>
          }
        />

        <ValidationStatusCard
          className="lg:col-span-4"
          validationSlot={activeValidationSlot}
          apiCaveats={stats.data?.data_caveats ?? []}
        />

        <div className="lg:col-span-4 h-[300px] sm:h-[350px] lg:h-full flex flex-col min-h-0 overflow-hidden shrink-0 lg:shrink">
          <ComparisonColumnHeader tone="recorded" label="RECORDED LOSSES" meta="State-level · MHA / CWC / NCRB" />
          <RecordedLossesPanel stateName={selectedDistrict.state} stats={stats} />
        </div>
      </div>
    </div>
  );
};
