'use client';

import React, { useRef, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { CaseStudyModalProps } from './types';

export const CaseStudyModal: React.FC<CaseStudyModalProps> = ({
  isOpen,
  onClose,
  caseStudy,
}) => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  useGSAP(
    () => {
      if (!isOpen) return;
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 30, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power3.out' }
      );
    },
    { dependencies: [isOpen] }
  );

  if (!isOpen || !caseStudy) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-card rounded-3xl border border-line dark:border-white/20 p-6 sm:p-8 space-y-6 text-ink dark:text-text-primary shadow-2xl relative"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-2 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="Close dialog"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        {/* Header */}
        <div className="space-y-2 pr-8">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-500/15 text-rose-500 border border-rose-500/30">
              {caseStudy.disaster_type} • Verified Ground Truth
            </span>
            <span className="text-xs font-mono text-text-muted">{caseStudy.event_date}</span>
          </div>

          <h2 className="font-display text-xl sm:text-2xl font-bold text-ink dark:text-white">
            {caseStudy.title}
          </h2>

          <p className="text-xs font-mono text-citron flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">location_on</span>
            <span>{caseStudy.location_name}</span>
          </p>
        </div>

        {/* Casualty Strip */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
            <div className="text-2xl font-bold font-mono text-rose-500">{caseStudy.fatalities}</div>
            <div className="text-[10px] font-mono uppercase text-text-muted">Lives Lost</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
            <div className="text-2xl font-bold font-mono text-amber-500">{caseStudy.injured}</div>
            <div className="text-[10px] font-mono uppercase text-text-muted">Injured</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <div className="text-2xl font-bold font-mono text-emerald-500">₹{caseStudy.compensation_cr} Cr</div>
            <div className="text-[10px] font-mono uppercase text-text-muted">Ex-Gratia Relief</div>
          </div>
        </div>

        {/* Narrative Summary */}
        <div className="space-y-2">
          <div className="text-xs font-mono font-semibold uppercase text-text-muted">Incident Overview</div>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            {caseStudy.summary}
          </p>
        </div>

        {/* Geotechnical Context */}
        {caseStudy.geotechnical_context && (
          <div className="p-4 rounded-2xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-500">
              <span className="material-symbols-outlined text-base">terrain</span>
              <span>Geotechnical Mechanism & Triggering Factors</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed font-sans">
              {caseStudy.geotechnical_context}
            </p>
          </div>
        )}

        {/* Multi-Agency Response */}
        {caseStudy.response_actions && caseStudy.response_actions.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs font-mono font-semibold uppercase text-text-muted flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-emerald-500">verified_user</span>
              <span>Multi-Agency Operational Deployment</span>
            </div>

            <div className="space-y-2">
              {caseStudy.response_actions.map((act: Record<string, unknown>, i: number) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 text-xs text-text-secondary flex items-start gap-2.5"
                >
                  <span className="px-2 py-0.5 rounded bg-citron/15 text-citron font-mono font-bold text-[10px] shrink-0 mt-0.5">
                    {String(act.agency ?? 'Agency')}
                  </span>
                  <span>{String(act.action ?? '')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-line dark:border-white/10 flex items-center justify-between text-[11px] font-mono text-text-muted">
          <span>Source: Official Government &amp; NDRF Documentation</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-citron text-black font-bold font-mono text-xs hover:bg-citron/90 transition-colors cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
