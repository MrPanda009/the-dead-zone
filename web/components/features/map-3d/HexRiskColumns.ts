import * as THREE from 'three';
import { getResolution, gridDisk, latLngToCell } from 'h3-js';
import gsap from 'gsap';
import type { HazardCell } from '@/lib/api/types';
import { world3DToLatLng } from '@/lib/geo/indiaBoundary';
import { classIndexFor, isScoredCell, renderClassFor } from '@/lib/map/colorScale';
import {
  CHANNEL_COLOR,
  HARD_ZERO_COLOR,
  SUSCEPTIBILITY_RAMP,
  type RGBAColor,
} from '@/lib/map/constants';
import {
  computeHexPlacement,
  createUnitHexPrismGeometry,
  HexCellPlacement,
  HEX_BASE_Z,
  HEX_FILL_RATIO,
} from './hexGridProjection';

export interface HexRiskColumnsController {
  group: THREE.Group;
  updateCells: (
    cells: HazardCell[],
    przThreshold: number,
    isDark: boolean,
    selectedH3?: string | null,
    hoveredH3?: string | null,
    /** Ascending quantile breaks from the API legend. */
    breaks?: readonly number[],
  ) => void;
  /** Resolves a pointer ray to the hazard cell whose column is visible under it. */
  pickCell: (raycaster: THREE.Raycaster) => HazardCell | null;
  /** Mean circumradius of the loaded grid, in world units. */
  getCellRadius: () => number;
  /** World-space extent of the loaded grid, for camera framing. */
  getBounds: () => THREE.Box3 | null;
  dispose: () => void;
}

export interface HexCellVisuals {
  color: number;
  /** Column height as a multiple of the cell's own circumradius. */
  heightRatio: number;
  isPrz: boolean;
}

/** Flattest and tallest measured columns, in cell radii. */
const MIN_MEASURED_HEIGHT = 0.5;
const MAX_MEASURED_HEIGHT = 4.0;

function rgbaToHex(color: RGBAColor): number {
  return (color[0] << 16) | (color[1] << 8) | color[2];
}

/**
 * Classes a cell exactly as the 2D GIS view does — on the server-computed
 * quantile breaks rather than fixed cuts.
 *
 * Fixed thresholds collapse this data: half the Barpeta flood layer sits
 * between 0.39 and 0.48, so a hardcoded 0.45 break splits it near the median
 * and a 0.7 break sits out at the 95th percentile, leaving ~97% of the district
 * in two flat colour bands. Classing on the layer's own quantiles puts the
 * contrast where the cells actually are, and keeps 2D and 3D telling the same
 * story about the same cell.
 */
export function getHexCellVisuals(
  cell: HazardCell,
  przThreshold: number,
  isDark: boolean,
  breaks: readonly number[] = [],
  ramp: readonly RGBAColor[] = SUSCEPTIBILITY_RAMP,
): HexCellVisuals {
  const isPrz =
    isScoredCell(cell) && cell.susceptibility >= przThreshold;

  const renderClass = renderClassFor(cell);

  if (renderClass === 'no_coverage') {
    // Never observed — must not read as the safest ground in the district.
    return { color: isDark ? 0x2e3d38 : 0xb4c1b9, heightRatio: 0.25, isPrz: false };
  }

  if (renderClass === 'channel') {
    // River, not land: flat, cool-toned, never ranked.
    return { color: rgbaToHex(CHANNEL_COLOR), heightRatio: 0.15, isPrz: false };
  }

  if (renderClass === 'hard_zero') {
    // Safe by FR-3.17 construction, deliberately off-ramp.
    return { color: rgbaToHex(HARD_ZERO_COLOR), heightRatio: 0.4, isPrz: false };
  }

  // Fall back to an even split only when the legend has not arrived yet.
  const activeBreaks = breaks.length > 0 ? breaks : [0.2, 0.35, 0.5, 0.65, 0.8, 0.9];
  const classCount = activeBreaks.length + 1;
  const index = Math.min(
    classIndexFor(cell.susceptibility, activeBreaks),
    Math.min(ramp.length, classCount) - 1,
  );
  const t = classCount > 1 ? index / (classCount - 1) : 0;

  return {
    color: rgbaToHex(ramp[index]),
    heightRatio:
      MIN_MEASURED_HEIGHT + t * (MAX_MEASURED_HEIGHT - MIN_MEASURED_HEIGHT),
    isPrz,
  };
}

/** Tallest column, in cell radii — bounds the neighbourhood searched when picking. */
const MAX_HEIGHT_RATIO = MAX_MEASURED_HEIGHT;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

