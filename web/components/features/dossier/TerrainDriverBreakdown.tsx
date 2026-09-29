'use client';

import { useMemo, useRef, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { SectionHeader } from '@/components/common/SectionHeader';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import type { FeatureContribution, HazardType } from '@/lib/api/types';
import { selectHazardContributions } from '@/lib/map/terrainFeatures';

import { AttributionModelNotice } from './AttributionModelNotice';
import { TerrainDriverRow } from './TerrainDriverRow';

export interface TerrainDriverBreakdownProps {
  contributions: readonly FeatureContribution[];
  hazardType?: HazardType;
  attributionModelVersion?: string | null;
  scoreModelVersion?: string | null;
  title?: ReactNode;
  description?: ReactNode;
  emptyMessage?: ReactNode;
  className?: string;
  classNames?: {
    root?: string;
    header?: string;
    list?: string;
    empty?: string;
  };
  animation?: {
    disabled?: boolean;
    stagger?: number;
    duration?: number;
  };
}

/**
 * Terrain features behind a non-flood score (slope, relief, road proximity, HAND, TWI).
 *
 * Counterpart of `DriverBreakdown`, which reads flood-only raster drivers and is empty for
 * every other layer. Bars show each feature's share of the attributed score.
 */
export const TerrainDriverBreakdown = ({
  contributions,
  hazardType,
  attributionModelVersion,
  scoreModelVersion,
  title = 'Why this score',
  description = 'Terrain feature attributions · bar = share of score',
  emptyMessage = 'No terrain attributions are published for this cell.',
  className = '',
  classNames = {},
  animation = {},
}: TerrainDriverBreakdownProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { disabled = false, stagger = 0.04, duration = 0.35 } = animation;
  const animate = !disabled && !prefersReducedMotion;

  const rows = useMemo(() => {
    const selected = selectHazardContributions(contributions, hazardType);
    const total = selected.reduce((sum, item) => sum + Math.max(item.contribution, 0), 0);
    return selected.map((item) => ({ item, share: total > 0 ? item.contribution / total : null }));
  }, [contributions, hazardType]);

  useGSAP(
    () => {
      // An empty panel has no rows to target; GSAP warns on a selector that matches nothing.
      if (!animate || rows.length === 0) return;
      gsap.from('[data-driver-row]', { y: 8, opacity: 0, duration, stagger, ease: 'power2.out' });
    },
    { scope: rootRef, dependencies: [rows, animate, duration, stagger] },
  );

  return (
    <div
      ref={rootRef}
      className={['flex flex-col gap-2.5', classNames.root ?? '', className].filter(Boolean).join(' ')}
    >
      <SectionHeader title={title} description={description} className={classNames.header} />

      <AttributionModelNotice
        attributionModelVersion={attributionModelVersion}
        scoreModelVersion={scoreModelVersion}
      />

      {rows.length === 0 ? (
        <p className={['text-[10px] text-ink-faint', classNames.empty ?? ''].join(' ')}>{emptyMessage}</p>
      ) : (
        <div className={['flex flex-col gap-2.5', classNames.list ?? ''].join(' ')}>
          {rows.map(({ item, share }) => (
            <TerrainDriverRow key={item.feature} contribution={item} share={share} />
          ))}
        </div>
      )}
    </div>
  );
};
