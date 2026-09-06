'use client';

import React from 'react';

export interface NavRailProps {
  /** Callback for Global Overview click */
  onGlobalOverviewClick: () => void;
  /** Callback for Hazard Map click */
  onHazardMapClick: () => void;
  /** Callback for Habitations & Risk click */
  onHabitationsClick: () => void;
  /** Callback for Relocation Sites click */
  onRelocationClick: () => void;
  /** Callback for Sensor Alerts click */
  onSensorAlertsClick: () => void;
  /** Custom root className */
  className?: string;
}

export const NavRail: React.FC<NavRailProps> = ({
  onGlobalOverviewClick,
  onHazardMapClick,
  onHabitationsClick,
  onRelocationClick,
  onSensorAlertsClick,
  className = '',
}) => {
  return (
    <aside
      id="app-aside"
      className={`fixed left-0 top-16 bottom-0 w-16 border-r border-white/[0.08] bg-forest-dark/60 backdrop-blur-xl z-30 hidden sm:flex flex-col items-center py-5 space-y-4 ${className}`}
    >
      <button
        onClick={onGlobalOverviewClick}
        title="Global Overview"
        className="w-10 h-10 rounded-xl bg-citron/15 text-citron border border-citron/30 flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
      >
        <span className="material-symbols-outlined text-xl">travel_explore</span>
      </button>

      <button
        onClick={onHazardMapClick}
        title="Hazard Map"
        className="w-10 h-10 rounded-xl text-text-muted hover:text-text-primary hover:bg-white/5 flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
      >
        <span className="material-symbols-outlined text-xl">map</span>
      </button>

      <button
        onClick={onHabitationsClick}
        title="Habitations & Risk"
        className="w-10 h-10 rounded-xl text-text-muted hover:text-text-primary hover:bg-white/5 flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
      >
        <span className="material-symbols-outlined text-xl">home_pin</span>
      </button>

      <button
        onClick={onRelocationClick}
        title="Relocation Sites"
        className="w-10 h-10 rounded-xl text-text-muted hover:text-text-primary hover:bg-white/5 flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
      >
        <span className="material-symbols-outlined text-xl">moving</span>
      </button>

      <button
        onClick={onSensorAlertsClick}
        title="Sensor Alerts"
        className="w-10 h-10 rounded-xl text-text-muted hover:text-text-primary hover:bg-white/5 flex items-center justify-center transition-all hover:scale-105 cursor-pointer relative"
      >
        <span className="material-symbols-outlined text-xl">notifications_active</span>
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-hazard-red animate-pulse" />
      </button>

      <div className="flex-grow" />

      {/* Officer Avatar */}
      <div
        title="Duty Officer"
        className="w-8 h-8 rounded-full bg-forest-surface border border-citron/40 text-citron text-xs font-bold flex items-center justify-center select-none"
      >
        DO
      </div>
    </aside>
  );
};
