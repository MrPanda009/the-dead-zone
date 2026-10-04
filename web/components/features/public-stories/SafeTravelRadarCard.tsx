'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ZoneId } from './storyData';
import { getEmergencyProfile, DistrictEmergencyProfile } from './touristEmergencyData';
import { getBackendProfileForZone } from './districtBackendService';
import { apiGet } from '@/lib/api/client';

export interface SafeTravelRadarCardProps {
  /** The selected zone/district ID */
  zone: ZoneId;
  /** Optional custom root className */
  className?: string;
}

export const SafeTravelRadarCard: React.FC<SafeTravelRadarCardProps> = ({
  zone,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const emergencyData = getEmergencyProfile(zone);
  const backendProfile = getBackendProfileForZone(zone);

  // Scrubber state (0h to 72h, default at 18h or 24h)
  const [scrubberHour, setScrubberHour] = useState<number>(24);
  const [activeAlertsCount, setActiveAlertsCount] = useState<number | null>(null);
  const [forecastAlertsCount, setForecastAlertsCount] = useState<number | null>(null);

  // Dynamic alert status (from backend API or verified baseline)
  useEffect(() => {
    let isCancelled = false;
    async function fetchAlerts() {
      try {
        const adminId = backendProfile.adminId || backendProfile.lgdCode;
        if (!adminId) return;

        // Concurrent backend requests to /alerts/active and /alerts/forecast
        const [activeRes, forecastRes] = await Promise.allSettled([
          apiGet<{ total_active_cells?: number; items?: unknown[] }>(
            `/alerts/active?admin=${adminId}`
          ),
          apiGet<{ total_forecast_cells?: number; items?: unknown[] }>(
            `/alerts/forecast?admin=${adminId}&horizon=72`
          ),
        ]);

        if (isCancelled) return;

        if (activeRes.status === 'fulfilled' && activeRes.value) {
          setActiveAlertsCount(activeRes.value.total_active_cells ?? activeRes.value.items?.length ?? 0);
        }
        if (forecastRes.status === 'fulfilled' && forecastRes.value) {
          setForecastAlertsCount(forecastRes.value.total_forecast_cells ?? forecastRes.value.items?.length ?? 0);
        }
      } catch {
        // Graceful fallback to verified regional data
      }
    }

    fetchAlerts();
    return () => {
      isCancelled = true;
    };
  }, [backendProfile.adminId, backendProfile.lgdCode, zone]);

  // Overall computed status
  const isHighAlert =
    (activeAlertsCount !== null && activeAlertsCount > 0) ||
    emergencyData.currentAlertLevel === 'High Hazard';
  const isMonitored =
    !isHighAlert &&
    ((forecastAlertsCount !== null && forecastAlertsCount > 0) ||
      emergencyData.currentAlertLevel === 'Monitored');

  const statusPillVariant = isHighAlert
    ? 'critical'
    : isMonitored
    ? 'monitored'
    : 'normal';

  const statusPillText = isHighAlert
    ? 'High Hazard Alert — Restrict Non-Essential Travel'
    : isMonitored
    ? 'Monitored Advisory — Ghat Speed Restrictions'
    : 'Normal Conditions — Open for Tourism';

  useGSAP(
    () => {
      if (!containerRef.current) return;
      gsap.fromTo(
        '.radar-segment-card',
        { opacity: 0.6, y: 6 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out' }
      );
    },
    { scope: containerRef, dependencies: [zone] }
  );

  // Find active segment & hour detail based on current scrubber hour
  const currentWindowKey = scrubberHour <= 24 ? '24h' : scrubberHour <= 48 ? '48h' : '72h';
  const currentSegment =
    emergencyData.safeWindowRadar.segments.find((s) => s.hourWindow === currentWindowKey) ||
    emergencyData.safeWindowRadar.segments[0];

  return (
    <div
      ref={containerRef}
      className={`glass-card p-3 sm:p-3.5 rounded-2xl bg-surface-0/95 dark:bg-[#071912]/95 border border-line dark:border-white/10 shadow-md flex flex-col gap-2.5 text-ink dark:text-cream select-none transition-all ${className}`}
    >
      {/* 1. Header with Live Status & Info Tooltip */}
      <div className="flex items-center justify-between gap-2 border-b border-line/50 dark:border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-yellow-500 dark:text-citron">
            verified_user
          </span>
          <h3 className="text-xs sm:text-[13px] font-bold tracking-tight text-ink dark:text-cream leading-tight">
            Live Travel Status & 72-Hour &ldquo;Safe Travel Window&rdquo; Radar
          </h3>
        </div>
        <button
          type="button"
          title="Synthesizes ECMWF 72h precipitation forecast, InSAR slope deformation, and active hydrological triggers into civilian safety windows."
          className="text-ink-muted hover:text-ink dark:text-cream/40 dark:hover:text-cream transition-colors cursor-help"
        >
          <span className="material-symbols-outlined text-sm">info</span>
        </button>
      </div>

      {/* 2. Dynamic Status Pill */}
      <div
        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-medium tracking-tight shadow-2xs transition-colors ${
          statusPillVariant === 'normal'
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
            : statusPillVariant === 'monitored'
            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
            : 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            statusPillVariant === 'normal'
              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
              : statusPillVariant === 'monitored'
              ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
              : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse'
          }`}
        />
        <span className="font-semibold text-xs sm:text-[13px]">
          {statusPillText}
        </span>
      </div>

      {/* 3. Three 24h/48h/72h Safe Window Segments */}
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        {emergencyData.safeWindowRadar.segments.map((segment) => {
          const isCurrentSegment = segment.hourWindow === currentWindowKey;
          return (
            <div
              key={segment.hourWindow}
              onClick={() => {
                const hourTarget =
                  segment.hourWindow === '24h'
                    ? 18
                    : segment.hourWindow === '48h'
                    ? 42
                    : 66;
                setScrubberHour(hourTarget);
              }}
              className={`radar-segment-card flex flex-col justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                isCurrentSegment
                  ? 'bg-surface-2 dark:bg-white/10 border-emerald-500/40 dark:border-citron/40 shadow-xs'
                  : 'bg-surface-1/50 dark:bg-white/5 border-line/60 dark:border-white/5 hover:bg-surface-1 dark:hover:bg-white/10'
              }`}
            >
              {/* Header: Window & Status Badge */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-ink dark:text-cream">
                  {segment.hourWindow}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    segment.status === 'safe'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : segment.status === 'monitored'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {segment.label}
                </span>
              </div>

              {/* Solid Risk Bar matching reference screenshot */}
              <div className="h-1.5 w-full rounded-full overflow-hidden mt-2 bg-black/10 dark:bg-white/10">
                <div
                  className={`h-full w-full rounded-full transition-colors ${
                    segment.status === 'safe'
                      ? 'bg-emerald-500'
                      : segment.status === 'monitored'
                      ? 'bg-amber-400'
                      : 'bg-red-500'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Interactive 72-Hour Timeline Scrubber Slider */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-yellow-500 dark:text-citron font-medium truncate max-w-[85%]">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 dark:text-citron shrink-0" />
            <span className="truncate">
              T+{scrubberHour}h ({currentSegment.description})
            </span>
          </div>
          <span className="text-ink-muted dark:text-cream/40 font-mono text-[10px] shrink-0">
            /72h
          </span>
        </div>

        {/* Range Scrubber with bright blue handle */}
        <div className="relative w-full flex items-center">
          <input
            type="range"
            min={1}
            max={72}
            value={scrubberHour}
            onChange={(e) => setScrubberHour(Number(e.target.value))}
            className="w-full h-1.5 bg-surface-2 dark:bg-white/15 rounded-lg appearance-none cursor-pointer accent-sky-400 transition-all"
            aria-label="72-Hour timeline scrubber"
          />
        </div>
      </div>

      {/* 5. Color Legend (Matching Reference Image) */}
      <div className="flex items-center justify-between pt-1.5 border-t border-line/40 dark:border-white/5 text-[9px] sm:text-[10px] text-ink-muted dark:text-cream/60">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          <span>Safe travel window</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          <span>Increased risk (heavy rain / landslide)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          <span>Peak vulnerability</span>
        </div>
      </div>
    </div>
  );
};

export default SafeTravelRadarCard;
