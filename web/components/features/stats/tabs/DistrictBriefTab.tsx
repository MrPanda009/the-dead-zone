'use client';

import React from 'react';

import { FLOOD_MODEL_INPUTS } from '@/lib/stats/copy';

import { DistrictMapPanel } from '../DistrictMapPanel';
import { DistrictPicker } from '../DistrictPicker';
import type { DistrictBriefTabProps } from '../types';
import { BriefDossierPanel } from './brief/BriefDossierPanel';
import { BriefHeader } from './brief/BriefHeader';
import { ModelStatusBadge } from './brief/ModelStatusBadge';

/**
 * Flood exposure brief for one district: the live hazard layer on the left, the API's district
 * rollup on the right. Composition only; data arrives as props from `StatsDashboard`.
 */
export const DistrictBriefTab: React.FC<DistrictBriefTabProps> = ({
  districts,
  selectedDistrict,
  onSelectDistrict,
  summary,
  layer,
  className = '',
  classNames = {},
}) => (
  <div
    className={`h-full min-h-0 flex flex-col justify-between overflow-y-auto lg:overflow-hidden ${classNames.root ?? ''} ${className}`}
  >
    <BriefHeader
      title={`Flood Exposure / District Brief — ${selectedDistrict.name}`}
      actionsSlot={
        <>
          <DistrictPicker districts={districts} selected={selectedDistrict} onSelect={onSelectDistrict} />
          <ModelStatusBadge summary={summary.data} isLoading={summary.isLoading} hasError={summary.error !== null} />
        </>
      }
    />

    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
      <DistrictMapPanel
        className="lg:col-span-7 h-[360px] sm:h-[420px] lg:h-full"
        district={selectedDistrict}
        summary={summary}
        layer={layer}
        captionSlot={
          <div className="flex items-center justify-between text-[10px] font-mono text-text-muted pt-1 px-1 shrink-0">
            <span>H3 res-8 cells · {FLOOD_MODEL_INPUTS}</span>
            <span>Pan and zoom to explore</span>
          </div>
        }
      />
      <BriefDossierPanel district={selectedDistrict} summary={summary} />
    </div>
  </div>
);
