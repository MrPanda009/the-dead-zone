import * as THREE from 'three';
import { cellToLatLng } from 'h3-js';
import gsap from 'gsap';
import type { HazardCell } from '@/lib/api/types';
import { latLngTo3D } from '@/lib/geo/indiaBoundary';

export interface HexRiskColumnsController {
  group: THREE.Group;
  updateCells: (
    cells: HazardCell[],
    przThreshold: number,
    isDark: boolean,
    selectedH3?: string | null,
    hoveredH3?: string | null,
  ) => void;
  dispose: () => void;
}

function createHexPrismGeometry(radius: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 * Math.PI) / 180;
    const hx = radius * Math.cos(angle);
    const hy = radius * Math.sin(angle);
    if (i === 0) shape.moveTo(hx, hy);
    else shape.lineTo(hx, hy);
  }
  return new THREE.ExtrudeGeometry(shape, {
    depth: 1.0,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.08,
    bevelSegments: 2,
  });
}

export function getHexCellVisuals(
  cell: HazardCell,
  przThreshold: number,
  isDark: boolean,
): { color: number; height: number; isPrz: boolean } {
  const isPrz =
    cell.quality_flag !== 'no_coverage' && cell.susceptibility >= przThreshold;

  let color: number;
  let height: number;

  if (cell.quality_flag === 'no_coverage') {
    color = isDark ? 0x2e3d38 : 0xb4c1b9;
    height = 0.25;
  } else if (isPrz) {
    color = 0xb9433f; // Crimson PRZ
    height = 3.6;
  } else if (cell.susceptibility >= 0.7) {
    color = 0xc96b3b; // Terracotta High
    height = 2.4;
  } else if (cell.susceptibility >= 0.45) {
    color = 0xd49a45; // Ochre Moderate
    height = 1.4;
  } else {
    color = isDark ? 0x10b981 : 0x6f8f72; // Sage / Emerald Safe
    height = 0.55;
  }

  return { color, height, isPrz };
}

export function createHexRiskColumns(): HexRiskColumnsController {
  const group = new THREE.Group();
  group.name = 'hex-risk-columns-group';

  const hexGeom = createHexPrismGeometry(0.85);
  let activeMeshes: THREE.Mesh[] = [];

  const updateCells = (
    cells: HazardCell[],
    przThreshold: number,
    isDark: boolean,
    selectedH3?: string | null,
    hoveredH3?: string | null,
  ) => {
    // Clean previous meshes if count changed
    if (activeMeshes.length !== cells.length) {
      while (group.children.length > 0) {
        const child = group.children[0] as THREE.Mesh;
        if (child.material) {
          (child.material as THREE.Material).dispose();
        }
        group.remove(child);
      }
      activeMeshes = [];

      cells.forEach((cell) => {
        let lat = 0;
        let lng = 0;
        try {
          const coords = cellToLatLng(cell.h3);
          lat = coords[0];
          lng = coords[1];
        } catch {
          // ignore invalid h3
        }

        const { x, y } = latLngTo3D(lng, lat);
        const { color, height, isPrz } = getHexCellVisuals(cell, przThreshold, isDark);

        const isSelected = cell.h3 === selectedH3;
        const isHovered = cell.h3 === hoveredH3;

        const mat = new THREE.MeshStandardMaterial({
          color: isSelected ? 0x38bdf8 : color,
          roughness: 0.4,
          metalness: 0.2,
          emissive: isSelected ? 0x38bdf8 : isPrz ? 0xb9433f : 0x000000,
          emissiveIntensity: isSelected ? 0.6 : isHovered ? 0.4 : isPrz ? 0.25 : 0,
        });

        const mesh = new THREE.Mesh(hexGeom, mat);
        mesh.position.set(x, y, 2.4);
        mesh.scale.set(1, 1, height);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { hazardCell: cell, worldX: x, worldY: y };

        group.add(mesh);
        activeMeshes.push(mesh);
      });

      // Staggered animate-in for newly streamed real data
      if (activeMeshes.length > 0) {
        gsap.fromTo(
          activeMeshes.map((m) => m.scale),
          { z: 0.01 },
          {
            z: (i) => {
              const cell = cells[i];
              return getHexCellVisuals(cell, przThreshold, isDark).height;
            },
            duration: 0.75,
            stagger: 0.015,
            ease: 'power2.out',
          },
        );
      }
    } else {
      // Same count, update existing materials and heights
      activeMeshes.forEach((mesh, i) => {
        const cell = cells[i];
        const { color, height, isPrz } = getHexCellVisuals(cell, przThreshold, isDark);
        const isSelected = cell.h3 === selectedH3;
        const isHovered = cell.h3 === hoveredH3;

        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(isSelected ? 0x38bdf8 : color);
        mat.emissive.setHex(isSelected ? 0x38bdf8 : isPrz ? 0xb9433f : 0x000000);
        mat.emissiveIntensity = isSelected ? 0.6 : isHovered ? 0.4 : isPrz ? 0.25 : 0;
        mesh.scale.z = height;
        mesh.userData.hazardCell = cell;
      });
    }
  };

  const dispose = () => {
    hexGeom.dispose();
    while (group.children.length > 0) {
      const child = group.children[0] as THREE.Mesh;
      if (child.material) {
        (child.material as THREE.Material).dispose();
      }
      group.remove(child);
    }
    activeMeshes = [];
  };

  return { group, updateCells, dispose };
}
