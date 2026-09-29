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
      className={`relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 ${className}`}
    >
      <ScrollReveal distance={32} duration={0.85} threshold={0.15}>
        <div className="w-full">
          {/* Header block */}
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            {label && (
              <span className="text-[11px] font-mono tracking-[0.22em] text-text-muted dark:text-neutral-400 uppercase font-semibold block mb-3">
                {label}
              </span>
            )}
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-ink dark:text-text-primary font-editorial">
              National Institutional Telemetry
            </h3>
            <p className="text-sm sm:text-base text-text-secondary dark:text-neutral-300 mt-3 font-normal max-w-xl mx-auto">
              Synthesizing observation feeds, elevation basemaps, and ground displacement telemetry directly with India’s disaster management institutions.
            </p>
          </div>

          {/* Partner Logos Row (Clean layout without card boxes) */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 lg:gap-8">
            {partners.map((partner) => (
              <AboutLogoItem key={partner.id} data={partner} />
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
};
