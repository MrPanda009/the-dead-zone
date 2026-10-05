'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useTheme } from '@/components/providers';

export interface GoogleAuthButtonProps {
  /** Optional click handler or fallback */
  onClick?: () => void;
  /** Whether authentication is currently submitting/verifying */
  isLoading?: boolean;
  /** Custom label (default: 'Continue with Google') */
  label?: React.ReactNode;
  /** Custom badge text (defaults to 'SSO Ready' in dark mode, 'OIDC' in light mode) */
  badgeText?: React.ReactNode;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Ref for Google Identity Services hidden iframe overlay */
  gsiContainerRef?: React.RefObject<HTMLDivElement | null>;
  /** Custom root className */
  className?: string;
  /** Granular styling overrides */
  classNames?: {
    root?: string;
    iconBox?: string;
    label?: string;
    badge?: string;
    arrowBox?: string;
    outline?: string;
  };
  /** Animation configuration overrides */
  animation?: {
    enableHover?: boolean;
    duration?: number;
  };
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  onClick,
  isLoading = false,
  label = 'Continue with Google',
  badgeText,
  disabled = false,
  gsiContainerRef,
  className = '',
  classNames = {},
  animation = { enableHover: true, duration: 0.4 },
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const strokeRectRef = useRef<SVGRectElement>(null);
  const svgOutlineRef = useRef<SVGSVGElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const isHoveredRef = useRef<boolean>(false);
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';
  const resolvedBadge = badgeText ?? (isDark ? 'SSO Ready' : 'OIDC');

  // GSAP Hover Outline Animation
  const startHoverAnim = useCallback(() => {
    if (disabled || isLoading || !animation.enableHover) return;
    isHoveredRef.current = true;

    if (strokeRectRef.current && svgOutlineRef.current) {
      gsap.killTweensOf([strokeRectRef.current, svgOutlineRef.current]);
      gsap.set(svgOutlineRef.current, { opacity: 1 });

      // Quick glowing outline that races around the perimeter
      gsap.fromTo(
        strokeRectRef.current,
        { strokeDashoffset: 100 },
        {
          strokeDashoffset: 0,
          duration: animation.duration ?? 0.4,
          ease: 'power2.out',
        }
      );
    }

    if (arrowRef.current) {
      gsap.to(arrowRef.current, {
        x: 4,
        duration: 0.25,
        ease: 'back.out(2)',
      });
    }

    if (iconRef.current) {
      gsap.to(iconRef.current, {
        scale: 1.04,
        duration: 0.25,
        ease: 'power1.out',
      });
    }
  }, [disabled, isLoading, animation.enableHover, animation.duration]);

  const endHoverAnim = useCallback(() => {
    if (disabled || isLoading || !animation.enableHover) return;
    isHoveredRef.current = false;

    if (svgOutlineRef.current) {
      gsap.to(svgOutlineRef.current, {
        opacity: 0,
        duration: 0.22,
        ease: 'power2.in',
      });
    }

    if (arrowRef.current) {
      gsap.to(arrowRef.current, {
        x: 0,
        duration: 0.22,
        ease: 'power2.out',
      });
    }

    if (iconRef.current) {
      gsap.to(iconRef.current, {
        scale: 1,
        duration: 0.22,
        ease: 'power2.out',
      });
    }
  }, [disabled, isLoading, animation.enableHover]);

  // Window-level mouse listener to gracefully handle pointer events over cross-origin child iframe
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isHoveredRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const margin = 4; // Tolerance margin in pixels
      const isOutside =
        e.clientX < rect.left - margin ||
        e.clientX > rect.right + margin ||
        e.clientY < rect.top - margin ||
        e.clientY > rect.bottom + margin;

      if (isOutside) {
        endHoverAnim();
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [endHoverAnim]);

