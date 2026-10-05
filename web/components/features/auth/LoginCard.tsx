'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useAuth } from '@/components/providers/AuthProvider';
import { useTheme } from '@/components/providers';
import { ApiError } from '@/lib/api/client';
import { GoogleAuthButton } from './GoogleAuthButton';

export interface LoginCardProps {
  /** Target link for returning to overview (default '/') */
  overviewHref?: string;
  /** Target link for Government Official login (default '/gov') */
  govHref?: string;
  /** Target link for Citizen Portal (default '/stories') */
  citizenHref?: string;
  /** Optional callback on successful login with authenticated role */
  onLoginSuccess?: (role: string) => void;
  /** Custom root className */
  className?: string;
}

interface DemoAccountPreset {
  id: string;
  label: string;
  sublabel: string;
  email: string;
  pass: string;
  roleBadge: string;
}

const DEMO_PRESETS: DemoAccountPreset[] = [
  {
    id: 'government',
    label: 'Government',
    sublabel: 'National Operations • All districts',
    email: 'gov@setu.gov.in',
    pass: 'DemoOfficer123!',
    roleBadge: 'OFFICIAL',
  },
  {
    id: 'civilian',
    label: 'Citizen Demo',
    sublabel: 'Civilian • Public',
    email: 'civilian@setu.gov.in',
    pass: 'DemoCivilian123!',
    roleBadge: 'CIVILIAN',
  },
];

