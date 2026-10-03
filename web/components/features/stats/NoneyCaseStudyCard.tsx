'use client';

import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { NoneyCaseStudyCardProps } from './types';

interface ResponseActionItem {
  agency?: string;
  action?: string;
}

interface SourceRefItem {
  title?: string;
  uuid?: string;
}

export const NoneyCaseStudyCard: React.FC<NoneyCaseStudyCardProps> = ({
  caseStudy,
  isLoading = false,
  className = '',
  classNames = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current || isLoading) return;
      gsap.from(containerRef.current.querySelectorAll('.animate-pill'), {
        opacity: 0,
        scale: 0.95,
        duration: 0.3,
        stagger: 0.03,
        ease: 'power2.out',
      });
    },
    { scope: containerRef, dependencies: [caseStudy, isLoading] }
  );

  if (isLoading) {
    return (
      <div className={`glass-card p-6 rounded-3xl border border-line dark:border-white/10 animate-pulse space-y-4 ${className}`}>
        <div className="h-5 w-64 bg-surface-2 dark:bg-white/10 rounded" />
        <div className="h-32 bg-surface-2 dark:bg-white/10 rounded-2xl" />
      </div>
    );
  }

  if (!caseStudy) return null;

  const actions = (caseStudy.response_actions ?? []) as ResponseActionItem[];
  const sources = (caseStudy.source_refs ?? []) as SourceRefItem[];

  return (
    <div
      ref={containerRef}
      className={`glass-card p-5 sm:p-6 rounded-3xl border border-rose-500/20 dark:border-rose-500/30 space-y-4 ${classNames.root ?? ''} ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line dark:border-white/10 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-500 text-lg">landslide</span>
            <h3 className="font-display text-base font-bold text-ink dark:text-white">
              {caseStudy.title}
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-500/15 text-rose-500 border border-rose-500/30">
              Documented case study
            </span>
          </div>
          <p className="text-xs text-text-muted">
            {caseStudy.location_name} • {caseStudy.event_date}
          </p>
        </div>

        {/* Casualty Badges */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
            <span className="block text-sm font-bold font-mono text-rose-500">{caseStudy.fatalities}</span>
            <span className="block text-[9px] font-mono uppercase text-text-muted">Fatalities</span>
          </div>
          <div className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
            <span className="block text-sm font-bold font-mono text-amber-500">{caseStudy.injured}</span>
            <span className="block text-[9px] font-mono uppercase text-text-muted">Injured</span>
          </div>
          <div className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <span className="block text-sm font-bold font-mono text-emerald-500">₹{caseStudy.compensation_cr} Cr</span>
            <span className="block text-[9px] font-mono uppercase text-text-muted">Relief Ex-Gratia</span>
          </div>
        </div>
      </div>

      {/* Narrative Summary */}
      <p className="text-xs text-text-secondary leading-relaxed">
        {caseStudy.summary}
      </p>

      {/* Geotechnical Triggers & Multi-Agency Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* Geotechnical Context */}
        {caseStudy.geotechnical_context && (
          <div className="p-3.5 rounded-2xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
              <span className="material-symbols-outlined text-sm">warning</span>
              <span>Geotechnical Triggers & Mechanism</span>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              {caseStudy.geotechnical_context}
            </p>
            {sources.length > 0 && (
              <div className="pt-1 text-[10px] font-mono text-text-muted">
                Official ref: {sources[0].title}
              </div>
            )}
          </div>
        )}

        {/* Multi-Agency Response Actions */}
        {actions.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
              <span className="material-symbols-outlined text-sm">groups</span>
              <span>Multi-Agency Rescue Operations</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-text-secondary">
              {actions.map((item: ResponseActionItem, idx: number) => (
                <li key={idx} className="animate-pill flex items-start gap-1.5">
                  <span className="text-emerald-500 font-mono font-bold mt-0.5">•</span>
                  <span>
                    <strong className="text-ink dark:text-white">{item.agency}:</strong> {item.action}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
