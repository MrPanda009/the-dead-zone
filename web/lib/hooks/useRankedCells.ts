import { useMemo } from 'react';

import type { HazardCell, HazardRegime } from '@/lib/api/types';
import { isScoredCell } from '@/lib/map/colorScale';

/** Regimes that carry a terrestrial score and can therefore be ranked. Channel cells never rank. */
export const RANKABLE_REGIMES: readonly HazardRegime[] = ['floodplain', 'char_belt'];

export type RegimeFilter = HazardRegime | 'all';

export interface RankedRow {
  cell: HazardCell;
  /** 1-based; restarts in each group when grouped. */
  rank: number;
}

export interface RankedGroup {
  /** `null` for cells with no regime (builds without a JRC layer). */
  regime: HazardRegime | null;
  rows: RankedRow[];
}

export interface UseRankedCellsOptions {
  cells: HazardCell[];
  regime: RegimeFilter;
  /** Splits the ranking into one section per regime, each ranked on its own. */
  groupByRegime: boolean;
  limit: number;
}

export interface RankedCells {
  /** Ranked cells after the regime filter (flat, or concatenated groups). */
  ranked: HazardCell[];
  groups: RankedGroup[];
  /** Scored cell count per regime, before any filter. */
  counts: Record<HazardRegime, number>;
  /** True when scores from more than one regime sit in the same ranking. */
  isMixed: boolean;
}

const bySusceptibility = (a: HazardCell, b: HazardCell) => b.susceptibility - a.susceptibility;

/** Ranks scored cells by susceptibility, filtered and optionally grouped by hazard regime. */
export function useRankedCells({ cells, regime, groupByRegime, limit }: UseRankedCellsOptions): RankedCells {
  return useMemo(() => {
    const scored = cells.filter(isScoredCell);

    const counts: Record<HazardRegime, number> = { floodplain: 0, char_belt: 0, channel: 0 };
    for (const cell of scored) {
      if (cell.hazard_regime) counts[cell.hazard_regime] += 1;
    }

    const kept = regime === 'all' ? scored : scored.filter((cell) => cell.hazard_regime === regime);
    const isMixed = regime === 'all' && counts.floodplain > 0 && counts.char_belt > 0;

    const toRows = (list: HazardCell[]): RankedRow[] =>
      [...list]
        .sort(bySusceptibility)
        .slice(0, limit)
        .map((cell, index) => ({ cell, rank: index + 1 }));

    const groups: RankedGroup[] = groupByRegime
      ? [...RANKABLE_REGIMES, null]
          .map((key) => ({
            regime: key,
            rows: toRows(kept.filter((cell) => (cell.hazard_regime ?? null) === key)),
          }))
          .filter((group) => group.rows.length > 0)
      : [{ regime: null, rows: toRows(kept) }];

    return {
      ranked: groups.flatMap((group) => group.rows.map((row) => row.cell)),
      groups,
      counts,
      // Grouped sections are each ranked on one formula, so they are comparable internally.
      isMixed: isMixed && !groupByRegime,
    };
  }, [cells, regime, groupByRegime, limit]);
}
