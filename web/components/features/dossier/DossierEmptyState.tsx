'use client';

import React from 'react';
import { EmptyState } from '@/components/common/EmptyState';

export interface DossierEmptyStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export const DossierEmptyState: React.FC<DossierEmptyStateProps> = ({
  title = 'No cell selected',
  description = 'Click a hexagon on the map to open its dossier: score, coverage provenance, and live meteorological triggers.',
  className = '',
}) => (
  <div className={['flex flex-col gap-4', className].filter(Boolean).join(' ')}>
    <EmptyState title={title} description={description} />
  </div>
);
