'use client';

import React from 'react';

export interface GovHeaderProps {
  /** Officer identifier */
  officerId?: string;
  /** Minutes since last telemetry sync */
  lastUpdatedMinAgo?: number;
  /** Custom root className */
  className?: string;
  /** Callback to return to landing or log out */
  onLogout?: () => void;
}

export const GovHeader: React.FC<GovHeaderProps> = ({
  officerId = 'NDRF-OFFICER-894',
  lastUpdatedMinAgo = 3,
  className = '',
  onLogout,
}) => {
  return (
    <header
      className={`h-16 px-6 sm:px-8 bg-gov-bg/95 backdrop-blur-md border-b border-gov-border/20 flex items-center justify-between z-20 select-none ${className}`}
    >
      {/* Left Title & Editorial Subtitle */}
      <div className="flex items-center space-x-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-cream leading-none">
              RED ZONE / RESILIENCE MAP
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-gov-sage/20 text-gov-sage-light border border-gov-sage/30">
              NDRF-V4.2
            </span>
          </div>
          <p className="text-[11px] text-gov-sage-light font-sans tracking-wide mt-1">
            India · Disaster risk intelligence &amp; relocation decision support
          </p>
        </div>
      </div>

      {/* Right Telemetry & Status Badges */}
      <div className="flex items-center space-x-4 sm:space-x-6">
        {/* Live SAR InSAR Status */}
        <div className="hidden md:flex items-center space-x-2 text-xs font-mono text-cream/70 bg-gov-surface px-3 py-1.5 rounded-lg border border-gov-border/20">
          <span className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
          <span>SAR Constellation: Nominal</span>
          <span className="text-gov-sage">•</span>
          <span className="text-[11px] text-gov-amber">Updated {lastUpdatedMinAgo}m ago</span>
        </div>

        {/* Notifications */}
        <button
          type="button"
          title="18 Active Hazard Alerts"
          className="relative w-9 h-9 rounded-lg bg-gov-surface border border-gov-sage/30 text-cream/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">notifications</span>
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gov-red text-white font-mono text-[9px] font-bold flex items-center justify-center">
            18
          </span>
        </button>

        {/* Officer Profile Card */}
        <div className="flex items-center space-x-3 pl-2 sm:pl-3 border-l border-gov-border/20">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-mono font-semibold text-cream leading-tight">
              {officerId}
            </div>
            <div className="text-[10px] font-mono text-gov-sage-light">
              Govt. Official · Disaster Relief
            </div>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="Sign Out to Command Portal"
              className="w-8 h-8 rounded-lg bg-gov-surface hover:bg-gov-red/20 text-cream/60 hover:text-gov-red border border-transparent hover:border-gov-red/40 flex items-center justify-center transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
