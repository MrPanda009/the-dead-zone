'use client';

import React from 'react';
import { RouteStage } from '@/components/layout/transition';
import { Header } from '@/components/layout/header';
import { FrostedFooter } from '@/components/layout/footer';
import {
  AboutHero,
  AboutPillarsCard,
  AboutSplitSection,
  AboutLogosStrip,
  AboutTeamSection,
  AboutQuoteBanner,
  AboutAtmosphere,
} from '@/components/features/about';
import { APP_ROUTES, NAV_TABS } from '@/lib/routes';

export default function AboutPage() {
  return (
    <RouteStage
      as="div"
      className="relative min-h-screen w-full bg-bg-base text-ink dark:text-text-primary flex flex-col justify-between overflow-x-hidden transition-colors duration-500"
    >
      {/* Background Atmosphere & Mountain Ridges in Mist */}
      <AboutAtmosphere />

      {/* Floating Header Navigation Dock */}
      <Header
        homeHref={APP_ROUTES.home}
        portalHref={APP_ROUTES.login}
        tabs={NAV_TABS}
        activeTabId="about"
      />

      {/* Main Editorial Flow */}
      <main className="relative z-10 flex-1 flex flex-col">
        {/* 1. Hero Section with Rotating 3D Earth Globe Behind Header Text */}
        <AboutHero />

        {/* 2. Elevated Floating Card Overlapping Hero Bottom (3 Feature Pillars) */}
        <AboutPillarsCard />

        {/* 3. Alternating Split Section 1: Text on Left, Arched Image on Right */}
        <AboutSplitSection
          eyebrow="ABOUT TERRA"
          headline="Scientific Decision Support, built for India’s high-risk frontline."
          description="From fragile Himalayan slopes in Joshimath and Wayanad to cyclonic coastal deltas, TERRA provides scientific clarity when every hour counts. We bridge the gap between academic remote sensing and immediate field operations, turning raw satellite data into targeted humanitarian protection."
          imageSrc="/stories/north.jpg"
          imageAlt="Himalayan mountain settlement perched on active slope with monitoring vectors"
          imagePosition="right"
          cornerStyle="top-left-arch"
          actionLabel="Explore Platform"
          actionHref="/workspace"
        />

        {/* 4. Institutional Partners & Collaborators Strip */}
        <AboutLogosStrip />

        {/* 5. Alternating Split Section 2: Arched Image on Left, Text on Right */}
        <AboutSplitSection
          eyebrow="OUR APPROACH"
          headline="Our unique approach is what sets us apart."
          description="Disaster relocation is not merely moving structures; it is safeguarding human dignity, kinship ties, and ecological equilibrium. TERRA combines objective physics-based slope hazard calculations with nuanced Social Vulnerability Indices (SoVI) to ensure no vulnerable community is left invisible or displaced into despair."
          imageSrc="/stories/central.jpg"
          imageAlt="High altitude Himalayan community amidst lush protective ecological buffers"
          imagePosition="left"
          cornerStyle="top-right-arch"
          actionLabel="View Field Stories"
          actionHref="/stories"
        />

        {/* 6. Team Triple T Section */}
        <AboutTeamSection />

        {/* 7. Editorial Mission Statement / Testimonial Banner (Retains enclosing card box) */}
        <AboutQuoteBanner
          quote="Whoever saves one life saves the world entire."
          author="TERRA Humanitarian Principle"
          affiliation="Core Ethos & Operational Mandate"
        />
      </main>

      {/* Frosted Footnote & Telemetry */}
      <FrostedFooter />
    </RouteStage>
  );
}
