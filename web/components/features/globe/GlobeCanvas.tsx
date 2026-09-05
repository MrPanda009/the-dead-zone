'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import { HotspotData, DEAD_ZONES_DATA } from './types';
import { generateProceduralEarthCanvas } from './procedural-textures';

export interface CameraTarget {
  y: number;
  dist: number;
  duration?: number;
}

export interface GlobeCanvasProps {
  /** Mode: 'landing' starts centered; 'login' spins and glides globe to 50% off-screen while continuing rotation */
  viewMode?: 'landing' | 'login';
  /** Whether earth is auto-rotating */
  isAutoRotating?: boolean;
  /** Whether cyber radar sweep is active */
  isRadarActive?: boolean;
  /** Active camera animation target */
  cameraTarget?: CameraTarget | null;
  /** List of hotspots to display */
  hotspots?: HotspotData[];
  /** Callback when hotspot is hovered */
  onHoverHotspot?: (payload: { spot: HotspotData; position: { x: number; y: number } } | null) => void;
  /** Custom root className */
  className?: string;
}

export const GlobeCanvas: React.FC<GlobeCanvasProps> = ({
  viewMode = 'landing',
  isAutoRotating = true,
  isRadarActive = true,
  cameraTarget = null,
  hotspots = DEAD_ZONES_DATA,
  onHoverHotspot,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const onHoverHotspotRef = useRef(onHoverHotspot);

  useEffect(() => {
    onHoverHotspotRef.current = onHoverHotspot;
  }, [onHoverHotspot]);

  const sceneRef = useRef<{
    earthGroup: THREE.Group;
    earthMesh: THREE.Mesh;
    camera: THREE.PerspectiveCamera;
    radarMesh: THREE.Mesh;
    controls: OrbitControls;
    isAutoRotating: boolean;
    isRadarActive: boolean;
  } | null>(null);

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

  // Handle ViewMode Switch:
  // 'landing' (centered at 0, 0, 0) vs 'login' (spins & glides 50% out of screen on the right, CONTINUING rotation)
  useEffect(() => {
    if (!sceneRef.current) return;
    const { earthGroup, camera } = sceneRef.current;

    const isDesktop = typeof window !== 'undefined' && window.innerWidth > 1024;
    // Position at 3.3 puts the center of the 2.0-radius sphere at the viewport edge (50% visible)
    const sideX = isDesktop ? 3.3 : 1.7;

    if (viewMode === 'login') {
      // 1. Earth spins rapidly on Y axis and glides smoothly to 50% off-screen on the right
      gsap.to(earthGroup.rotation, {
        y: '+=3.4',
        duration: 1.5,
        ease: 'power3.inOut',
        overwrite: 'auto',
      });
      gsap.to(earthGroup.position, {
        x: sideX,
        y: 0,
        z: -0.2,
        duration: 1.4,
        ease: 'power3.inOut',
        overwrite: 'auto',
      });
      gsap.to(camera.position, {
        x: 0,
        y: 0,
        z: 4.8,
        duration: 1.4,
        ease: 'power3.inOut',
        overwrite: 'auto',
      });
    } else {
      // 2. Return to centered initial position
      gsap.to(earthGroup.position, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1.3,
        ease: 'power3.out',
        overwrite: 'auto',
      });
      gsap.to(camera.position, {
        x: 0,
        y: 0,
        z: 4.8,
        duration: 1.3,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    }
  }, [viewMode]);

  // Camera Target transitions
  useEffect(() => {
    if (!sceneRef.current || !cameraTarget) return;
    const { earthGroup, camera } = sceneRef.current;
    const duration = cameraTarget.duration || 1.4;

    gsap.to(earthGroup.rotation, {
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

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // 1. Scene & Perspective Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(0, 0, 4.8);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    if ('toneMapping' in renderer) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
    }
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. OrbitControls (Full Zoom & Interactive Rotation)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.8;
    controls.enableZoom = true;
    controls.zoomSpeed = 1.0;
    controls.minDistance = 2.2;
    controls.maxDistance = 10.0;
    controls.enablePan = false;

    // 4. Directional & Atmospheric Lighting
    const sunLight = new THREE.DirectionalLight(0xfff8ee, 1.9);
    sunLight.position.set(6, 4, 4.5);
    scene.add(sunLight);

    const atmosphereLight = new THREE.DirectionalLight(0x5eead4, 0.6);
    atmosphereLight.position.set(-5, -2, -4);
    scene.add(atmosphereLight);

    const ambientLight = new THREE.AmbientLight(0x0e1b14, 1.2);
    scene.add(ambientLight);

    // 5. Starfield Particles
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

    // 6. Earth Group: INITIALLY CENTERED (0, 0, 0)
    const earthGroup = new THREE.Group();
    earthGroup.rotation.z = 23.4 * (Math.PI / 180);
    earthGroup.rotation.y = -1.1;
    earthGroup.position.set(0, 0, 0); // CENTERED initially!
    scene.add(earthGroup);

    // 7. Earth Mesh with Procedural Cartography
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

    // 8. Sleek Atmosphere Shader
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
          gl_FragColor = vec4(0.2, 0.95, 0.65, 1.0) * intensity * 0.45;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    earthGroup.add(atmosphereMesh);

    // 9. Cyber Orbital Radar Sweep Ring
    const radarGeo = new THREE.RingGeometry(2.28, 2.32, 64);
    const radarMat = new THREE.MeshBasicMaterial({
      color: 0xd4f15d,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.28,
    });
    const radarMesh = new THREE.Mesh(radarGeo, radarMat);
    radarMesh.rotation.x = Math.PI / 2.3;
    earthGroup.add(radarMesh);

    // 10. Hazard Red & Orange Hotspots
    const hotspotGroup = new THREE.Group();
    earthGroup.add(hotspotGroup);

    const latLonToVector3 = (lat: number, lon: number, radius = 2.03) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      return new THREE.Vector3(
        -(radius * Math.sin(phi) * Math.cos(theta)),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
    };

    hotspots.forEach((spot) => {
      const pos = latLonToVector3(spot.lat, spot.lon);
      const isRed = spot.color > 0xff2000;

      const pinGeo = new THREE.SphereGeometry(isRed ? 0.045 : 0.038, 16, 16);
      const pinMat = new THREE.MeshBasicMaterial({ color: spot.color });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.position.copy(pos);
      pinMesh.userData = spot;

      const auraGeo = new THREE.SphereGeometry(0.09, 16, 16);
      const auraMat = new THREE.MeshBasicMaterial({
        color: spot.color,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
      });
      const auraMesh = new THREE.Mesh(auraGeo, auraMat);
      auraMesh.position.copy(pos);

      const ringGeo1 = new THREE.RingGeometry(0.04, 0.08, 32);
      const ringMat1 = new THREE.MeshBasicMaterial({
        color: spot.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      });
      const ringMesh1 = new THREE.Mesh(ringGeo1, ringMat1);
      ringMesh1.position.copy(pos);
      ringMesh1.lookAt(new THREE.Vector3(0, 0, 0));
      ringMesh1.userData = { isRing: true, phase: Math.random() * Math.PI, speed: 3.5 };

      hotspotGroup.add(pinMesh);
      hotspotGroup.add(auraMesh);
      hotspotGroup.add(ringMesh1);
    });

    // 11. Raycasting
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

    // 12. Resize
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
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
      controls,
      isAutoRotating,
      isRadarActive,
    };

    // 13. Non-Stop Render Loop: ALWAYS continues auto-rotating continuously!
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = performance.now() * 0.001;

      // Earth constantly rotates non-stop while viewing or entering credentials
      if (sceneRef.current?.isAutoRotating) {
        earthMesh.rotation.y += 0.0012;
        hotspotGroup.rotation.y += 0.0012;
      }

      if (radarMesh && sceneRef.current?.isRadarActive) {
        radarMesh.rotation.z += 0.008;
        radarMesh.material.opacity = 0.2 + Math.sin(elapsed * 2) * 0.12;
      }

      hotspotGroup.children.forEach((child) => {
        if (child.userData && child.userData.isRing) {
          const speed = child.userData.speed || 3.0;
          const phase = child.userData.phase || 0;
          const scale = 1 + (Math.sin(elapsed * speed + phase) + 1) * 0.55;
          child.scale.set(scale, scale, 1);
          (child as THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>).material.opacity = Math.max(
            0.1,
            0.9 - (scale - 1) * 0.7
          );
        }
      });

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [hotspots]);

  return (
    <div
      ref={containerRef}
      id="globe-container"
      className={`fixed inset-0 z-0 cursor-grab active:cursor-grabbing ${className}`}
    />
  );
};