export const LoginCard: React.FC<LoginCardProps> = ({
  overviewHref = '/',
  govHref = '/gov',
  citizenHref = '/stories',
  onLoginSuccess,
  className = '',
}) => {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState<string>('gov@setu.gov.in');
  const [password, setPassword] = useState<string>('DemoOfficer123!');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useGSAP(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current,
      { x: -50, opacity: 0, scale: 0.97 },
      { x: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out' }
    );
  }, { scope: containerRef });

  const handleGoogleSuccess = useCallback(
    async (idToken: string) => {
      setIsGoogleSubmitting(true);
      setErrorMessage(null);
      try {
        const user = await loginWithGoogle(idToken);
        onLoginSuccess?.(user.role);

        if (user.role === 'GOVERNMENT_OFFICIAL' || user.role === 'SYSTEM_ADMIN') {
          router.push(govHref);
        } else {
          router.push(citizenHref);
        }
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 401) {
            setErrorMessage('Google token verification failed. Please ensure your Google email is verified.');
          } else if (err.status === 403) {
            setErrorMessage('Your account is deactivated. Please contact an administrator.');
          } else {
            setErrorMessage(err.message || 'Google authentication failed.');
          }
        } else {
          setErrorMessage('Unable to reach authentication service.');
        }

        if (containerRef.current) {
          gsap.fromTo(
            containerRef.current,
            { x: -8 },
            { x: 8, duration: 0.08, repeat: 4, yoyo: true, ease: 'sine.inOut' }
          );
        }
      } finally {
        setIsGoogleSubmitting(false);
      }
    },
    [citizenHref, govHref, loginWithGoogle, onLoginSuccess, router],
  );

  const initGoogleButton = useCallback(() => {
    if (typeof window === 'undefined') return;
    const google = (window as unknown as {
      google?: {
        accounts?: {
          id?: {
            initialize: (config: Record<string, unknown>) => void;
            renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
          };
        };
      };
    })?.google;

    if (google?.accounts?.id && googleBtnRef.current) {
      const clientId =
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
        '152789341851-s03pjajoa86gqa0ir5ansl3tim2b9595.apps.googleusercontent.com';

      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential?: string }) => {
          if (response?.credential) {
            handleGoogleSuccess(response.credential);
          }
        },
      });

      // Clear previous button contents before re-rendering (e.g. on theme switch)
      googleBtnRef.current.innerHTML = '';

      google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard',
        theme: resolvedTheme === 'dark' ? 'filled_black' : 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 320,
        logo_alignment: 'left',
      });
    }
  }, [handleGoogleSuccess, resolvedTheme]);

  useEffect(() => {
    initGoogleButton();
  }, [initGoogleButton]);

  const applyPreset = (preset: DemoAccountPreset) => {
    setEmail(preset.email);
    setPassword(preset.pass);
    setErrorMessage(null);

    // Subtle GSAP highlight on inputs
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current.querySelectorAll('.auth-input'),
        { backgroundColor: 'rgba(163, 230, 53, 0.15)' },
        { backgroundColor: '', duration: 0.5, ease: 'power2.out' }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isGoogleSubmitting) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const user = await login({ email, password });
      onLoginSuccess?.(user.role);

      if (user.role === 'GOVERNMENT_OFFICIAL' || user.role === 'SYSTEM_ADMIN') {
        router.push(govHref);
      } else {
        router.push(citizenHref);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setErrorMessage('Invalid credentials. Please verify your email and password.');
        } else if (err.status === 422) {
          setErrorMessage('Please enter a valid email address and password.');
        } else if (err.status === 429) {
          setErrorMessage('Too many login attempts. Please wait 60 seconds before retrying.');
        } else {
          setErrorMessage(err.message || 'Authentication failed. Please try again.');
        }
      } else {
        setErrorMessage('Unable to reach authentication service.');
      }

      // Haptic shake animation on failure
      if (containerRef.current) {
        gsap.fromTo(
          containerRef.current,
          { x: -8 },
          { x: 8, duration: 0.08, repeat: 4, yoyo: true, ease: 'sine.inOut' }
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`w-full max-w-xl p-5 sm:p-6 lg:p-7 xl:p-8 rounded-[24px] bg-surface-0/95 dark:bg-forest-surface/95 border border-line dark:border-white/15 shadow-2xl relative z-20 backdrop-blur-2xl transition-colors duration-200 ${className}`}
    >
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initGoogleButton}
      />

      {/* Top Header Pill */}
      <div className="flex items-center justify-between mb-3.5 sm:mb-4.5">
        <span className="pill-badge px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-mono font-semibold text-accent-emerald-bright border border-accent-emerald/30 bg-accent-emerald/10 flex items-center gap-2 shadow-xs">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-accent-emerald-bright animate-ping" />
          <span>TERRA · Terrain Risk &amp; Relocation Analytics</span>
        </span>
        <Link
          href={overviewHref}
          className="text-xs font-mono text-text-muted hover:text-text-primary transition-colors flex items-center gap-1.5 cursor-pointer py-1 px-2.5 rounded-lg hover:bg-surface-2 dark:hover:bg-white/5"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Overview</span>
        </Link>
      </div>

      {/* Title & Subtitle */}
      <div className="mb-4 sm:mb-5">
        <h2 className="font-display text-xl sm:text-2xl xl:text-3xl font-extrabold text-ink dark:text-text-primary tracking-tight leading-tight">
          Sign In to Portal
        </h2>
        <p className="text-xs sm:text-xs xl:text-sm text-text-secondary mt-1 sm:mt-1.5 leading-relaxed font-sans">
          Official portal for disaster response officials, district administrators, and public safety teams.
        </p>
      </div>

      {/* Google OAuth Single Sign-On */}
      <div className="mb-4 sm:mb-5">
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            <span>ENCRYPTED MESH GATEWAY</span>
          </span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-semibold">
            INSTANT HANDOFF
          </span>
        </div>

        <GoogleAuthButton
          gsiContainerRef={googleBtnRef}
          isLoading={isGoogleSubmitting}
          onClick={() => {
            if (typeof window !== 'undefined') {
              const google = (window as unknown as {
                google?: {
                  accounts?: {
                    id?: {
                      prompt: () => void;
                    };
                  };
                };
              })?.google;
              google?.accounts?.id?.prompt();
            }
          }}
        />

        {/* Subtle Divider */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-line dark:border-white/10" />
          </div>
          <span className="relative bg-surface-0/95 dark:bg-forest-surface/95 px-3 text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Or Use Account Credentials
          </span>
        </div>
      </div>

      {/* Demo Quick-Fill Presets */}
      <div className="mb-4 sm:mb-5">
        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Fast Access Presets (Click to Fill)
          </span>
          <span className="text-[10px] font-mono text-accent-emerald-bright">
            Pre-configured
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
          {DEMO_PRESETS.map((p) => {
            const isSelected = email === p.email;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className={`text-left p-2.5 sm:p-3 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                  isSelected
                    ? 'bg-citron/15 border-citron text-ink dark:text-text-primary shadow-xs ring-1 ring-citron/40'
                    : 'bg-surface-1/80 dark:bg-forest-deep/60 hover:bg-surface-2 dark:hover:bg-forest-deep border-line dark:border-white/10 text-text-secondary hover:text-ink dark:hover:text-text-primary'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-xs font-bold truncate">{p.label}</span>
                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-surface-2 dark:bg-white/10 text-text-muted">
                    {p.roleBadge}
                  </span>
                </div>
                <span className="block text-[10px] sm:text-[11px] text-text-muted truncate mt-0.5 sm:mt-1">
                  {p.sublabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5 animate-fadeIn">
          <span className="material-symbols-outlined text-base shrink-0 mt-0.5">
            error
          </span>
          <span className="leading-snug">{errorMessage}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
        <div>
          <label
            htmlFor="auth-email"
            className="block text-xs font-mono font-medium text-text-secondary mb-1 sm:mb-1.5"
          >
            Official Email Address
          </label>
          <div className="relative">
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="officer@terra.gov.in"
              className="auth-input w-full px-3.5 py-2 sm:py-2.5 rounded-xl bg-surface-1 dark:bg-forest-deep/80 border border-line dark:border-white/10 focus:border-citron focus:ring-1 focus:ring-citron/30 focus:outline-none text-xs sm:text-sm text-ink dark:text-text-primary font-mono transition-colors"
            />
            <span className="material-symbols-outlined absolute right-3 top-2 sm:top-2.5 text-text-muted text-base sm:text-lg pointer-events-none">
              badge
            </span>
          </div>
        </div>

        <div>
          <label
            htmlFor="auth-password"
            className="block text-xs font-mono font-medium text-text-secondary mb-1 sm:mb-1.5"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="auth-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="auth-input w-full px-3.5 py-2 sm:py-2.5 rounded-xl bg-surface-1 dark:bg-forest-deep/80 border border-line dark:border-white/10 focus:border-citron focus:ring-1 focus:ring-citron/30 focus:outline-none text-xs sm:text-sm text-ink dark:text-text-primary font-mono transition-colors"
            />
            <span className="material-symbols-outlined absolute right-3 top-2 sm:top-2.5 text-text-muted text-base sm:text-lg pointer-events-none">
              lock
            </span>
          </div>
        </div>

        <button
          ref={submitBtnRef}
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-1.5 sm:mt-2 py-2.5 sm:py-3 px-4 rounded-xl bg-citron text-forest-dark font-display font-bold text-xs sm:text-sm shadow-md hover:brightness-105 active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-forest-dark border-t-transparent rounded-full animate-spin" />
              <span>Authenticating…</span>
            </>
          ) : (
            <>
              <span>Sign In to Portal</span>
              <span className="material-symbols-outlined text-base sm:text-lg">arrow_forward</span>
            </>
          )}
        </button>
      </form>

      {/* Footer Security Notice */}
      <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-line dark:border-white/[0.08] flex items-center justify-between text-[10px] sm:text-[11px] text-text-muted font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald-bright" />
          <span>GovCloud Secure Session</span>
        </span>
        <span>AES-256 / TLS 1.3</span>
      </div>
    </div>
  );
};

export default LoginCard;
