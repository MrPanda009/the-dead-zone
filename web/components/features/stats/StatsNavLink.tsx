import Link from 'next/link';
import type { ReactNode } from 'react';

export interface StatsNavLinkProps {
  href: string;
  label: ReactNode;
  /** Material Symbols icon name. */
  icon: string;
  title?: string;
  isActive?: boolean;
  className?: string;
  classNames?: {
    root?: string;
    icon?: string;
  };
}

const BASE =
  'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors cursor-pointer';
const IDLE =
  'text-text-secondary hover:text-text-primary hover:bg-surface-1 dark:hover:bg-white/5 border-line dark:border-white/10';
const ACTIVE = 'text-citron bg-citron/10 border-citron/40 font-bold shadow-sm';

export const StatsNavLink = ({
  href,
  label,
  icon,
  title,
  isActive = false,
  className = '',
  classNames = {},
}: StatsNavLinkProps) => (
  <Link
    href={href}
    title={title}
    className={[BASE, isActive ? ACTIVE : IDLE, classNames.root ?? '', className].filter(Boolean).join(' ')}
  >
    <span className={['material-symbols-outlined text-xs', classNames.icon ?? ''].join(' ')}>{icon}</span>
    <span>{label}</span>
  </Link>
);
