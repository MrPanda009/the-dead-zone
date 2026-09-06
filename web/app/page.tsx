'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { FrostedFooter } from '@/components/layout/footer';
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
import {
  LANDING_STORIES,
  StorySection,
  ScrollIndicator,
} from '@/components/features/landing';

export default function HomePage() {
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isRadarActive, setIsRadarActive] = useState(true);
  const [activeTab, setActiveTab] = useState('planetary');
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<{
    spot: HotspotData;
    position: { x: number; y: number };
  } | null>(null);

  // Track window scroll progress (0.0 to 1.0) to drive globe zig-zag animation with every scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const totalScrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      if (totalScrollable > 0) {
        const progress = Math.min(
          1,
          Math.max(0, scrollY / totalScrollable)
        );
        setScrollProgress(progress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

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
    <RouteStage className="relative w-full min-h-screen overflow-x-hidden bg-bg-base text-text-primary">
      {/* Soft Ambient Forest / Sage Lighting Atmosphere */}
      <div className="fixed inset-0 forest-atmosphere z-0 pointer-events-none" />

      {/* 3D WebGL Earth Globe Canvas (India Focus & Zig-Zag Scroll Animation)
          pointer-events-auto ensures full click-and-drag interaction! */}
      <GlobeCanvas
        viewMode="landing"
        isAutoRotating={isAutoRotating}
        isRadarActive={isRadarActive}
        focusTrigger={focusTrigger}
        onHoverHotspot={setHoveredHotspot}
        scrollProgress={scrollProgress}
        animation={{ delay: INTRO_TIMINGS.globe }}
        className="fixed inset-0 z-0 pointer-events-auto cursor-grab active:cursor-grabbing"
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

      {/* Right Floating Quick Controls (Theme Toggle, Target Focus, Orbit Sync) */}
      <FloatingQuickControls
        isAutoRotating={isAutoRotating}
        onToggleRotation={handleToggleRotation}
        onFocusHazard={handleFocusHazard}
        animation={{ delay: INTRO_TIMINGS.fabRail }}
      />

      {/* ============================================================
          SCROLLING STORYTELLING TRACK
          pointer-events-none allows dragging the globe in the empty space
          next to the text cards. Individual cards have pointer-events-auto.
          ============================================================ */}
      <main className="relative z-10 w-full flex flex-col pointer-events-none">
        {/* Section 0: Hero Section (Text on Left, Globe in Empty Space on Right) */}
        <div className="relative min-h-screen shrink-0 w-full flex flex-col justify-between pt-24 pb-8 sm:pb-12 px-6 sm:px-12 lg:px-20 pointer-events-none">
          <HeroContent portalHref={APP_ROUTES.login} className="pt-0 px-0 pointer-events-none" />
          <div className="pointer-events-auto mt-6 flex items-center justify-start">
            <ScrollIndicator targetId={LANDING_STORIES[0].id} />
          </div>
        </div>

        {/* Narrative Sections: Globe zig-zags into the empty space next to text */}
        {LANDING_STORIES.map((story) => (
          <StorySection key={story.id} data={story} id={story.id} />
        ))}

        {/* Section 4: Horizon Command Section
            Globe glides into the bottom center (50% submerged beneath horizon)
            behind the frosted glass footer. */}
        <div
          id="command-horizon"
          className="relative min-h-screen shrink-0 w-full flex flex-col justify-between pt-28 pointer-events-none"
        >
          {/* Horizon Briefing Card */}
          <div className="max-w-xl mx-auto px-6 sm:px-12 text-center pointer-events-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-surface-0/80 dark:bg-forest-surface/80 backdrop-blur-md border border-line dark:border-white/10 text-[11px] font-mono font-semibold text-accent-emerald-bright mb-4">
              <span className="w-2 h-2 rounded-full bg-accent-emerald-bright animate-ping" />
              PLANETARY HORIZON · NDMD RESILIENCE
            </div>
            <h2 className="text-3xl sm:text-5xl font-display font-black text-ink dark:text-text-primary tracking-tight mb-4">
              The National Relocation Grid
            </h2>
            <p className="text-sm sm:text-base text-text-secondary max-w-lg mx-auto leading-relaxed">
              Empowering emergency administrators, district magistrates, and NDRF relief
              battalions with autonomous, AI-guided spatial resilience.
            </p>
          </div>

          {/* Frosted Glass Footer:
              Sits over the bottom of the screen with the rotating globe
              crowning and shining through from behind it. */}
          <div className="pointer-events-auto w-full">
            <FrostedFooter />
          </div>
        </div>
      </main>

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
