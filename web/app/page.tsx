'use client';

import React, { useState, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { Toast } from '@/components/common/toast';
import {
  GlobeCanvas,
  HotspotTooltip,
  HotspotData,
} from '@/components/features/globe';
import { HeroContent } from '@/components/features/hero';

export default function HomePage() {
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isRadarActive, setIsRadarActive] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<{
    spot: HotspotData;
    position: { x: number; y: number };
  } | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg-base text-text-primary select-none">
      {/* Misty Forest Background Atmosphere */}
      <div className="fixed inset-0 forest-atmosphere z-0 pointer-events-none" />

      {/* 3D WebGL Earth Globe Canvas */}
      <GlobeCanvas
        viewMode="landing"
        isAutoRotating={isAutoRotating}
        isRadarActive={isRadarActive}
        onHoverHotspot={setHoveredHotspot}
      />

      {/* Minimalist Top Header */}
      <Header
        viewMode="landing"
        portalHref="/login"
        isRadarActive={isRadarActive}
        onToggleRadar={() => {
          setIsRadarActive((prev) => {
            const next = !prev;
            showToast(next ? 'Radar Sweep: ACTIVE' : 'Radar Sweep: STANDBY');
            return next;
          });
        }}
        isAutoRotating={isAutoRotating}
        onToggleRotation={() => {
          setIsAutoRotating((prev) => {
            const next = !prev;
            showToast(next ? 'Globe Auto-Rotation: ON' : 'Globe Auto-Rotation: PAUSED');
            return next;
          });
        }}
      />

      {/* Main Content View: Landing Hero Presentation */}
      <div className="relative z-10 w-full h-full flex items-center pointer-events-none">
        <HeroContent portalHref="/login" />
      </div>

      {/* 3D Red & Orange Dead Zone Hover Tooltip */}
      <HotspotTooltip
        spot={hoveredHotspot ? hoveredHotspot.spot : null}
        position={hoveredHotspot ? hoveredHotspot.position : null}
        onViewPlan={(spot) => {
          showToast(`Dead Zone Telemetry Loaded: ${spot.name}`);
        }}
      />

      {/* Toast Feedback Notification Banner */}
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </div>
  );
}
