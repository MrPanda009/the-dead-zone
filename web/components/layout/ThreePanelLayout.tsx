'use client';

import React, { useState, type ReactNode } from 'react';

export interface LayoutContextValue {
  isLeftCollapsed: boolean;
  toggleLeft: () => void;
  isRightCollapsed: boolean;
  toggleRight: () => void;
  isTopCollapsed: boolean;
  toggleTop: () => void;
}

export const LayoutContext = React.createContext<LayoutContextValue>({
  isLeftCollapsed: false,
  toggleLeft: () => {},
  isRightCollapsed: false,
  toggleRight: () => {},
  isTopCollapsed: false,
  toggleTop: () => {},
});

export const useLayoutContext = () => React.useContext(LayoutContext);

export interface ThreePanelLayoutProps {
  header?: ReactNode;
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  /** Persistent notice rail pinned to the bottom (screening grade, attribution). */
  footer?: ReactNode;
  /** Controlled collapse states or internal state */
  isLeftCollapsed?: boolean;
  onToggleLeftCollapse?: () => void;
  isRightCollapsed?: boolean;
  onToggleRightCollapse?: () => void;
  isTopCollapsed?: boolean;
  onToggleTopCollapse?: () => void;
  className?: string;
  classNames?: {
    root?: string;
    body?: string;
    left?: string;
    center?: string;
    right?: string;
    header?: string;
  };
}

/**
 * Tactical Command Center App Shell:
 * Supports retractable Top Panel, Left Panel, and Right Panel with smooth transitions
 * and floating reopen edge tabs for maximum GIS / 3D map workspace area.
 */
