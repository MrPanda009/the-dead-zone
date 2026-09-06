'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap, M3_EASE, type M3AnimationConfig } from '@/lib/motion/m3';
import { INTRO_TIMINGS } from '@/lib/motion/introSequence';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import { useTheme } from '@/components/providers';
import { HotspotData, DEAD_ZONES_DATA } from './types';
import { generateProceduralEarthCanvas } from './procedural-textures';

export interface CameraTarget {
  y: number;
  dist: number;
  duration?: number;
}

export interface GlobeCanvasProps {
  /** Mode: 'landing' starts framed for hero presentation; 'login' spins and glides globe off-screen */
  viewMode?: 'landing' | 'login';
  /** Whether earth is auto-rotating */
  isAutoRotating?: boolean;
  /** Whether cyber radar sweep is active */
  isRadarActive?: boolean;
  /** Active camera animation target */
  cameraTarget?: CameraTarget | null;
  /** List of hotspots to display */
  hotspots?: HotspotData[];
  /** Primary focus hotspot ID (default 'himalayan-arc' for India) */
  primaryFocusId?: string;
  /** Target trigger counter to re-center on primary hazard */
  focusTrigger?: number;
  /** Callback when hotspot is hovered */
  onHoverHotspot?: (payload: { spot: HotspotData; position: { x: number; y: number } } | null) => void;
  /** Custom root className */
  className?: string;
  /** Entrance animation overrides for the canvas container */
  animation?: M3AnimationConfig;
  /** Normalized scroll progress across the landing narrative track (0.0 to 1.0) */
  scrollProgress?: number;
}