  const handleMouseEnter = () => {
    startHoverAnim();
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    if (!containerRef.current) {
      endHoverAnim();
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const isActuallyOutside =
      e.clientX <= rect.left ||
      e.clientX >= rect.right ||
      e.clientY <= rect.top ||
      e.clientY >= rect.bottom;

    if (isActuallyOutside) {
      endHoverAnim();
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={!disabled && !isLoading ? onClick : undefined}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || isLoading}
      aria-label="Continue with Google"
      className={`relative group w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-colors duration-200 select-none cursor-pointer overflow-hidden ${
        isDark
          ? 'bg-[#061811] hover:bg-[#082017] border border-[#143d2c] text-white shadow-md'
          : 'bg-white hover:bg-slate-50/90 border border-slate-200/90 text-slate-900 shadow-xs'
      } ${disabled ? 'opacity-60 pointer-events-none' : ''} ${classNames.root || ''} ${className}`}
    >
      {/* 1. Animated Border Outline SVG (Active on Hover) */}
      <svg
        ref={svgOutlineRef}
        aria-hidden="true"
        className={`absolute inset-0 w-full h-full pointer-events-none rounded-2xl overflow-visible z-10 opacity-0 ${classNames.outline || ''}`}
        style={{
          filter: isDark
            ? 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.75))'
            : 'drop-shadow(0 0 4px rgba(5, 150, 105, 0.5))',
        }}
      >
        <rect
          ref={strokeRectRef}
          x="1"
          y="1"
          rx="15"
          ry="15"
          fill="none"
          stroke={isDark ? '#34d399' : '#059669'}
          strokeWidth="2"
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset="100"
          style={{
            width: 'calc(100% - 2px)',
            height: 'calc(100% - 2px)',
          }}
        />
      </svg>

      {/* 2. Google Identity Services Transparent Overlay (Direct User Click Handler) */}
      {gsiContainerRef && (
        <div
          ref={gsiContainerRef}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full opacity-0 overflow-hidden cursor-pointer z-20 flex items-center justify-center pointer-events-auto [&_iframe]:w-full! [&_iframe]:h-full! [&_iframe]:cursor-pointer!"
        />
      )}

      {/* 3. Left: Rounded Squircle with Official Google 4-Color 'G' Logo */}
      <div className="flex items-center gap-3 sm:gap-3.5 z-0">
        <div
          ref={iconRef}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 ${
            isDark
              ? 'bg-white shadow-xs'
              : 'bg-white border border-slate-200/80 shadow-2xs'
          } ${classNames.iconBox || ''}`}
        >
          {/* Official Google 'G' Multi-Color Vector */}
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.93 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
        </div>

        {/* 4. Center: Typography Label + SSO/OIDC Badge (No subtext per instructions) */}
        <div className="flex items-center gap-2 text-left">
          <span
            className={`font-sans font-bold text-sm sm:text-base tracking-tight leading-none ${
              isDark ? 'text-white' : 'text-slate-900'
            } ${classNames.label || ''}`}
          >
            {isLoading ? 'Verifying with Google…' : label}
          </span>

          {!isLoading && resolvedBadge && (
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold tracking-wide border leading-tight ${
                isDark
                  ? 'bg-emerald-950/70 border-emerald-500/35 text-emerald-400'
                  : 'bg-emerald-50 border-emerald-300/80 text-emerald-700'
              } ${classNames.badge || ''}`}
            >
              {resolvedBadge}
            </span>
          )}
        </div>
      </div>

      {/* 5. Right: Circular Action Icon / Loading Indicator with crisp SVG Arrow */}
      <div
        ref={arrowRef}
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 border transition-all duration-200 z-0 ${
          isDark
            ? 'bg-[#0a291d] border-emerald-500/30 text-emerald-400 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/50'
            : 'bg-slate-100 border-slate-200 text-slate-700 group-hover:bg-slate-200/70 group-hover:border-slate-300'
        } ${classNames.arrowBox || ''}`}
      >
        {isLoading ? (
          <span
            className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
              isDark ? 'border-emerald-400' : 'border-emerald-600'
            }`}
          />
        ) : (
          <svg
            className="w-4 h-4 sm:w-4.5 sm:h-4.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        )}
      </div>
    </div>
  );
};

export default GoogleAuthButton;
