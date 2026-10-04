/**
 * Single source for user-facing wording about the flood model and the evidence behind it.
 *
 * The Stats dashboard must only describe what the pipeline actually does. Keeping the
 * model description and the validation notice here means a copy change happens in one
 * place, and the ESLint guard on `components/features/stats/**` can forbid claims such as
 * "calibrated", "cross-validation" or "ground truth" everywhere else.
 *
 * The model version itself is never written here: the UI reads it from
 * `DistrictHazardSummaryDTO.model_version`.
 */

import {
  REGIME_DESCRIPTIONS,
  REGIME_ICONS,
  REGIME_LABELS as MAP_REGIME_LABELS,
  REGIME_ORDER,
} from '@/lib/map/constants';

export const FLOOD_MODEL_NAME = 'SETU-DRR flood susceptibility';

/** What the riverine flood layer is built from. Keep in step with `susceptibility.py`. */
export const FLOOD_MODEL_INPUTS =
  'Sentinel-1 SAR inundation frequency (beyond normal river water) + Copernicus GLO-30 HAND, scored per hazard regime';

export const NOT_VALIDATED_TITLE = 'Not yet validated';

export const NOT_VALIDATED_NOTICE =
  'No independent validation has been run for this layer. Recorded losses and computed ' +
  'susceptibility are shown side by side for context only; they are not a measure of ' +
  'model accuracy.';

export const STATE_LEVEL_RECORDS_NOTICE =
  'State-level records (CWC / MHA / NCRB). They are not broken down by district or by event footprint.';

export const NOT_AVAILABLE_LABEL = 'Not available';
export const NOT_AVAILABLE_DESCRIPTION = 'No data source is connected for this yet.';

/** Methodology notes for the comparison page. They describe limits, not results. */
export const COMPARISON_CAVEATS: readonly string[] = [
  'Recorded losses are state-level totals and mix hazards (floods, heavy rain, landslides, cyclones). The model covers one district and one hazard.',
  'The model ranks cells by flood susceptibility. It is not an event footprint, a depth estimate or a forecast.',
  'CWC and MHA series cover only some years per state, so a missing record is not evidence of no loss.',
  'Cells without satellite coverage are unmeasured. They are never counted as safe.',
];

/** Neutral snapshot label for datasets whose ingest date is not recorded in the database. */
export const SNAPSHOT_LABEL = 'Snapshot';

/** Validation panel wording. Numbers are never written here: they come from the API. */
export const VALIDATION_COPY = {
  baselinesTitle: 'Model vs baselines',
  baselinesUnit: 'ROC-AUC, 95% CI',
  baselinesFootnote:
    'Each baseline is compared with the model on the same resampled spatial blocks. ' +
    '"Similar" means the interval of the difference includes zero.',
  verdict: {
    model: 'Model',
    better_than_model: 'Above model',
    worse_than_model: 'Below model',
    indistinguishable: 'Similar',
    unknown: 'No interval',
  },
  regimesTitle: 'Hazard regimes',
  regimesUnit: 'All published cells',
  regimesHeadline: 'Headline',
  charNote: (people: string) =>
    `${people} people live in char-belt cells. Char water is partly normal river presence, so ` +
    'their susceptibility reads lower than their exposure — read the score together with the regime.',
  lowSample: (nNeg: number, nBlocks: number | null) =>
    `Only ${nNeg} not-flooded cells${nBlocks ? ` across ${nBlocks} spatial blocks` : ''}. ` +
    'The aggregate ROC-AUC rests on few negatives; per-year results are more informative.',
  inSample: 'In-sample: same year as the SAR stack the model is built from',
  holdout: 'Later year, not used to build the model',
  rankAgreement: 'Rank agreement with NDEM flood frequency',
} as const;

/** Display names for validation baselines, keyed by the predictor names in metrics.json. */
export const BASELINE_LABELS: Record<string, { label: string; source: string }> = {
  model: { label: 'Susceptibility model', source: 'SETU flood layer' },
  hand_only: { label: 'HAND only', source: 'ASF GLO-30 HAND' },
  frequency_only: { label: 'SAR frequency only', source: 'Sentinel-1 stack' },
  anomalous_frequency_only: { label: 'Anomalous frequency only', source: 'Sentinel-1 − JRC occurrence' },
  dist_tributary: { label: 'Distance to tributaries', source: 'OSM + HydroRIVERS' },
  dist_any_river: { label: 'Distance to any river', source: 'OSM waterways' },
  dist_mainstem: { label: 'Distance to Brahmaputra', source: 'OSM mainstem' },
};

/** Regime display data for validation cards, derived from the map constants (single source). */
export const REGIME_LABELS: Record<string, { label: string; icon: string; description: string }> =
  Object.fromEntries(
    REGIME_ORDER.map((regime) => [
      regime,
      { label: MAP_REGIME_LABELS[regime], icon: REGIME_ICONS[regime], description: REGIME_DESCRIPTIONS[regime] },
    ]),
  );
