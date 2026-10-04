/**
 * Pure helpers that turn the `/hazard/validation` payload into display rows.
 * No wording beyond keys lives here; labels come from `copy.ts`.
 */

import type {
  FloodValidationData,
  ValidationInterval,
  ValidationPerYearRow,
  ValidationYearRole,
} from '@/lib/api/hazard';

import { BASELINE_LABELS } from './copy';

export type BaselineVerdict =
  | 'model'
  | 'better_than_model'
  | 'worse_than_model'
  | 'indistinguishable'
  | 'unknown';

export interface BaselineComparison {
  key: string;
  label: string;
  source: string;
  auc: number;
  ci: ValidationInterval;
  verdict: BaselineVerdict;
}

const AUC_FIELDS: Record<string, keyof FloodValidationData> = {
  model: 'roc_auc',
  hand_only: 'baseline_hand_auc',
  frequency_only: 'baseline_frequency_auc',
  anomalous_frequency_only: 'baseline_anomalous_frequency_auc',
  dist_tributary: 'baseline_dist_tributary_auc',
  dist_any_river: 'baseline_dist_any_river_auc',
  dist_mainstem: 'baseline_dist_mainstem_auc',
};

/** `diff` is the paired interval of model AUC minus baseline AUC. */
export function verdictFromDiff(diff: ValidationInterval | undefined): BaselineVerdict {
  if (!diff) return 'unknown';
  if (diff[0] > 0) return 'worse_than_model';
  if (diff[1] < 0) return 'better_than_model';
  return 'indistinguishable';
}

/** Model first, then every baseline the API returned, sorted by AUC. */
export function buildBaselineComparisons(data: FloodValidationData): BaselineComparison[] {
  const ci = data.baseline_ci95 ?? {};
  const rows: BaselineComparison[] = [];
  for (const [key, field] of Object.entries(AUC_FIELDS)) {
    const auc = data[field];
    if (typeof auc !== 'number') continue;
    const meta = BASELINE_LABELS[key] ?? { label: key, source: '' };
    rows.push({
      key,
      ...meta,
      auc,
      ci: key === 'model' ? (data.roc_auc_ci95 ?? ci.auc?.model ?? null) : (ci.auc?.[key] ?? null),
      verdict: key === 'model' ? 'model' : verdictFromDiff(ci.auc_model_minus?.[key]),
    });
  }
  const model = rows.filter((row) => row.key === 'model');
  const baselines = rows.filter((row) => row.key !== 'model').sort((a, b) => b.auc - a.auc);
  return [...model, ...baselines];
}

export function findYear(data: FloodValidationData, role: ValidationYearRole): ValidationPerYearRow | null {
  return data.per_year?.find((row) => row.role === role) ?? null;
}

export function formatInterval(ci: ValidationInterval | undefined, digits = 3): string | null {
  return ci ? `[${ci[0].toFixed(digits)}, ${ci[1].toFixed(digits)}]` : null;
}

export function formatScore(value: number | null | undefined, digits = 3): string {
  return typeof value === 'number' ? value.toFixed(digits) : 'N/A';
}
