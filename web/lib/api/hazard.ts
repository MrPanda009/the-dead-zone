/** Endpoint bindings for the static hazard layer API. */

import { apiGet } from './client';
import type {
  HazardCellDetail,
  HazardLayerResponse,
  HazardLayerSummary,
  HazardType,
} from './types';

export interface FetchHazardLayerParams {
  hazardType?: HazardType;
  res?: number;
  /** Viewport as [minLon, minLat, maxLon, maxLat]. Omit for the whole layer. */
  bbox?: [number, number, number, number];
  /** admin_boundary id or LGD code (277 = Barpeta). */
  admin?: number;
  minSusceptibility?: number;
  limit?: number;
}

/** Lists every published static hazard layer, for the layer switcher. */
export function fetchHazardLayers(signal?: AbortSignal): Promise<HazardLayerSummary[]> {
  return apiGet<HazardLayerSummary[]>('/hazard/layers', undefined, signal);
}

/**
 * Fetches hazard cells plus the legend needed to colour them.
 *
 * The response carries no geometry — hexagon boundaries are derived from the H3 index
 * on the GPU by deck.gl's H3HexagonLayer.
 */
export function fetchHazardLayer(
  params: FetchHazardLayerParams = {},
  signal?: AbortSignal,
): Promise<HazardLayerResponse> {
  const { hazardType = 'riverine_flood', res = 8, bbox, admin, minSusceptibility, limit } = params;
  return apiGet<HazardLayerResponse>(
    '/hazard/cells',
    {
      hazard_type: hazardType,
      res,
      bbox: bbox ? bbox.join(',') : undefined,
      admin,
      min_susceptibility: minSusceptibility,
      limit,
    },
    signal,
  );
}

/** Fetches one cell's dossier: score, coverage provenance and physical drivers. */
export function fetchHazardCellDetail(
  h3: string,
  hazardType: HazardType = 'riverine_flood',
  signal?: AbortSignal,
): Promise<HazardCellDetail> {
  return apiGet<HazardCellDetail>(`/hazard/cells/${h3}`, { hazard_type: hazardType }, signal);
}

/** Lower / upper bound of a 95 % block-bootstrap interval; null when too few resamples. */
export type ValidationInterval = [number, number] | null;

/** One hazard regime: product footprint (all cells) next to agreement on evaluable cells. */
export interface ValidationRegime {
  regime: 'floodplain' | 'char_belt' | 'channel' | string;
  in_headline?: boolean;
  cell_count: number;
  share_pct: number;
  population?: number | null;
  mean_susceptibility: number;
  mean_confidence?: number | null;
  eval_cell_count?: number;
  eval_n_neg?: number;
  ndem_prevalence?: number | null;
  roc_auc?: number | null;
  spearman?: number | null;
}

export type ValidationYearRole = 'pre_sentinel1' | 'independent' | 'in_sample' | 'temporal_holdout';

/** Agreement against one NDEM year. */
export interface ValidationPerYearRow {
  year: number;
  role: ValidationYearRole;
  source: 'annual_composite' | 'event_layer';
  n_cells: number;
  n_pos: number;
  n_neg: number;
  prevalence: number | null;
  auc: Record<string, number | null>;
  auc_model_ci95: ValidationInterval;
}

export interface ValidationImbalance {
  n_cells: number;
  n_pos: number;
  n_neg: number;
  prevalence: number;
  n_blocks: number | null;
  low_negative_count_warning: boolean;
}

/** Block-bootstrap CIs keyed by predictor (model, hand_only, frequency_only, ...). */
export interface ValidationBaselineCi {
  auc?: Record<string, ValidationInterval>;
  spearman?: Record<string, ValidationInterval>;
  /** Paired CI of model AUC minus each baseline's AUC. */
  auc_model_minus?: Record<string, ValidationInterval>;
  n_blocks?: number;
}

export interface FloodValidationData {
  district: string;
  admin_id?: number | null;
  lgd_code?: number | null;
  model_version: string;
  status: 'validated' | 'not_validated';
  generated_at?: string | null;
  reference_name: string;
  reference_years: number[];
  n_cells: number;
  prevalence: number;
  roc_auc?: number | null;
  roc_auc_ci95?: [number, number] | null;
  pr_auc?: number | null;
  pr_auc_prevalence?: number | null;
  spearman_frequency?: number | null;
  baseline_hand_auc?: number | null;
  baseline_frequency_auc?: number | null;
  baseline_anomalous_frequency_auc?: number | null;
  baseline_dist_mainstem_auc?: number | null;
  baseline_dist_tributary_auc?: number | null;
  baseline_dist_any_river_auc?: number | null;
  baseline_distance_to_river_auc?: number | null;
  by_regime?: ValidationRegime[] | null;
  evaluation_domain?: { hazard_regimes?: string[] | null; strict_baseline_water_filter?: boolean } | null;
  imbalance?: ValidationImbalance | null;
  baseline_ci95?: ValidationBaselineCi | null;
  per_year?: ValidationPerYearRow[] | null;
  sensitivity?: Record<string, { description?: string; n_cells: number; n_neg: number; auc_model: number | null }> | null;
  year_matched_auc?: number | null;
  year_matched_year?: number | null;
  pre2015_auc?: number | null;
  losses_context?: {
    stack_year: number;
    series_n: number;
    percentile: number;
    flag: string;
    status: string;
    state?: string;
    primary_source?: string;
    data_source_type?: string;
    finding?: string;
  } | null;
  gauges?: {
    status: string;
    n_stations: number;
    finding?: string;
    temporal_check?: {
      status: string;
      n_in_event_scenes: number;
      n_out_of_event_scenes: number;
      mean_in_event_fraction: number;
      mean_out_of_event_fraction: number;
      mann_whitney_u: number;
      p_value: number;
    } | null;
  } | null;
  caveat_text: string;
  markdown_report?: string | null;
}

/** Fetches measured independent validation metrics for a district. */
export function fetchHazardValidation(
  admin: number,
  hazardType: string = 'riverine_flood',
  signal?: AbortSignal,
): Promise<FloodValidationData> {
  return apiGet<FloodValidationData>('/hazard/validation', { admin, hazard_type: hazardType }, signal);
}

