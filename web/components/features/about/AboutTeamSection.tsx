'use client';

import React from 'react';
import { AboutTeamMemberCard } from './AboutTeamMemberCard';
import { ScrollReveal } from './ScrollReveal';
import type { AboutTeamSectionProps, TeamMemberData } from './types';

export const TRIPLE_T_MEMBERS: TeamMemberData[] = [
  { id: 'shaza-rizvi', name: 'Shaza Rizvi' },
  { id: 'aryan-chettri', name: 'Aryan Chettri' },
  { id: 'shrey-singh', name: 'Shrey Singh' },
  { id: 'aarushi-singh', name: 'Aarushi Singh' },
  { id: 'monishka-kanodia', name: 'Monishka Kanodia' },
  { id: 'suyasha-tripathy', name: 'Suyasha Tripathy' },
];

export const AboutTeamSection: React.FC<AboutTeamSectionProps> = ({
  teamName = 'Triple T',
  eyebrow = 'THE TEAM',
  headline = teamName,
  members = TRIPLE_T_MEMBERS,
  className = '',
}) => {
  return (
    <section
      id="team"
      aria-label={`Team ${teamName}`}
      className={`relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 ${className}`}
    >
      <ScrollReveal distance={28} duration={0.8} threshold={0.1}>
        {/* Header Block: Minimal & Editorial */}
        <div className="text-center mb-10 sm:mb-14">
          <span className="text-xs font-mono font-medium tracking-[0.25em] text-text-muted dark:text-neutral-400 uppercase mb-3 block">
            {eyebrow}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-ink dark:text-text-primary leading-tight font-editorial">
            {headline}
          </h2>
        </div>
      </ScrollReveal>

      {/* 6 Members Grid: Purely names with staggered scroll reveal */}
      <ScrollReveal distance={32} duration={0.7} stagger={0.06} threshold={0.1}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch">
          {members.map((member) => (
            <AboutTeamMemberCard key={member.id} member={member} />
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
};
