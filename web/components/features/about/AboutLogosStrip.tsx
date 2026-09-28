'use client';

import React from 'react';
import { AboutLogoItem } from './AboutLogoItem';
import { ScrollReveal } from './ScrollReveal';
import type { AboutLogosStripProps, AboutPartnerLogoData } from './types';

export const CANONICAL_PARTNERS: AboutPartnerLogoData[] = [
  { id: 'ndrf', name: 'NDRF', fullName: 'Disaster Response Force' },
  { id: 'ndma', name: 'NDMA', fullName: 'Management Authority' },
  { id: 'isro', name: 'ISRO', fullName: 'Space Research Org' },
  { id: 'soi', name: 'SoI', fullName: 'Survey of India' },
  { id: 'imd', name: 'IMD', fullName: 'Meteorological Dept' },
  { id: 'iitr', name: 'IIT Roorkee', fullName: 'Disaster Mitigation' },
  { id: 'nidm', name: 'NIDM', fullName: 'Inst of Disaster Mgmt' },
  { id: 'cwc', name: 'CWC', fullName: 'Central Water Comm' },
];

export const AboutLogosStrip: React.FC<AboutLogosStripProps> = ({
  label = 'DATA COLLABORATORS & RESEARCH ECOSYSTEM',
  partners = CANONICAL_PARTNERS,
  className = '',
}) => {
  return (
    <section
      aria-label="Institutional Partners and Data Collaborators"
      className={`relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 ${className}`}
    >
      <ScrollReveal distance={32} duration={0.85} threshold={0.15}>
        {/* Prominent Foreground Card Container behind Data Collaborators */}
        <div className="rounded-[32px] sm:rounded-[40px] bg-surface-0/95 dark:bg-forest-surface/95 border border-line/90 dark:border-white/10 backdrop-blur-2xl p-8 sm:p-12 lg:p-14 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_24px_56px_rgba(0,0,0,0.5)]">
          {/* Header block inside the foreground container */}
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
            {label && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-1 dark:bg-white/5 border border-line/60 dark:border-white/10 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10.5px] font-mono tracking-[0.22em] text-text-muted dark:text-neutral-300 uppercase font-semibold">
                  {label}
                </span>
              </div>
            )}
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink dark:text-text-primary font-editorial mt-1">
              National Institutional Telemetry
            </h3>
            <p className="text-sm sm:text-base text-text-secondary dark:text-neutral-300 mt-2 font-normal">
              Synthesizing observation feeds, elevation basemaps, and ground displacement telemetry directly with India’s disaster management institutions.
            </p>
          </div>

          {/* Elevated Foreground Tiles Grid */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 sm:gap-4 lg:gap-5">
            {partners.map((partner) => (
              <AboutLogoItem key={partner.id} data={partner} />
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
};
