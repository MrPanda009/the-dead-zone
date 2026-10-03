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

export const FLOOD_MODEL_NAME = 'SETU-DRR flood susceptibility';

/** What the riverine flood layer is built from. Keep in step with `susceptibility.py`. */
export const FLOOD_MODEL_INPUTS =
  'Sentinel-1 SAR inundation frequency + Copernicus GLO-30 HAND';

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
