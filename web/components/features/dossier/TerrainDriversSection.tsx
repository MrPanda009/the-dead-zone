'use client';

import { useCellExplanation } from '@/lib/hooks/useCellExplanation';
import type { HazardType } from '@/lib/api/types';

import { DriverBreakdownSkeleton } from './DriverBreakdownSkeleton';
import { TerrainDriverBreakdown } from './TerrainDriverBreakdown';

export interface TerrainDriversSectionProps {
  h3: string;
  hazardType?: HazardType;
  /** Model behind the score shown in the metrics box, for the mismatch notice. */
  scoreModelVersion?: string | null;
  className?: string;
}

/** Loads a cell's terrain attributions and renders them, with loading and error fallbacks. */
export const TerrainDriversSection = ({
  h3,
  hazardType,
  scoreModelVersion,
  className = '',
}: TerrainDriversSectionProps) => {
  const { contributions, attributionModelVersion, isLoading, error } = useCellExplanation(h3);

  if (isLoading) return <DriverBreakdownSkeleton className={className} />;

  return (
    <TerrainDriverBreakdown
      contributions={contributions}
      hazardType={hazardType}
      attributionModelVersion={attributionModelVersion}
      scoreModelVersion={scoreModelVersion}
      emptyMessage={
        error ? `Terrain attributions are unavailable (${error.message})` : undefined
      }
      className={className}
    />
  );
};
