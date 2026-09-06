'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export interface LoginCardProps {
  /** Target link for returning to overview (default '/') */
  overviewHref?: string;
  /** Target link for Government Official login (default '/gov') */
  govHref?: string;
  /** Target link for Citizen Portal (default '/stories') */
  citizenHref?: string;
  /** Optional callback when user clicks "Return to Overview" */
  onBackToOverview?: () => void;
  /** Optional callback when user logs in as a Government Official */
  onLoginGov?: () => void;
  /** Optional callback when user logs in as a Normal User (Citizen) */
  onLoginCitizen?: () => void;
  /** Custom root className */
  className?: string;
}

export const LoginCard: React.FC<LoginCardProps> = ({
  overviewHref = '/',
  govHref = '/gov',
  citizenHref = '/stories',
  onBackToOverview,
  onLoginGov,
  onLoginCitizen,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current,
      { x: -60, opacity: 0, scale: 0.96 },
      { x: 0, opacity: 1, scale: 1, duration: 0.65, ease: 'power3.out' }
    );
  }, { scope: containerRef });

  const handleGovClick = (e: React.MouseEvent) => {
    if (onLoginGov) {
      e.preventDefault();
      onLoginGov();
    }
  };

  const handleCitizenClick = (e: React.MouseEvent) => {
    if (onLoginCitizen) {
      e.preventDefault();
      onLoginCitizen();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`w-full max-w-xl lg:max-w-2xl glass-card p-8 sm:p-10 lg:p-12 rounded-[32px] border border-white/15 shadow-2xl relative z-20 backdrop-blur-2xl ${className}`}
    >
      {/* Top Header Pill */}
      <div className="flex items-center justify-between mb-8">
        <span className="pill-badge px-3.5 py-1.5 rounded-full text-xs font-mono font-medium text-citron border border-citron/30 bg-citron/10 flex items-center gap-2 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-citron animate-ping" />
          <span>SETU-DRR :: SECURE DISASTER INTELLIGENCE PORTAL</span>
        </span>
        <Link
          href={overviewHref}
          onClick={onBackToOverview}
          className="text-xs font-mono text-text-muted hover:text-text-primary transition-colors flex items-center gap-1.5 cursor-pointer py-1 px-2.5 rounded-lg hover:bg-white/5"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Overview</span>
        </Link>
      </div>

      {/* Title & Subtitle */}
      <div className="mb-8">
        <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight leading-tight">
          Select Your Access Portal
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary/80 mt-2 leading-relaxed max-w-lg font-sans">
          Authenticate as an authorized Government Official to access the full-screen hexagonal risk map, or enter as a citizen to discover regional hazard stories.
        </p>
      </div>

      {/* Two Dedicated Login Buttons / Action Pathways */}
      <div className="grid grid-cols-1 gap-4">
        {/* 1. GOVERNMENT OFFICIALS LOGIN BUTTON */}
        <Link
          href={govHref}
          onClick={handleGovClick}
          className="group text-left p-5 sm:p-6 rounded-2xl bg-[#162522]/80 hover:bg-[#162522] border border-[#a3e635]/40 hover:border-[#a3e635] shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer relative overflow-hidden block"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#22543d] text-[#a3e635] flex items-center justify-center shadow-inner shrink-0 group-hover:bg-[#a3e635] group-hover:text-[#162522] transition-colors">
                <span className="material-symbols-outlined text-2xl">
                  verified_user
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg sm:text-xl font-bold text-cream tracking-tight">
                    Government Official Login
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#a3e635]/20 text-[#a3e635] border border-[#a3e635]/30">
                    OFFICIAL
                  </span>
                </div>
                <p className="text-xs text-cream/70 mt-1 font-sans leading-relaxed">
                  Direct entry to the clean full-screen India map with hazard zones pre-mapped in hexagons (Dark & Light modes).
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-cream/40 group-hover:text-[#a3e635] group-hover:translate-x-1 transition-all text-xl mt-2 shrink-0">
              arrow_forward
            </span>
          </div>
        </Link>

        {/* 2. NORMAL USERS / CITIZEN LOGIN BUTTON */}
        <Link
          href={citizenHref}
          onClick={handleCitizenClick}
          className="group text-left p-5 sm:p-6 rounded-2xl bg-black/40 hover:bg-black/60 border border-white/15 hover:border-[#a3e635]/70 shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer relative overflow-hidden block"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 text-[#fde68a] flex items-center justify-center shadow-inner shrink-0 group-hover:bg-[#fde68a] group-hover:text-[#0e261d] transition-colors">
                <span className="material-symbols-outlined text-2xl">
                  public
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg sm:text-xl font-bold text-cream tracking-tight">
                    Normal Users / Citizen Portal
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-cream/80 border border-white/20">
                    PUBLIC
                  </span>
                </div>
                <p className="text-xs text-cream/70 mt-1 font-sans leading-relaxed">
                  Interactive India map with regional terrain photo cutouts, zone selector, and interactive hazard slideshows.
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-cream/40 group-hover:text-[#fde68a] group-hover:translate-x-1 transition-all text-xl mt-2 shrink-0">
              arrow_forward
            </span>
          </div>
        </Link>
      </div>

      {/* Footer Security Notice */}
      <div className="mt-8 pt-5 border-t border-white/[0.08] flex items-center justify-between text-xs text-text-muted font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-citron" />
          <span>NDRF / ISRO Sentinel-1 SAR Overpass Active</span>
        </span>
        <span>AES-256 GCM</span>
      </div>
    </div>
  );
};

export default LoginCard;
