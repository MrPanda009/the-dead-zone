'use client';

import React, { useState, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { RouteStage } from '@/components/layout/transition';
import { Toast } from '@/components/common/toast';
import { APP_ROUTES, NAV_TABS } from '@/lib/routes';
import { INTRO_TIMINGS } from '@/lib/motion/introSequence';
import {
  GlobeCanvas,
  HotspotTooltip,
  HotspotData,
  FloatingQuickControls,
} from '@/components/features/globe';
import { HeroContent } from '@/components/features/hero';

export default function HomePage() {
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isRadarActive, setIsRadarActive] = useState(true);
  const [activeTab, setActiveTab] = useState('planetary');
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<{
    spot: HotspotData;
    position: { x: number; y: number };
  } | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  const handleFocusHazard = useCallback(() => {
    setFocusTrigger((prev) => prev + 1);
    showToast('Targeting India Disaster Red Zone (Uttarakhand Arc)');
  }, [showToast]);

  const handleToggleRotation = useCallback(() => {
    setIsAutoRotating((prev) => {
      const next = !prev;
      showToast(next ? 'Globe Auto-Rotation: ACTIVE' : 'Globe Auto-Rotation: PAUSED');
      return next;
    });
  }, [showToast]);

  /**
   * Tabs with an href navigate through the container transform (the link
   * handles that itself); this only owns the in-page behaviour, which today is
   * the SAR mesh sweep.
   */
  const handleSelectTab = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'sar_mesh') {
        setIsRadarActive(true);
        showToast('SAR Mesh Telemetry: Real-time Sweep Active');
      }
    },
    [showToast]
  );

  return (
    <RouteStage className="relative w-screen h-screen overflow-hidden bg-bg-base text-text-primary select-none">
      {/* Soft Ambient Forest / Sage Lighting Atmosphere */}
      <div className="fixed inset-0 forest-atmosphere z-0 pointer-events-none" />

      {/* 3D WebGL Earth Globe Canvas (India Default Focus & Orbital Ring) */}
      <GlobeCanvas
        viewMode="landing"
        isAutoRotating={isAutoRotating}
        isRadarActive={isRadarActive}
        focusTrigger={focusTrigger}
        onHoverHotspot={setHoveredHotspot}
        animation={{ delay: INTRO_TIMINGS.globe }}
      />

      {/* Top Floating Dark Dock Navigation */}
      <Header
        homeHref={APP_ROUTES.home}
        portalHref={APP_ROUTES.login}
        tabs={NAV_TABS}
        activeTabId={activeTab}
        onSelectTab={handleSelectTab}
        animation={{ delay: INTRO_TIMINGS.header }}
      />

      {/* Main Hero Column (Typography, Tagline, Primary CTA, Node Avatars) */}
      <HeroContent
        portalHref={APP_ROUTES.login}
        animation={{ delay: INTRO_TIMINGS.heroBadge }}
      />

      {/* Right Floating Quick Controls (Theme Toggle, Target Focus, Orbit Sync) */}
      <FloatingQuickControls
        isAutoRotating={isAutoRotating}
        onToggleRotation={handleToggleRotation}
        onFocusHazard={handleFocusHazard}
        animation={{ delay: INTRO_TIMINGS.fabRail }}
      />



      {/* 3D Red Zone Hover Tooltip */}
      <HotspotTooltip
        spot={hoveredHotspot ? hoveredHotspot.spot : null}
        position={hoveredHotspot ? hoveredHotspot.position : null}
        onViewPlan={(spot) => {
          showToast(`Dead Zone Telemetry Loaded: ${spot.name}`);
        }}
      />

      {/* Feedback Toast Banner */}
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </RouteStage>
  );
}