export const ThreePanelLayout: React.FC<ThreePanelLayoutProps> = ({
  header,
  left,
  center,
  right,
  footer,
  isLeftCollapsed: controlledLeftCollapsed,
  onToggleLeftCollapse,
  isRightCollapsed: controlledRightCollapsed,
  onToggleRightCollapse,
  isTopCollapsed: controlledTopCollapsed,
  onToggleTopCollapse,
  className = '',
  classNames = {},
}) => {
  const [internalLeftCollapsed, setInternalLeftCollapsed] = useState(false);
  const [internalRightCollapsed, setInternalRightCollapsed] = useState(false);
  const [internalTopCollapsed, setInternalTopCollapsed] = useState(false);

  const isLeftCollapsed =
    controlledLeftCollapsed !== undefined ? controlledLeftCollapsed : internalLeftCollapsed;
  const toggleLeft =
    onToggleLeftCollapse ?? (() => setInternalLeftCollapsed((prev) => !prev));

  const isRightCollapsed =
    controlledRightCollapsed !== undefined ? controlledRightCollapsed : internalRightCollapsed;
  const toggleRight =
    onToggleRightCollapse ?? (() => setInternalRightCollapsed((prev) => !prev));

  const isTopCollapsed =
    controlledTopCollapsed !== undefined ? controlledTopCollapsed : internalTopCollapsed;
  const toggleTop =
    onToggleTopCollapse ?? (() => setInternalTopCollapsed((prev) => !prev));

  return (
    <LayoutContext.Provider
      value={{
        isLeftCollapsed,
        toggleLeft,
        isRightCollapsed,
        toggleRight,
        isTopCollapsed,
        toggleTop,
      }}
    >
      <div
        className={[
          'relative flex h-dvh h-screen w-full flex-col overflow-hidden bg-bg-base dark:bg-[#070c14] text-ink dark:text-text-primary select-none p-2 gap-2',
          classNames.root ?? '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* 1. Retractable Top Panel Header */}
        {header && (
          <div
            className={[
              'relative z-30 shrink-0 w-full transition-all duration-300 ease-in-out',
              isTopCollapsed
                ? 'max-h-0 -translate-y-full opacity-0 pointer-events-none overflow-hidden'
                : 'max-h-20 translate-y-0 opacity-100',
              classNames.header ?? '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {header}
          </div>
        )}

        {/* Floating Reopen Button when Header is Retracted */}
        {header && isTopCollapsed && (
          <button
            type="button"
            onClick={toggleTop}
            title="Expand Top Command Panel"
            aria-label="Expand Top Command Panel"
            className="fixed top-2 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1 rounded-full bg-surface-0/95 dark:bg-[#0c1524]/95 border border-line dark:border-[#1e2d45] text-xs font-mono text-ink dark:text-citron flex items-center gap-1.5 shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer backdrop-blur-xl"
          >
            <span className="material-symbols-outlined text-sm animate-bounce">expand_more</span>
            <span className="font-bold tracking-wider text-[11px]">TERRA CONSOLE</span>
          </button>
        )}

        {/* 2. Side-by-side Main Workspace Row (Left Panel, Center Map, Right Panel) — Zero Overlap */}
        <div
          className={[
            'relative z-10 flex min-h-0 flex-1 w-full gap-2 overflow-hidden',
            classNames.body ?? '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {/* Floating Reopen Handle for Left Panel (When Collapsed) */}
          {isLeftCollapsed && (
            <button
              type="button"
              onClick={toggleLeft}
              title="Expand Left Panel"
              aria-label="Expand Left Panel"
              className="fixed left-2 top-1/2 -translate-y-1/2 z-40 w-7 h-14 rounded-r-xl bg-surface-0/95 dark:bg-[#0c1524]/95 border border-l-0 border-line dark:border-[#1e2d45] text-ink dark:text-citron hover:text-accent flex items-center justify-center shadow-2xl hover:w-8.5 transition-all cursor-pointer backdrop-blur-xl active:scale-95 group"
            >
              <span className="material-symbols-outlined text-lg group-hover:translate-x-0.5 transition-transform">
                chevron_right
              </span>
            </button>
          )}

          {/* Left Column (Retractable Floating Card) */}
          <div
            className={[
              'relative z-20 flex h-full shrink-0 flex-col transition-all duration-300 ease-in-out',
              isLeftCollapsed
                ? 'w-0 max-w-0 opacity-0 overflow-hidden pointer-events-none -translate-x-6'
                : 'w-[290px] xl:w-[320px] 2xl:w-[350px] opacity-100 translate-x-0',
              classNames.left ?? '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {left}
          </div>

          {/* Center Column (Map / 3D Canvas) — Dedicated bounded container with clean border */}
          <div
            className={[
              'relative z-10 flex-1 min-w-0 h-full flex flex-col rounded-2xl border border-line dark:border-[#1e2d45] bg-surface-0 dark:bg-[#060b13] overflow-hidden shadow-2xl transition-all duration-300',
              classNames.center ?? '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {center}
          </div>

          {/* Right Column (Retractable Floating Card) */}
          <div
            className={[
              'relative z-20 flex h-full shrink-0 flex-col transition-all duration-300 ease-in-out',
              isRightCollapsed
                ? 'w-0 max-w-0 opacity-0 overflow-hidden pointer-events-none translate-x-6'
                : 'w-[310px] xl:w-[340px] 2xl:w-[380px] opacity-100 translate-x-0',
              classNames.right ?? '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {right}
          </div>

          {/* Floating Reopen Handle for Right Panel (When Collapsed) */}
          {isRightCollapsed && (
            <button
              type="button"
              onClick={toggleRight}
              title="Expand Right Panel"
              aria-label="Expand Right Panel"
              className="fixed right-2 top-1/2 -translate-y-1/2 z-40 w-7 h-14 rounded-l-xl bg-surface-0/95 dark:bg-[#0c1524]/95 border border-r-0 border-line dark:border-[#1e2d45] text-ink dark:text-citron hover:text-accent flex items-center justify-center shadow-2xl hover:w-8.5 transition-all cursor-pointer backdrop-blur-xl active:scale-95 group"
            >
              <span className="material-symbols-outlined text-lg group-hover:-translate-x-0.5 transition-transform">
                chevron_left
              </span>
            </button>
          )}
        </div>

        {/* 3. Optional Footer */}
        {footer && (
          <div className="relative z-20 shrink-0 w-full">
            {footer}
          </div>
        )}
      </div>
    </LayoutContext.Provider>
  );
};

export default ThreePanelLayout;
