'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { cellToLatLng } from 'h3-js';
import gsap from 'gsap';
import { useTheme } from '@/components/providers';
import type { HazardCell } from '@/lib/api/types';
import {
  latLngTo3D,
  REGIONAL_CAMERA_PRESETS,
  CameraRegionPreset,
} from '@/lib/geo/indiaBoundary';
import {
  createIndiaLandmass,
  IndiaLandmassController,
} from './IndiaLandmassMesh';
import {
  createHexRiskColumns,
  HexRiskColumnsController,
} from './HexRiskColumns';
import {
  createHexTargetBeacon,
  HexTargetBeaconController,
} from './HexTargetBeacon';
import { Hex3DTooltip } from './Hex3DTooltip';
import { Map3DControlBar } from './Map3DControlBar';

export interface India3DCanvasProps {
  cells: HazardCell[];
  przThreshold?: number;
  selectedH3?: string | null;
  hoveredH3?: string | null;
  onSelectCell?: (h3: string | null) => void;
  onHoverCell?: (h3: string | null) => void;
  isLoading?: boolean;
  errorMessage?: string | null;
  className?: string;
}

export const India3DCanvas: React.FC<India3DCanvasProps> = ({
  cells,
  przThreshold = 0.85,
  selectedH3 = null,
  hoveredH3 = null,
  onSelectCell,
  onHoverCell,
  isLoading = false,
  className = '',
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Scene and controller references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);

  const landmassRef = useRef<IndiaLandmassController | null>(null);
  const hexColumnsRef = useRef<HexRiskColumnsController | null>(null);
  const beaconRef = useRef<HexTargetBeaconController | null>(null);

  // Floating HUD Tooltip State
  const [tooltipData, setTooltipData] = useState<{
    cell: HazardCell | null;
    pos: { x: number; y: number } | null;
  }>({ cell: null, pos: null });

  // Control bar state
  const [activePreset, setActivePreset] = useState<string>('national');
  const [isTopDown, setIsTopDown] = useState(false);

  // Selected cell world coordinate for the beacon
  const selectedBeaconPos = useMemo(() => {
    if (!selectedH3) return null;
    try {
      const [lat, lng] = cellToLatLng(selectedH3);
      const { x, y } = latLngTo3D(lng, lat);
      return { x, y, z: 2.6 };
    } catch {
      return null;
    }
  }, [selectedH3]);

  // Setup Three.js Scene
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    const bgColor = isDark ? 0x0b1614 : 0xf4f8f5;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, 0.006);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(38, width / height, 1, 1000);
    const initialPreset = REGIONAL_CAMERA_PRESETS.national;
    camera.position.set(
      initialPreset.cameraPos.x,
      initialPreset.cameraPos.y,
      initialPreset.cameraPos.z,
    );
    camera.up.set(0, 0, 1);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.minDistance = 15;
    controls.maxDistance = 150;
    controls.target.set(
      initialPreset.target.x,
      initialPreset.target.y,
      initialPreset.target.z,
    );
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xfdfbf7, isDark ? 1.0 : 1.6);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const dirLight = new THREE.DirectionalLight(0xfffaed, isDark ? 1.5 : 1.8);
    dirLight.position.set(35, -45, 55);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x86efac, isDark ? 0.6 : 0.4);
    rimLight.position.set(-30, 45, 25);
    scene.add(rimLight);

    // Subtle Cartographic Grid Floor
    const gridColor = isDark ? 0x163026 : 0xd8e4dc;
    const gridHelper = new THREE.GridHelper(160, 32, gridColor, gridColor);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.z = -1.5;
    scene.add(gridHelper);

    // 1. Initialize India Landmass
    const landmass = createIndiaLandmass(isDark);
    scene.add(landmass.group);
    landmassRef.current = landmass;

    // 2. Initialize Hex Risk Columns
    const hexColumns = createHexRiskColumns();
    scene.add(hexColumns.group);
    hexColumnsRef.current = hexColumns;

    // 3. Initialize Target Beacon
    const beacon = createHexTargetBeacon(isDark);
    scene.add(beacon.group);
    beaconRef.current = beacon;

    // Animation Render Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      landmass.dispose();
      hexColumns.dispose();
      beacon.dispose();
      renderer.dispose();
    };
  }, []);

  // Update cells when stream data or props change
  useEffect(() => {
    if (!hexColumnsRef.current) return;
    hexColumnsRef.current.updateCells(
      cells,
      przThreshold,
      isDark,
      selectedH3,
      hoveredH3,
    );
  }, [cells, przThreshold, isDark, selectedH3, hoveredH3]);

  // Update target beacon position
  useEffect(() => {
    if (!beaconRef.current) return;
    beaconRef.current.setPosition(selectedBeaconPos);
  }, [selectedBeaconPos]);

  // Theme synchronization
  useEffect(() => {
    if (!sceneRef.current || !ambientLightRef.current) return;
    const bgColor = isDark ? 0x0b1614 : 0xf4f8f5;
    sceneRef.current.background = new THREE.Color(bgColor);
    if (sceneRef.current.fog) sceneRef.current.fog.color.setHex(bgColor);
    ambientLightRef.current.intensity = isDark ? 1.0 : 1.6;

    landmassRef.current?.updateTheme(isDark);
    beaconRef.current?.updateTheme(isDark);
  }, [isDark]);

  // Smooth Camera Flight Navigation (GSAP)
  const flyTo = useCallback(
    (target: { x: number; y: number; z: number }, cameraPos: { x: number; y: number; z: number }) => {
      if (!cameraRef.current || !controlsRef.current) return;
      const camera = cameraRef.current;
      const controls = controlsRef.current;

      gsap.to(camera.position, {
        x: cameraPos.x,
        y: cameraPos.y,
        z: cameraPos.z,
        duration: 1.2,
        ease: 'power3.inOut',
      });

      gsap.to(controls.target, {
        x: target.x,
        y: target.y,
        z: target.z,
        duration: 1.2,
        ease: 'power3.inOut',
        onUpdate: () => controls.update(),
      });
    },
    [],
  );

  // Regional Focus Presets
  const handleSelectPreset = useCallback(
    (preset: CameraRegionPreset) => {
      setActivePreset(preset.id);
      flyTo(preset.target, preset.cameraPos);
    },
    [flyTo],
  );

  // Auto-focus Camera when selectedH3 changes from triage list
  useEffect(() => {
    if (!selectedBeaconPos) return;
    flyTo(
      { x: selectedBeaconPos.x, y: selectedBeaconPos.y, z: 2.0 },
      { x: selectedBeaconPos.x, y: selectedBeaconPos.y - 18, z: 24 },
    );
  }, [selectedBeaconPos, flyTo]);

  // View Angle Toggle (2D Plan vs 3D Oblique)
  const handleToggleTopDown = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    const next = !isTopDown;
    setIsTopDown(next);

    const target = controlsRef.current.target;
    if (next) {
      flyTo({ x: target.x, y: target.y, z: target.z }, { x: target.x, y: target.y + 0.001, z: 70 });
    } else {
      const preset = REGIONAL_CAMERA_PRESETS[activePreset] ?? REGIONAL_CAMERA_PRESETS.national;
      flyTo(preset.target, preset.cameraPos);
    }
  }, [isTopDown, activePreset, flyTo]);

  // Pointer Click & Hover Raycasting
  const handlePointerMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!canvasRef.current || !cameraRef.current || !sceneRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      const hexGroup = sceneRef.current.getObjectByName('hex-risk-columns-group');
      if (!hexGroup) return;

      const intersects = raycaster.intersectObjects(hexGroup.children, false);
      if (intersects.length > 0 && intersects[0].object.userData.hazardCell) {
        const hitCell = intersects[0].object.userData.hazardCell as HazardCell;
        setTooltipData({
          cell: hitCell,
          pos: { x: e.clientX, y: e.clientY },
        });
        onHoverCell?.(hitCell.h3);
      } else {
        setTooltipData({ cell: null, pos: null });
        onHoverCell?.(null);
      }
    },
    [onHoverCell],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!canvasRef.current || !cameraRef.current || !sceneRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      const hexGroup = sceneRef.current.getObjectByName('hex-risk-columns-group');
      if (!hexGroup) return;

      const intersects = raycaster.intersectObjects(hexGroup.children, false);
      if (intersects.length > 0 && intersects[0].object.userData.hazardCell) {
        const hitCell = intersects[0].object.userData.hazardCell as HazardCell;
        onSelectCell?.(hitCell.h3);
      }
    },
    [onSelectCell],
  );

  return (
    <div
      ref={containerRef}
      onMouseMove={handlePointerMove}
      onClick={handleClick}
      className={`relative w-full h-full overflow-hidden select-none cursor-grab active:cursor-grabbing ${className}`}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Floating 3D Control Bar (Top) */}
      <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none">
        <Map3DControlBar
          activePresetId={activePreset}
          onSelectPreset={handleSelectPreset}
          isTopDown={isTopDown}
          onToggleTopDown={handleToggleTopDown}
          onResetCamera={() => handleSelectPreset(REGIONAL_CAMERA_PRESETS.national)}
          isLoading={isLoading}
          cellCount={cells.length}
        />
      </div>

      {/* Floating HUD Tooltip */}
      <Hex3DTooltip
        cell={tooltipData.cell}
        position={tooltipData.pos}
        przThreshold={przThreshold}
        isDark={isDark}
      />
    </div>
  );
};
