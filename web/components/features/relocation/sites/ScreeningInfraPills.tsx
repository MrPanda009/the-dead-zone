'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import type { ScreeningInfrastructure } from '@/lib/api/types';

export interface ScreeningInfraPillsProps {
  /** Screening-grade civic infrastructure harvested from HOT/OSM. */
  screeningInfra?: ScreeningInfrastructure | null;
  /** Custom root styling */
  className?: string;
  /** Granular style overrides */
  classNames?: {
    root?: string;
    pillsContainer?: string;
    pill?: string;
    badge?: string;
  };
  /** Microinteraction animation controls */
  animation?: {
    disabled?: boolean;
    duration?: number;
  };
  /** Callback when user clicks to inspect facilities on map */
  onInspectFacilities?: () => void;
}

/**
 * Renders screening-grade public infrastructure evidence (schools, health, water)
 * harvested from Humanitarian OpenStreetMap / Overpass API.
 */
export const ScreeningInfraPills = ({
  screeningInfra,
  className = '',
  classNames = {},
  animation = {},
  onInspectFacilities,
}: ScreeningInfraPillsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const { disabled: animationDisabled = false, duration = 0.3 } = animation;
  const animate = !animationDisabled && !prefersReducedMotion;

  useGSAP(
    () => {
      if (!animate || !containerRef.current) return;
      gsap.from('.infra-pill', {
        scale: 0.95,
        opacity: 0,
        duration,
        stagger: 0.04,
        ease: 'power2.out',
      });
    },
    { scope: containerRef, dependencies: [screeningInfra, animate, duration] },
  );

  if (!screeningInfra || screeningInfra.status === 'unscreened') {
    return (
      <div
        ref={containerRef}
        className={['flex items-center gap-1.5 text-[10px] text-ink-muted/80', className].join(' ')}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500/60" />
        <span>HOT/OSM civic screening: Pending</span>
      </div>
    );
  }

  const {
    schools_count_3km,
    nearest_school_dist_m,
    health_centres_count_8km,
    nearest_health_dist_m,
    water_points_count_1km,
    nearest_water_dist_m,
  } = screeningInfra;

  return (
    <div
      ref={containerRef}
      className={['flex flex-col gap-1.5 text-[10px]', classNames.root ?? '', className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="flex items-center gap-1 font-medium tracking-wide text-ink-faint uppercase text-[9px]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          HOT / OSM Screening Evidence
        </span>
        {onInspectFacilities && (
          <button
            type="button"
            onClick={onInspectFacilities}
            className="text-[9px] text-primary hover:underline cursor-pointer"
          >
            View on map
          </button>
        )}
      </div>

      <div
        className={[
          'flex flex-wrap items-center gap-1.5',
          classNames.pillsContainer ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Schools */}
        <span
          title={
            nearest_school_dist_m != null
              ? `Closest school is ${(nearest_school_dist_m / 1000).toFixed(1)} km away`
              : 'School within 3 km catchment'
          }
          className={[
            'infra-pill inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px]',
            'bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 text-ink',
            classNames.pill ?? '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span>🎓</span>
          <span className="font-semibold">{schools_count_3km}</span>
          <span className="text-ink-muted">
            {nearest_school_dist_m != null ? `(${(nearest_school_dist_m / 1000).toFixed(1)}km)` : 'sch'}
          </span>
        </span>

        {/* Health */}
        <span
          title={
            nearest_health_dist_m != null
              ? `Closest health centre is ${(nearest_health_dist_m / 1000).toFixed(1)} km away`
              : 'Healthcare facility within 8 km catchment'
          }
          className={[
            'infra-pill inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px]',
            'bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 text-ink',
            classNames.pill ?? '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span>🏥</span>
          <span className="font-semibold">{health_centres_count_8km}</span>
          <span className="text-ink-muted">
            {nearest_health_dist_m != null ? `(${(nearest_health_dist_m / 1000).toFixed(1)}km)` : 'phc'}
          </span>
        </span>

        {/* Water */}
        <span
          title={
            nearest_water_dist_m != null
              ? `Closest water point is ${(nearest_water_dist_m / 1000).toFixed(1)} km away`
              : 'Water point within 1.5 km catchment'
          }
          className={[
            'infra-pill inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px]',
            'bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 text-ink',
            classNames.pill ?? '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span>💧</span>
          <span className="font-semibold">{water_points_count_1km}</span>
          <span className="text-ink-muted">
            {nearest_water_dist_m != null ? `(${(nearest_water_dist_m / 1000).toFixed(1)}km)` : 'pts'}
          </span>
        </span>
      </div>
    </div>
  );
};
