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
import { LoginCard } from '@/components/features/auth';
import { GovHexMapPage } from '@/components/features/gov-view';
import { PublicStoriesPage } from '@/components/features/public-stories';

export type ViewMode = 'landing' | 'login' | 'gov-map' | 'public-stories';

export default function HomePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
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

  const handleEnterPortal = useCallback(() => {
    setViewMode('login');
    showToast('Select Government Official or Public Citizen Portal');
  }, [showToast]);

  const handleBackToOverview = useCallback(() => {
    setViewMode('landing');
    showToast('Returning to Global Overview');
  }, [showToast]);

  const handleLoginGov = useCallback(() => {
    setViewMode('gov-map');
    showToast('Authorized: Loading Government Hexagonal Risk Map (Reference Image 1)...');
  }, [showToast]);

  const handleLoginCitizen = useCallback(() => {
    setViewMode('public-stories');
    showToast('Welcome Citizen: Loading Regional Hazard Stories Map (Reference Image 2)...');
  }, [showToast]);

  // 1. Government Official View: ONLY the Map of India with Hexagons (Reference Image 1)
  if (viewMode === 'gov-map') {
    return (
      <>
        <GovHexMapPage
          onBackToOverview={handleBackToOverview}
          onSwitchToPublicPortal={() => setViewMode('public-stories')}
        />
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      </>
    );
  }

  // 2. Normal User / Public Citizen View: India Map with Regional Story Cutouts & Slideshow (Reference Image 2)
  if (viewMode === 'public-stories') {
    return (
      <>
        <PublicStoriesPage
          onBackToOverview={handleBackToOverview}
          onSwitchToGovPortal={() => setViewMode('gov-map')}
        />
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      </>
    );
  }

  // 3. Landing & Portal Authentication Views
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg-base text-text-primary select-none">
      {/* Misty Forest Background Atmosphere */}
      <div className="fixed inset-0 forest-atmosphere z-0 pointer-events-none" />

      {/* 3D WebGL Earth Globe Canvas */}
      <GlobeCanvas
        viewMode={viewMode === 'login' ? 'login' : 'landing'}
        isAutoRotating={isAutoRotating}
        isRadarActive={isRadarActive}
        onHoverHotspot={setHoveredHotspot}
      />

      {/* Minimalist Top Header */}
      <Header
        viewMode={viewMode === 'login' ? 'login' : 'landing'}
        onToggleViewMode={(mode) => setViewMode(mode as ViewMode)}
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

      {/* Main Content View: Landing vs Dual-Button Login Portal */}
      <div className="relative z-10 w-full h-full flex items-center pointer-events-none">
        {viewMode === 'landing' ? (
          <HeroContent onEnterPortal={handleEnterPortal} />
        ) : (
          <div className="px-6 sm:px-12 lg:px-20 w-full max-w-3xl pointer-events-auto">
            <LoginCard
              onBackToOverview={handleBackToOverview}
              onLoginGov={handleLoginGov}
              onLoginCitizen={handleLoginCitizen}
            />
          </div>
        )}
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