export function createHexRiskColumns(): HexRiskColumnsController {
  const group = new THREE.Group();
  group.name = 'hex-risk-columns-group';

  const material = new THREE.MeshStandardMaterial({
    roughness: 0.45,
    metalness: 0.15,
  });

  let geometry: THREE.BufferGeometry | null = null;
  let mesh: THREE.InstancedMesh | null = null;

  let placements: HexCellPlacement[] = [];
  let cellByH3 = new Map<string, HazardCell>();
  let indexByH3 = new Map<string, number>();
  /** Current animated height of each column, in world units. */
  let heights: number[] = [];
  /** Normalised entrance delay per column, radiating out from the grid centre. */
  let riseOrder: number[] = [];
  let resolution = 8;
  let cellRadius = 0;
  let bounds: THREE.Box3 | null = null;
  let heightTween: gsap.core.Tween | null = null;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  const writeMatrix = (i: number) => {
    if (!mesh) return;
    const p = placements[i];
    dummy.position.set(p.x, p.y, HEX_BASE_Z);
    dummy.rotation.set(0, 0, p.rotation);
    const r = p.radius * HEX_FILL_RATIO;
    dummy.scale.set(r, r, Math.max(heights[i], 1e-6));
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  };

  const disposeMesh = () => {
    heightTween?.kill();
    heightTween = null;
    if (mesh) {
      group.remove(mesh);
      mesh.dispose();
      mesh = null;
    }
    geometry?.dispose();
    geometry = null;
  };

  const rebuild = (cells: HazardCell[]) => {
    disposeMesh();

    placements = [];
    indexByH3 = new Map();
    heights = [];
    riseOrder = [];
    bounds = null;

    cells.forEach((cell) => {
      const placement = computeHexPlacement(cell.h3);
      if (!placement) return;
      indexByH3.set(cell.h3, placements.length);
      placements.push(placement);
      heights.push(0);
    });

    if (placements.length === 0) {
      cellRadius = 0;
      return;
    }

    resolution = getResolution(placements[0].h3);
    cellRadius =
      placements.reduce((s, p) => s + p.radius, 0) / placements.length;

    bounds = new THREE.Box3();
    placements.forEach((p) => {
      bounds!.expandByPoint(
        new THREE.Vector3(p.x - p.radius, p.y - p.radius, HEX_BASE_Z),
      );
      bounds!.expandByPoint(
        new THREE.Vector3(
          p.x + p.radius,
          p.y + p.radius,
          HEX_BASE_Z + p.radius * MAX_HEIGHT_RATIO,
        ),
      );
    });

    const centre = new THREE.Vector2();
    placements.forEach((p) => centre.add(new THREE.Vector2(p.x, p.y)));
    centre.divideScalar(placements.length);
    const distances = placements.map((p) => Math.hypot(p.x - centre.x, p.y - centre.y));
    const maxDistance = Math.max(...distances) || 1;
    riseOrder = distances.map((d) => d / maxDistance);

    // One shared prism derived from a real cell of this grid, instanced per cell.
    geometry = createUnitHexPrismGeometry(placements[0].h3);
    mesh = new THREE.InstancedMesh(geometry, material, placements.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // Picking is resolved analytically in `pickCell`, never by traversing instances.
    mesh.raycast = () => {};
    group.add(mesh);

    for (let i = 0; i < placements.length; i++) writeMatrix(i);
    mesh.instanceMatrix.needsUpdate = true;
  };

  const updateCells = (
    cells: HazardCell[],
    przThreshold: number,
    isDark: boolean,
    selectedH3?: string | null,
    hoveredH3?: string | null,
    breaks: readonly number[] = [],
  ) => {
    // Rebuild whenever the cell *set* changes — matching counts alone are not
    // enough, since switching hazard layer can return a different grid of the
    // same size and would otherwise re-colour cells against stale placements.
    const sameSet =
      placements.length === cells.length &&
      cells.every((c, i) => placements[i]?.h3 === c.h3);
    const isRebuild = !sameSet;
    if (isRebuild) rebuild(cells);

    cellByH3 = new Map(cells.map((c) => [c.h3, c]));
    if (!mesh || placements.length === 0) return;

    const targetHeights = new Array<number>(placements.length).fill(0);

    placements.forEach((placement, i) => {
      const cell = cellByH3.get(placement.h3);
      if (!cell) return;

      const visuals = getHexCellVisuals(cell, przThreshold, isDark, breaks);
      targetHeights[i] = visuals.heightRatio * placement.radius;

      // Per-instance emissive is not available on a standard material, so the
      // selected/hovered emphasis is baked into the instance colour instead.
      const isSelected = cell.h3 === selectedH3;
      const isHovered = cell.h3 === hoveredH3;
      if (isSelected) color.setHex(0x38bdf8);
      else if (isHovered) color.setHex(visuals.color).lerp(new THREE.Color(0xffffff), 0.35);
      else color.setHex(visuals.color);

      mesh!.setColorAt(i, color);
    });

    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    heightTween?.kill();
    if (isRebuild && !prefersReducedMotion()) {
      // A single tween drives the whole grid: per-column delay comes from
      // `riseOrder`, so the staggered rise costs one tween rather than one
      // per cell.
      const progress = { t: 0 };
      const RISE = 0.55;
      heightTween = gsap.to(progress, {
        t: 1,
        duration: 1.4,
        ease: 'none',
        onUpdate: () => {
          if (!mesh) return;
          for (let i = 0; i < targetHeights.length; i++) {
            const local = THREE.MathUtils.clamp(
              (progress.t - riseOrder[i] * (1 - RISE)) / RISE,
              0,
              1,
            );
            // power2.out
            heights[i] = targetHeights[i] * (1 - (1 - local) ** 2);
            writeMatrix(i);
          }
          mesh.instanceMatrix.needsUpdate = true;
        },
      });
    } else {
      heights = targetHeights;
      for (let i = 0; i < placements.length; i++) writeMatrix(i);
      mesh.instanceMatrix.needsUpdate = true;
    }
  };

  /**
   * Resolves the ray against 3D columns accurately by testing both the top cap
   * and vertical extruded prism sides. Depth-sorted so the closest visible
   * surface in front of the camera wins. Eliminates zooming glitches and side-clipping.
   */
  const pickCell = (raycaster: THREE.Raycaster): HazardCell | null => {
    if (!mesh || placements.length === 0 || cellRadius <= 0) return null;

    const { origin, direction } = raycaster.ray;
    const ox = origin.x;
    const oy = origin.y;
    const oz = origin.z;
    const dx = direction.x;
    const dy = direction.y;
    const dz = direction.z;

    const A = dx * dx + dy * dy;
    let bestT = Infinity;
    let bestCell: HazardCell | null = null;

    for (let i = 0; i < placements.length; i++) {
      const p = placements[i];
      const r = p.radius * HEX_FILL_RATIO;
      const rSq = r * r;
      const vx = p.x - ox;
      const vy = p.y - oy;

      // Quick 2D ray line proximity test to skip distant columns in 2 ops
      const proj = vx * dx + vy * dy;
      if (proj < -r) continue; // Behind camera
      const perpSq = vx * vx + vy * vy - (proj > 0 ? (proj * proj) / (A || 1) : 0);
      if (perpSq > rSq * 1.5) continue; // Ray passes too far from column

      const z0 = HEX_BASE_Z;
      const z1 = HEX_BASE_Z + heights[i];

      // 1. Top cap intersection
      if (Math.abs(dz) > 1e-7) {
        const tTop = (z1 - oz) / dz;
        if (tTop > 0 && tTop < bestT) {
          const hx = ox + tTop * dx - p.x;
          const hy = oy + tTop * dy - p.y;
          if (hx * hx + hy * hy <= rSq) {
            bestT = tTop;
            bestCell = cellByH3.get(p.h3) ?? null;
          }
        }
      }

      // 2. Extruded cylinder / prism side wall intersection
      if (A > 1e-7 && heights[i] > 1e-4) {
        const B = -(vx * dx + vy * dy);
        const C = vx * vx + vy * vy - rSq;
        const disc = B * B - A * C;
        if (disc >= 0) {
          const tSide = (-B - Math.sqrt(disc)) / A;
          if (tSide > 0 && tSide < bestT) {
            const zHit = oz + tSide * dz;
            if (zHit >= z0 && zHit <= z1) {
              bestT = tSide;
              bestCell = cellByH3.get(p.h3) ?? null;
            }
          }
        }
      }
    }

    return bestCell;
  };

  const dispose = () => {
    disposeMesh();
    material.dispose();
    placements = [];
    heights = [];
    indexByH3 = new Map();
    cellByH3 = new Map();
    bounds = null;
  };

  return {
    group,
    updateCells,
    pickCell,
    getCellRadius: () => cellRadius,
    getBounds: () => (bounds ? bounds.clone() : null),
    dispose,
  };
}
