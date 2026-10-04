/** Horizontal flight direction across the viewport. */
export type PterodactylDirection = 'ltr' | 'rtl';

/** Direction preference — `'random'` picks a side per flight. */
export type PterodactylDirectionMode = PterodactylDirection | 'random';

/** Summon direction preference — `'ltr'`, `'rtl'`, `'random'`, or `'alternate'` (starts 'ltr', then alternates). */
export type SummonDirectionMode = PterodactylDirectionMode | 'alternate';

/** Accepted summon key sequences: single string or list of aliases. */
export type SummonSequence = string | readonly string[];

/** Inclusive millisecond range used for randomised scheduling. */
export interface MsRange {
  min: number;
  max: number;
}

/** Fractional viewport-height band the bird cruises in (0 = top, 1 = bottom). */
export interface AltitudeBand {
  min: number;
  max: number;
}

/** Flight trajectory mode. */
export type FlightTrajectory = 'level' | 'descending' | 'climbing';

/** Info passed to flyby lifecycle callbacks. */
export interface PterodactylFlightInfo {
  /** Direction of the flight that triggered the callback */
  direction: PterodactylDirection;
  /** Trajectory mode of this flight */
  trajectory?: FlightTrajectory;
  /** Whether the flight was summoned manually (key sequence / `summon()`) */
  summoned: boolean;
}

/** Why the Earth was dropped. */
export type EarthDropCause = 'random' | 'click';