export const GlobeCanvas: React.FC<GlobeCanvasProps> = ({
  viewMode = 'landing',
  isAutoRotating = true,
  isRadarActive = true,
  cameraTarget = null,
  hotspots = DEAD_ZONES_DATA,
  primaryFocusId = 'himalayan-arc',
  focusTrigger = 0,
  onHoverHotspot,
  className = '',
  animation = {},
  scrollProgress = 0,
}) => {
  const primarySpot = hotspots.find((s) => s.id === primaryFocusId) || hotspots[0];
  const defaultLat = primarySpot ? primarySpot.lat : 28.5;
  const defaultLon = primarySpot ? primarySpot.lon : 78.5;
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const containerRef = useRef<HTMLDivElement>(null);
  const onHoverHotspotRef = useRef(onHoverHotspot);
  const prefersReducedMotion = usePrefersReducedMotion();
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const scrollProgressRef = useRef(scrollProgress);

  useEffect(() => {
    onHoverHotspotRef.current = onHoverHotspot;
  }, [onHoverHotspot]);

  useEffect(() => {
    scrollProgressRef.current = scrollProgress;
  }, [scrollProgress]);

  const sceneRef = useRef<{
    earthGroup: THREE.Group;
    earthMesh: THREE.Mesh;
    camera: THREE.PerspectiveCamera;
    radarMesh: THREE.Mesh;
    orbitRing: THREE.Mesh;
    hotspotGroup: THREE.Group;
    primaryBeaconGroup: THREE.Group;
    isAutoRotating: boolean;
    isRadarActive: boolean;
  } | null>(null);

  // Dynamically update globe lighting when theme changes
  useEffect(() => {
    if (ambientLightRef.current) {
      ambientLightRef.current.color.setHex(isLight ? 0xc4d4c5 : 0x0e1b14);
      ambientLightRef.current.intensity = isLight ? 2.5 : 1.3;
    }
    if (sunLightRef.current) {
      sunLightRef.current.intensity = isLight ? 2.2 : 1.9;
    }
  }, [isLight]);

  // Sync animation flags
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.isAutoRotating = isAutoRotating;
      sceneRef.current.isRadarActive = isRadarActive;
      if (sceneRef.current.radarMesh) {
        sceneRef.current.radarMesh.visible = isRadarActive;
      }
    }
  }, [isAutoRotating, isRadarActive]);

  // Focus Trigger: Smoothly rotate Earth to center on India Hazard Red Zone
  useEffect(() => {
    if (!sceneRef.current || focusTrigger === 0) return;
    const { earthMesh, hotspotGroup, primaryBeaconGroup, camera } = sceneRef.current;

    const targetY = -2.93;
    gsap.to([earthMesh.rotation, hotspotGroup.rotation, primaryBeaconGroup.rotation], {
      y: targetY,
      duration: 1.6,
      ease: 'power3.inOut',
      overwrite: 'auto',
    });
    gsap.to(camera.position, {
      z: 4.8,
      duration: 1.4,
      ease: 'power2.out',
    });
  }, [focusTrigger]);

  // Camera Target transitions
  useEffect(() => {
    if (!sceneRef.current || !cameraTarget) return;
    const { earthMesh, hotspotGroup, primaryBeaconGroup, camera } = sceneRef.current;
    const duration = cameraTarget.duration || 1.4;

    gsap.to([earthMesh.rotation, hotspotGroup.rotation, primaryBeaconGroup.rotation], {
      y: cameraTarget.y,
      duration,
      ease: 'power2.inOut',
      overwrite: 'auto',
    });
    gsap.to(camera.position, {
      z: cameraTarget.dist,
      duration,
      ease: 'power2.inOut',
      overwrite: 'auto',
    });
  }, [cameraTarget]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // The container is `fixed inset-0`, i.e. always viewport-sized. Measure the
    // viewport directly rather than the container: a transformed ancestor (such
    // as the GSAP page-entrance tween on `.route-stage`) traps `position: fixed`
    // and makes `container.clientHeight` report the full scroll height, which
    // blows the globe up to several times its intended size.
    let width = window.innerWidth;
    let height = window.innerHeight;

    // 1. Scene & Standard Perspective Camera (normal distance z = 4.8, normal size)
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(0, 0, 4.8);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    if ('toneMapping' in renderer) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
    }
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. Directional & Atmospheric Lighting
    const sunLight = new THREE.DirectionalLight(0xfff8ee, isLight ? 2.2 : 1.9);
    sunLight.position.set(6, 4, 4.5);
    sunLightRef.current = sunLight;
    scene.add(sunLight);

    const atmosphereLight = new THREE.DirectionalLight(0x5eead4, 0.6);
    atmosphereLight.position.set(-5, -2, -4);
    scene.add(atmosphereLight);

    const ambientLight = new THREE.AmbientLight(isLight ? 0xc4d4c5 : 0x0e1b14, isLight ? 2.5 : 1.3);
    ambientLightRef.current = ambientLight;
    scene.add(ambientLight);

    // 4. Starfield Dust Particles
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1800;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      const r = 260 + Math.random() * 450;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i + 2] = r * Math.cos(phi);

      const tint = Math.random();
      starColors[i] = tint > 0.7 ? 0.75 : 0.95;
      starColors[i + 1] = tint > 0.7 ? 0.95 : 0.95;
      starColors[i + 2] = tint > 0.7 ? 0.7 : 0.9;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 5. Earth Group:
    // Moves across the screen in 3D in the empty space next to text!
    // Rotation is centered on its own local origin (0, 0, 0).
    const isDesktop = width > 1024;
    const initialLandingX = isDesktop ? 1.15 : 0;
    const earthGroup = new THREE.Group();
    earthGroup.rotation.z = 23.4 * (Math.PI / 180);
    earthGroup.position.set(viewMode === 'landing' ? initialLandingX : 3.3, 0, 0);
    scene.add(earthGroup);

    // 6. Earth Mesh (Normal size: radius 2.0)
    const proceduralCanvas = generateProceduralEarthCanvas();
    const proceduralTexture = new THREE.CanvasTexture(proceduralCanvas);
    proceduralTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const earthGeo = new THREE.SphereGeometry(2.0, 128, 128);
    const earthMat = new THREE.MeshPhongMaterial({
      map: proceduralTexture,
      shininess: 28,
      specular: new THREE.Color(0x1a3325),
      bumpScale: 0.05,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.rotation.y = -2.93; // India front and center
    earthGroup.add(earthMesh);

    // Background NASA texture loader
    const textureLoader = new THREE.TextureLoader();
    const cdnBase = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/planets/';
    textureLoader.load(
      cdnBase + 'earth_atmos_2048.jpg',
      (tex) => {
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        earthMat.map = tex;
        earthMat.needsUpdate = true;
      },
      undefined,
      () => {}
    );

    // 7. Atmosphere Rim Glow Shader
    const atmosphereGeo = new THREE.SphereGeometry(2.05, 64, 64);
    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);
          gl_FragColor = vec4(0.35, 0.95, 0.55, 1.0) * intensity * 0.45;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    earthGroup.add(atmosphereMesh);

    // 8. Glowing Lime Elliptical Orbital Trajectory Ring
    const orbitCurve = new THREE.EllipseCurve(0, 0, 2.8, 2.65, 0, 2 * Math.PI, false, 0);
    const curvePoints = orbitCurve.getPoints(128);
    const points3D = curvePoints.map((p) => new THREE.Vector3(p.x, 0, p.y));
    const path3D = new THREE.CatmullRomCurve3(points3D, true);
    const orbitTubeGeo = new THREE.TubeGeometry(path3D, 128, 0.009, 8, true);
    const orbitTubeMat = new THREE.MeshBasicMaterial({
      color: 0xd2f83f,
      transparent: true,
      opacity: 0.65,
    });
    const orbitRing = new THREE.Mesh(orbitTubeGeo, orbitTubeMat);
    orbitRing.rotation.x = Math.PI / 3.4;
    orbitRing.rotation.z = -Math.PI / 6.5;
    earthGroup.add(orbitRing);

    // 9. Secondary Cyber Orbital Radar Sweep Ring
    const radarGeo = new THREE.RingGeometry(2.28, 2.32, 64);
    const radarMat = new THREE.MeshBasicMaterial({
      color: 0xd2f83f,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.22,
    });
    const radarMesh = new THREE.Mesh(radarGeo, radarMat);
    radarMesh.rotation.x = Math.PI / 2.3;
    earthGroup.add(radarMesh);

    // Coordinate conversion utility
    const latLonToVector3 = (lat: number, lon: number, radius = 2.03) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      return new THREE.Vector3(
        -(radius * Math.sin(phi) * Math.cos(theta)),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
    };

    // 10. Concentric Disaster Hazard Beacon on India
    const primaryBeaconGroup = new THREE.Group();
    primaryBeaconGroup.rotation.y = -2.93;
    earthGroup.add(primaryBeaconGroup);

    const indiaPos = latLonToVector3(defaultLat, defaultLon, 2.035);

    const coreGeo = new THREE.SphereGeometry(0.048, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xff1e38 });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.copy(indiaPos);
    primaryBeaconGroup.add(coreMesh);

    const rippleRings: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>[] = [];
    for (let r = 0; r < 3; r++) {
      const ringGeo = new THREE.RingGeometry(0.04, 0.12, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xff2840,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(indiaPos);
      ringMesh.lookAt(new THREE.Vector3(0, 0, 0));
      ringMesh.userData = {
        isRipple: true,
        phase: (r * Math.PI) / 1.5,
        speed: 2.2,
      };
      primaryBeaconGroup.add(ringMesh);
      rippleRings.push(ringMesh);
    }

    // 11. Hotspot Pins for disaster zones
    const hotspotGroup = new THREE.Group();
    hotspotGroup.rotation.y = -2.93;
    earthGroup.add(hotspotGroup);

    hotspots.forEach((spot) => {
      const pos = latLonToVector3(spot.lat, spot.lon);
      const isRed = spot.color > 0xff2000;

      const pinGeo = new THREE.SphereGeometry(isRed ? 0.042 : 0.035, 16, 16);
      const pinMat = new THREE.MeshBasicMaterial({ color: spot.color });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.position.copy(pos);
      pinMesh.userData = spot;

      const auraGeo = new THREE.SphereGeometry(0.08, 16, 16);
      const auraMat = new THREE.MeshBasicMaterial({
        color: spot.color,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
      });
      const auraMesh = new THREE.Mesh(auraGeo, auraMat);
      auraMesh.position.copy(pos);

      hotspotGroup.add(pinMesh);
      hotspotGroup.add(auraMesh);
    });

    // 12. Direct Sphere Drag Rotation:
    // User requested: "make the globe interactable like it was before"
    // Provides full tactile drag-to-spin with momentum physics around the sphere's own center!
    let isPointerDown = false;
    let prevPointer = { x: 0, y: 0 };
    let dragVelocity = { x: 0, y: 0 };

    const domEl = renderer.domElement;

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      isPointerDown = true;
      prevPointer = { x: e.clientX, y: e.clientY };
      dragVelocity = { x: 0, y: 0 };
      domEl.style.cursor = 'grabbing';
      try {
        domEl.setPointerCapture(e.pointerId);
      } catch {}
    };

    const handlePointerMoveDrag = (e: PointerEvent) => {
      if (!isPointerDown) return;
      const dx = e.clientX - prevPointer.x;
      const dy = e.clientY - prevPointer.y;
      prevPointer = { x: e.clientX, y: e.clientY };

      const rotSpeed = 0.005;
      dragVelocity = { x: dx * rotSpeed, y: dy * rotSpeed };

      earthMesh.rotation.y += dragVelocity.x;
      hotspotGroup.rotation.y += dragVelocity.x;
      primaryBeaconGroup.rotation.y += dragVelocity.x;

      earthGroup.rotation.x = Math.max(-0.45, Math.min(0.45, earthGroup.rotation.x + dragVelocity.y));
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (isPointerDown) {
        isPointerDown = false;
        domEl.style.cursor = 'grab';
        try {
          domEl.releasePointerCapture(e.pointerId);
        } catch {}
      }
    };

    domEl.addEventListener('pointerdown', handlePointerDown);
    domEl.addEventListener('pointermove', handlePointerMoveDrag);
    domEl.addEventListener('pointerup', handlePointerUp);
    domEl.addEventListener('pointercancel', handlePointerUp);

    // 13. Raycasting for hover tooltips
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(hotspotGroup.children);

      if (intersects.length > 0 && intersects[0].object.userData.name) {
        const spot = intersects[0].object.userData as HotspotData;
        if (onHoverHotspotRef.current) {
          onHoverHotspotRef.current({
            spot,
            position: { x: e.clientX, y: e.clientY },
          });
        }
      } else {
        if (onHoverHotspotRef.current) {
          onHoverHotspotRef.current(null);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Responsive Resize Handler
    const handleResize = () => {
      if (!container) return;
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    sceneRef.current = {
      earthGroup,
      earthMesh,
      camera,
      radarMesh,
      orbitRing,
      hotspotGroup,
      primaryBeaconGroup,
      isAutoRotating,
      isRadarActive,
    };

    // Calculate Target 3D Position for Zig-Zag Narrative Motion
    // The globe moves into the empty space next to the text on every scroll:
    // Hero: text LEFT -> globe RIGHT (ampX)
    // Section 1: text RIGHT -> globe LEFT (-ampX)
    // Section 2: text LEFT -> globe RIGHT (ampX)
    // Section 3: text RIGHT -> globe LEFT (-ampX)
    // Horizon / Footer: globe BOTTOM CENTER (x = 0, y = bottomY)
    const getTargetPosition = (progress: number, w: number) => {
      if (viewMode === 'login') {
        const desktop = w > 1024;
        return {
          x: desktop ? 3.3 : 1.7,
          y: 0,
        };
      }

      const desktop = w > 1024;
      const ampX = desktop ? 1.2 : w > 640 ? 0.8 : 0.4;
      const bottomY = -1.75;

      const p = Math.max(0, Math.min(1, progress));
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
      const smoothstep = (t: number) => 0.5 - 0.5 * Math.cos(t * Math.PI);

      if (p <= 0.25) {
        // Hero (0.0: Right) -> Section 1 (0.25: Left)
        const t = smoothstep(p / 0.25);
        return {
          x: lerp(ampX, -ampX, t),
          y: 0,
        };
      } else if (p <= 0.50) {
        // Section 1 (0.25: Left) -> Section 2 (0.50: Right)
        const t = smoothstep((p - 0.25) / 0.25);
        return {
          x: lerp(-ampX, ampX, t),
          y: 0,
        };
      } else if (p <= 0.75) {
        // Section 2 (0.50: Right) -> Section 3 (0.75: Left)
        const t = smoothstep((p - 0.50) / 0.25);
        return {
          x: lerp(ampX, -ampX, t),
          y: 0,
        };
      } else {
        // Section 3 (0.75: Left) -> Section 4 (1.00: Center & Bottom 50%)
        const t = smoothstep((p - 0.75) / 0.25);
        return {
          x: lerp(-ampX, 0, t),
          y: lerp(0, bottomY, t),
        };
      }
    };

    let currentX = getTargetPosition(scrollProgressRef.current, width).x;
    let currentY = getTargetPosition(scrollProgressRef.current, width).y;

    // 14. Animation Render Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = performance.now() * 0.001;

      // Continuous Auto-Rotation:
      // Always rotates around the center of the sphere non-stop!
      if (sceneRef.current?.isAutoRotating) {
        earthMesh.rotation.y += 0.0012;
        hotspotGroup.rotation.y += 0.0012;
        primaryBeaconGroup.rotation.y += 0.0012;
      }

      // Drag inertia momentum decay (matching OrbitControls feel)
      if (!isPointerDown) {
        dragVelocity.x *= 0.95;
        dragVelocity.y *= 0.95;
        if (Math.abs(dragVelocity.x) > 0.00005) {
          earthMesh.rotation.y += dragVelocity.x;
          hotspotGroup.rotation.y += dragVelocity.x;
          primaryBeaconGroup.rotation.y += dragVelocity.x;
        }
        if (Math.abs(dragVelocity.y) > 0.00005) {
          earthGroup.rotation.x = Math.max(
            -0.45,
            Math.min(0.45, earthGroup.rotation.x + dragVelocity.y)
          );
        }
      }

      // Orbital lime ring gentle wobble
      if (orbitRing) {
        orbitRing.rotation.y += 0.0004;
      }

      // Cyber Radar Sweep
      if (radarMesh && sceneRef.current?.isRadarActive) {
        radarMesh.rotation.z += 0.008;
        radarMesh.material.opacity = 0.18 + Math.sin(elapsed * 2) * 0.1;
      }

      // Concentric Radar Ripple Waves Animation
      rippleRings.forEach((ring) => {
        const phase = ring.userData.phase || 0;
        const speed = ring.userData.speed || 2.2;
        const progress = ((elapsed * speed + phase) % Math.PI) / Math.PI;
        const scale = 1.0 + progress * 2.8;
        ring.scale.set(scale, scale, 1);
        ring.material.opacity = Math.max(0, (1 - progress) * 0.75);
      });

      // Smoothly move globe in zig-zag 3D path based on scroll progress
      const target = getTargetPosition(scrollProgressRef.current, width);
      currentX += (target.x - currentX) * 0.1;
      currentY += (target.y - currentY) * 0.1;
      earthGroup.position.set(currentX, currentY, 0);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      domEl.removeEventListener('pointerdown', handlePointerDown);
      domEl.removeEventListener('pointermove', handlePointerMoveDrag);
      domEl.removeEventListener('pointerup', handlePointerUp);
      domEl.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [hotspots, viewMode]);

  const {
    disabled: animationDisabled = false,
    duration: introDuration = 0.9,
    delay: introDelay = INTRO_TIMINGS.globe,
  } = animation;

  // Fade the WebGL stage in with the rest of the intro
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (animationDisabled || prefersReducedMotion) {
      gsap.set(el, { opacity: 1, scale: 1 });
      return;
    }
    const tween = gsap.fromTo(
      el,
      { opacity: 0, scale: 1.04 },
      {
        opacity: 1,
        scale: 1,
        duration: introDuration,
        delay: introDelay,
        ease: M3_EASE.decelerate,
      }
    );
    return () => {
      tween.kill();
      gsap.set(el, { opacity: 1, scale: 1 });
    };
  }, [animationDisabled, prefersReducedMotion, introDuration, introDelay]);

  return (
    <div
      ref={containerRef}
      id="globe-container"
      className={`fixed inset-0 z-0 pointer-events-auto cursor-grab active:cursor-grabbing select-none ${className}`}
    />
  );
};
