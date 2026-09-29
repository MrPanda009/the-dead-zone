import type { ReactNode } from 'react';

export interface CenterPanelProps {
  children: ReactNode;
  /** Rendered below the main area, e.g. a time slider. */
  footerSlot?: ReactNode;
  className?: string;
  classNames?: {
    root?: string;
    body?: string;
    footer?: string;
  };
}

export const CenterPanel = ({
  children,
  footerSlot,
  className = '',
  classNames = {},
}: CenterPanelProps) => (
  <main
    className={[
      'relative flex h-full w-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
      classNames.root ?? '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <div
      className={[
        'relative flex h-full w-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
        classNames.body ?? '',
      ].join(' ')}
    >
      {children}
    </div>
    {footerSlot ? <div className={classNames.footer}>{footerSlot}</div> : null}
  </main>
);

