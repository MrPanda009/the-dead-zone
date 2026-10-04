/**
 * Outline of a regime's corridor on the H3 grid.
 *
 * A cell edge is on the boundary when the cell on the other side is not in the regime, so
 * interior edges between two member cells never get drawn and the result traces the
 * corridor as one dashed outline instead of a dashed ring around every hexagon.
 */

import { directedEdgeToBoundary, getDirectedEdgeDestination, originToDirectedEdges } from 'h3-js';

import type { HazardCell, HazardRegime } from '@/lib/api/types';

/** One boundary edge as `[lng, lat]` pairs. */
export type BoundaryPath = [number, number][];

export function regimeBoundaryPaths(cells: readonly HazardCell[], regime: HazardRegime): BoundaryPath[] {
  const members = new Set<string>();
  for (const cell of cells) {
    if (cell.hazard_regime === regime) members.add(cell.h3);
  }

  const paths: BoundaryPath[] = [];
  for (const h3 of members) {
    for (const edge of originToDirectedEdges(h3)) {
      if (members.has(getDirectedEdgeDestination(edge))) continue;
      // `true` returns [lng, lat], the order deck.gl paths expect.
      paths.push(directedEdgeToBoundary(edge, true) as BoundaryPath);
    }
  }
  return paths;
}
