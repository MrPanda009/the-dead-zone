import type { DatasetProvenanceItem } from './types';

export interface ProvenanceTableRowProps {
  row: DatasetProvenanceItem;
  integratedLabel?: string;
  notIntegratedLabel?: string;
  className?: string;
  classNames?: {
    root?: string;
    name?: string;
    badge?: string;
  };
}

/** One dataset in the provenance table. `integrated` means loaded in our database, not a live feed. */
export const ProvenanceTableRow = ({
  row,
  integratedLabel = 'IN PLATFORM',
  notIntegratedLabel = 'NOT INTEGRATED',
  className = '',
  classNames = {},
}: ProvenanceTableRowProps) => (
  <tr className={['hover:bg-surface-2/40 dark:hover:bg-white/5 transition-colors group', classNames.root ?? '', className].filter(Boolean).join(' ')}>
    <td className={['py-2.5 px-4 font-bold text-ink dark:text-white', classNames.name ?? ''].join(' ')}>
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 bg-surface-2 dark:bg-white/10 flex items-center justify-center text-citron shrink-0"
          style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
        >
          <span className="material-symbols-outlined text-xs">{row.icon}</span>
        </div>
        <span className="group-hover:text-citron transition-colors text-xs">{row.dataset}</span>
      </div>
    </td>
    <td className="py-2.5 px-3 text-text-secondary text-[11px]">{row.ministry}</td>
    <td className="py-2.5 px-3 text-text-secondary font-medium text-[11px]">{row.years}</td>
    <td className="py-2.5 px-3 text-text-muted text-[11px]">{row.granularity}</td>
    <td className="py-2.5 px-3 text-[11px] text-text-secondary">{row.freshness}</td>
    <td className="py-2.5 px-4 text-text-muted text-[10px] leading-tight max-w-xs">{row.limitations}</td>
    <td className="py-2.5 px-3 text-center">
      {row.integrated ? (
        <span className={['inline-flex items-center whitespace-nowrap px-1.5 py-0.5 rounded-md bg-citron/15 text-citron text-[9px] font-bold border border-citron/30', classNames.badge ?? ''].join(' ')}>
          {integratedLabel}
        </span>
      ) : (
        <span className={['inline-flex items-center whitespace-nowrap px-1.5 py-0.5 rounded-md bg-surface-2 dark:bg-white/5 text-text-muted text-[9px]', classNames.badge ?? ''].join(' ')}>
          {notIntegratedLabel}
        </span>
      )}
    </td>
  </tr>
);
