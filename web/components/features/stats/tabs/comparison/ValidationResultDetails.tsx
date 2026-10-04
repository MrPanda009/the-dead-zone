'use client';

import { useMemo, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import type { FloodValidationData } from '@/lib/api/hazard';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import { VALIDATION_COPY } from '@/lib/stats/copy';
import { buildBaselineComparisons, findYear, formatInterval, formatScore } from '@/lib/stats/validation';

import { LowSampleWarningBadge } from './LowSampleWarningBadge';
import { ValidationBaselinesCard } from './ValidationBaselinesCard';
import { ValidationCaveatBox } from './ValidationCaveatBox';
import { ValidationGaugeNote } from './ValidationGaugeNote';
import { ValidationMetricTile } from './ValidationMetricTile';
import { ValidationReferenceBanner } from './ValidationReferenceBanner';
import { ValidationRegimesCard } from './ValidationRegimesCard';

export interface ValidationResultDetailsProps {
  /** Measured validation payload returned by `GET /hazard/validation`. */
  data: FloodValidationData;
  className?: string;
  classNames?: {
    root?: string;
    metricsGrid?: string;
    disclaimer?: string;
  };
  animation?: { disabled?: boolean; duration?: number; stagger?: number };
}

/**
 * Measured agreement with NDEM: rank agreement and per-year results first, then the
 * aggregate AUC with its sample-size warning, baselines, regimes and caveats. Every
 * number comes from the payload.
 */
export const ValidationResultDetails = ({
  data,
  className = '',
  classNames = {},
  animation = {},
}: ValidationResultDetailsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { disabled = false, duration = 0.35, stagger = 0.04 } = animation;

  useGSAP(
    () => {
      if (disabled || prefersReducedMotion) return;
      gsap.from('.anim-metric-card', { y: 10, opacity: 0, duration, stagger, ease: 'power2.out' });
    },
    { scope: containerRef, dependencies: [data.generated_at, disabled, prefersReducedMotion] },
  );

  const baselineRows = useMemo(() => buildBaselineComparisons(data), [data]);
  const inSample = findYear(data, 'in_sample');
  const holdout = findYear(data, 'temporal_holdout');
  const imbalance = data.imbalance;
  const years = data.reference_years;
  const domain = data.evaluation_domain?.hazard_regimes?.join(', ');
  const losses = data.losses_context;

  return (
    <div ref={containerRef} className={['space-y-3', classNames.root ?? '', className].join(' ')}>
      <ValidationReferenceBanner
        versionLabel={data.model_version.replace('flood-susceptibility-', '')}
        yearsLabel={years.length ? `${years[0]}–${years[years.length - 1]} (${years.length} layers)` : 'Historical series'}
        referenceName={data.reference_name}
        scopeLabel={`${data.n_cells.toLocaleString()} ${domain ? `${domain} ` : ''}H3 cells`}
      />

      {imbalance?.low_negative_count_warning && (
        <LowSampleWarningBadge message={VALIDATION_COPY.lowSample(imbalance.n_neg, imbalance.n_blocks)} />
      )}

      <div className={['grid grid-cols-2 gap-2', classNames.metricsGrid ?? ''].join(' ')}>
        <ValidationMetricTile
          variant="accent"
          label="Spearman rho"
          value={formatScore(data.spearman_frequency)}
          detail={formatInterval(data.baseline_ci95?.spearman?.model)}
          caption={VALIDATION_COPY.rankAgreement}
        />
        <ValidationMetricTile
          label="Ever-flooded ROC-AUC"
          value={formatScore(data.roc_auc)}
          detail={formatInterval(data.roc_auc_ci95 ?? null)}
          caption={
            imbalance
              ? `${imbalance.n_pos.toLocaleString()} flooded / ${imbalance.n_neg.toLocaleString()} not`
              : `Prevalence ${(data.prevalence * 100).toFixed(1)}%`
          }
        />
        {inSample && (
          <ValidationMetricTile
            label={`${inSample.year} ROC-AUC`}
            value={formatScore(inSample.auc.model)}
            detail={formatInterval(inSample.auc_model_ci95)}
            caption={`${VALIDATION_COPY.inSample} · ${inSample.n_cells.toLocaleString()} cells in layer coverage`}
          />
        )}
        {holdout && (
          <ValidationMetricTile
            label={`${holdout.year} ROC-AUC`}
            value={formatScore(holdout.auc.model)}
            detail={formatInterval(holdout.auc_model_ci95)}
            caption={VALIDATION_COPY.holdout}
          />
        )}
        <ValidationMetricTile
          label="PR-AUC vs chance"
          value={formatScore(data.pr_auc)}
          detail={`vs ${data.prevalence.toFixed(3)}`}
          caption="Chance equals the flooded share of cells"
        />
        <ValidationMetricTile
          label="State climate context"
          value={losses?.percentile ? `${losses.percentile.toFixed(1)}%` : 'N/A'}
          detail={losses?.flag}
          caption={losses?.series_n ? `${losses.stack_year} in a ${losses.series_n}-yr CWC series` : 'CWC damage tally'}
        />
      </div>

      <ValidationBaselinesCard rows={baselineRows} />
      <ValidationRegimesCard byRegime={data.by_regime} />
      {data.gauges && <ValidationGaugeNote gauges={data.gauges} />}

      <ValidationCaveatBox className={classNames.disclaimer}>{data.caveat_text}</ValidationCaveatBox>
    </div>
  );
};
