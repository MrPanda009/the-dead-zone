'use client';

import React, { type ReactNode } from 'react';
import { useLayoutContext } from './ThreePanelLayout';

export interface LeftPanelProps {
  children: ReactNode;
  /** Explicit panel width override in pixels or CSS value. Omit for responsive default. */
  width?: number | string;
  title?: ReactNode;
  onToggleCollapse?: () => void;
  showCollapseButton?: boolean;
  className?: string;
  classNames?: {
    root?: string;
    header?: string;
    scroll?: string;
  };
}

/**
 * Floating glassmorphic Left Panel with integrated collapse button.
 */
export const LeftPanel = ({
  children,
  width,
  title,
  onToggleCollapse,
  showCollapseButton = true,
  className = '',
  classNames = {},
}: LeftPanelProps) => {
  const { toggleLeft } = useLayoutContext();
  const handleCollapse = onToggleCollapse ?? toggleLeft;

  return (
    <aside
      style={width !== undefined ? { width } : undefined}
      className={[
        'relative flex shrink-0 flex-col h-full w-full rounded-2xl border border-line dark:border-[#1e2d45] bg-surface-0/95 dark:bg-[#0c1524]/92 text-ink dark:text-text-primary backdrop-blur-xl shadow-2xl transition-all duration-200 overflow-hidden',
        classNames.root ?? '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Top Header / Retraction bar */}
      <div
        className={[
          'flex items-center justify-between px-3.5 pt-2.5 pb-2 border-b border-line/40 dark:border-white/5',
          classNames.header ?? '',
        ].join(' ')}
      >
        <div className="flex items-center gap-2">
          {title ? (
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-text-primary">
              {title}
            </span>
          ) : (
            <span className="text-[10px] font-mono font-semibold tracking-wider uppercase text-text-muted">
              TERRA · Triage
            </span>
          )}
        </div>
        {showCollapseButton && (
          <button
            type="button"
            onClick={handleCollapse}
            title="Retract Left Panel"
            aria-label="Retract Left Panel"
            className="p-1 rounded-lg text-text-muted hover:text-citron hover:bg-surface-2 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">chevron_left</span>
          </button>
        )}
      </div>

      <div className={['flex-1 overflow-y-auto p-3', classNames.scroll ?? ''].join(' ')}>
        {children}
      </div>
    </aside>
  );
};
