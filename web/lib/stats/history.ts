/**
 * Pure helpers for the recorded-loss screens (MHA, NCRB, CWC). Each returns null or an empty
 * list when the payload does not support a statement, so callers render an empty state.
 */

import type { DisasterStatsResponse } from '@/lib/api/stats';

import { formatInteger, formatYearRange } from './format';

export interface HistoryInsight {
  id: string;
  text: string;
}

/**
 * Statements the loaded records support, and nothing else. Returns an empty list when the
 * API returned no usable series, so the caller can hide the card.
 */
export function deriveHistoryInsights(stats: DisasterStatsResponse | null | undefined): HistoryInsight[] {
  if (!stats) return [];
  const insights: HistoryInsight[] = [];

  const ncrb = stats.ncrb_hazard_breakdown ?? [];
  const totalDeaths = ncrb.reduce((acc, r) => acc + r.total_deaths, 0);
  if (ncrb.length > 0 && totalDeaths > 0) {
    const floodDeaths = ncrb.reduce(
      (acc, r) => acc + r.flood_deaths + r.flash_flood_deaths + r.cloudburst_deaths,
      0,
    );
    const years = ncrb.map((r) => r.calendar_year);
    const share = Math.round((floodDeaths / totalDeaths) * 100);
    insights.push({
      id: 'ncrb-flood-share',
      text: `Floods, flash floods and cloudbursts account for ${share}% of NCRB-recorded natural-hazard deaths in ${stats.state_name} (${formatYearRange(Math.min(...years), Math.max(...years))}).`,
    });
  }

  const losses = stats.loss_time_series ?? [];
  if (losses.length > 0) {
    const peak = losses.reduce((best, r) => (r.lives_lost > best.lives_lost ? r : best), losses[0]);
    if (peak.lives_lost > 0) {
      insights.push({
        id: 'mha-peak-year',
        text: `MHA records show the most lives lost in ${peak.year_label}: ${formatInteger(peak.lives_lost)} (all hazards).`,
      });
    }
  }

  const cwc = stats.cwc_flood_history ?? [];
  if (cwc.length > 0) {
    const latest = cwc.reduce((best, r) => (r.calendar_year > best.calendar_year ? r : best), cwc[0]);
    insights.push({
      id: 'cwc-latest',
      text: `CWC's latest flood-damage entry for ${stats.state_name} is ${latest.calendar_year}: ${formatInteger(latest.human_lives_lost)} lives lost, ₹${formatInteger(Math.round(latest.total_damage_crores))} Cr damage.`,
    });
  }

  return insights;
}

export type NcrbRows = NonNullable<DisasterStatsResponse['ncrb_hazard_breakdown']>;
export type LossSeries = NonNullable<DisasterStatsResponse['loss_time_series']>;

export interface HazardShare {
  id: string;
  label: string;
  count: number;
  /** Share of the NCRB total, rounded to one decimal. */
  pct: number;
  color: string;
  icon: string;
}

export interface HazardBreakdown {
  items: HazardShare[];
  total: number;
  fromYear: number;
  toYear: number;
}

/**
 * NCRB deaths by hazard group, summed over the loaded years. Returns null when there are no
 * NCRB rows or no deaths, so the caller shows an empty state rather than a default split.
 */
export function hazardBreakdownFromNcrb(rows: NcrbRows | null | undefined): HazardBreakdown | null {
  if (!rows || rows.length === 0) return null;

  const sums = rows.reduce(
    (acc, r) => ({
      flood: acc.flood + r.flood_deaths + r.flash_flood_deaths + r.cloudburst_deaths,
      landslide: acc.landslide + r.landslide_deaths,
      cyclone: acc.cyclone + r.cyclone_deaths,
      lightning: acc.lightning + r.lightning_deaths,
      other: acc.other + r.cold_heat_wave_deaths + r.other_nature_deaths + r.avalanche_deaths,
      total: acc.total + r.total_deaths,
    }),
    { flood: 0, landslide: 0, cyclone: 0, lightning: 0, other: 0, total: 0 },
  );
  if (sums.total <= 0) return null;

  const share = (count: number): number => Math.round((count / sums.total) * 1000) / 10;
  const items: HazardShare[] = [
    { id: 'flood', label: 'Floods, flash floods & cloudbursts', count: sums.flood, pct: share(sums.flood), color: '#38bdf8', icon: 'water_damage' },
    { id: 'landslide', label: 'Landslides', count: sums.landslide, pct: share(sums.landslide), color: '#f43f5e', icon: 'landslide' },
    { id: 'cyclone', label: 'Cyclones', count: sums.cyclone, pct: share(sums.cyclone), color: '#10b981', icon: 'cyclone' },
    { id: 'lightning', label: 'Lightning', count: sums.lightning, pct: share(sums.lightning), color: '#f59e0b', icon: 'thunderstorm' },
    { id: 'other', label: 'Other (heat/cold waves, avalanches, other)', count: sums.other, pct: share(sums.other), color: '#94a3b8', icon: 'terrain' },
  ].sort((a, b) => b.count - a.count);

  const years = rows.map((r) => r.calendar_year);
  return { items, total: sums.total, fromYear: Math.min(...years), toYear: Math.max(...years) };
}

export interface YearTrendPoint {
  /** Stable key, the MHA year label (for example "2019-20"). */
  key: string;
  /** Short axis label. */
  axis: string;
  deaths: number;
}

/** MHA lives lost per reporting year, oldest first. Empty when the API returned no series. */
export function yearlyTrendFromLosses(series: LossSeries | null | undefined): YearTrendPoint[] {
  if (!series) return [];
  return [...series]
    .sort((a, b) => a.year_start - b.year_start)
    .map((r) => ({ key: r.year_label, axis: `'${String(r.year_start).slice(2)}`, deaths: r.lives_lost }));
}
