import Link from 'next/link';

import { ThemeToggle } from '@/components/ui/theme-toggle';

import { StatsNavLink } from './StatsNavLink';

export interface StatsTopBarProps {
  className?: string;
  classNames?: {
    root?: string;
    nav?: string;
  };
}

/** App-level navigation bar shown above the Stats tabs. */
export const StatsTopBar = ({ className = '', classNames = {} }: StatsTopBarProps) => (
  <header
    className={[
      'shrink-0 h-12 border-b border-line dark:border-white/10 bg-surface-0/90 dark:bg-[#0c1524]/90 backdrop-blur-xl px-3 sm:px-6 flex items-center justify-between transition-colors z-30',
      classNames.root ?? '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
      <Link href="/" className="flex items-center gap-2 group cursor-pointer" title="Return to Home Overview">
        <span className="material-symbols-outlined text-citron text-xl group-hover:rotate-90 transition-transform">
          emergency
        </span>
        <div className="flex flex-col">
          <span className="text-xs font-mono font-bold tracking-wider text-citron">TERRA</span>
          <span className="text-[9px] font-mono text-text-muted tracking-tight hidden sm:inline">
            TERRAIN RISK &amp; RELOCATION ANALYTICS
          </span>
        </div>
      </Link>
    </div>

    <nav
      className={['hidden lg:flex items-center gap-1 xl:gap-1.5 absolute left-1/2 -translate-x-1/2', classNames.nav ?? ''].join(' ')}
      aria-label="Main App Navigation"
    >
      <StatsNavLink href="/" icon="home" label="Home" title="Home Overview" />
      <StatsNavLink href="/gov" icon="view_in_ar" label="3D & 2D" title="3D Subcontinent & 2D View" />
      <StatsNavLink href="/relocation" icon="moving" label="Relocation" title="Relocation Solver Grid" />
      <StatsNavLink href="/stories" icon="auto_stories" label="Assess" title="Assess & Citizen Advisories" />
      <StatsNavLink href="/stats" icon="query_stats" label="Stats" title="Disaster History & Statistics" isActive />
    </nav>

    <div className="flex items-center gap-2 shrink-0 justify-end">
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-1 dark:bg-forest-surface border border-line dark:border-white/10 text-[11px] font-mono text-text-secondary">
        <span className="material-symbols-outlined text-xs text-citron">location_on</span>
        <span>India</span>
      </div>
      <ThemeToggle />
    </div>
  </header>
);
