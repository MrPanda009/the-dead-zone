import { HexMarker } from '@/components/common/HexMarker';
import type { DistrictHazardSummaryDTO } from '@/lib/api/stats';

export type ModelStatusKind = 'loading' | 'error' | 'computed' | 'not_computed';

export interface ModelStatusBadgeProps {
  summary: DistrictHazardSummaryDTO | null;
  isLoading?: boolean;
  hasError?: boolean;
  className?: string;
  classNames?: {
    root?: string;
    label?: string;
  };
}

const TONE: Record<ModelStatusKind, { box: string; marker: string }> = {
  computed: { box: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400', marker: 'bg-emerald-500' },
  not_computed: { box: 'border-amber-500/30 text-amber-600 dark:text-amber-400', marker: 'bg-amber-500' },
  loading: { box: 'border-line text-text-muted', marker: 'bg-text-muted' },
  error: { box: 'border-critical/40 text-critical', marker: 'bg-critical' },
};

export function resolveModelStatus(
  summary: DistrictHazardSummaryDTO | null,
  isLoading: boolean,
  hasError: boolean,
): ModelStatusKind {
  if (isLoading) return 'loading';
  if (hasError || !summary) return 'error';
  return summary.model_status === 'computed' ? 'computed' : 'not_computed';
}

/** Layer status read from the API summary. The label is never a constant. */
export const ModelStatusBadge = ({
  summary,
  isLoading = false,
  hasError = false,
  className = '',
  classNames = {},
}: ModelStatusBadgeProps) => {
  const status = resolveModelStatus(summary, isLoading, hasError);
  const tone = TONE[status];

  const label =
    status === 'computed'
      ? `COMPUTED · ${summary?.model_version ?? 'version unknown'}`
      : status === 'not_computed'
        ? 'NOT COMPUTED'
        : status === 'loading'
          ? 'LOADING'
          : 'STATUS UNAVAILABLE';

  return (
    <div
      className={[
        'hidden sm:flex px-2.5 py-1 rounded-xl glass-card border text-[10px] font-mono items-center gap-1.5',
        tone.box,
        classNames.root ?? '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <HexMarker colorClass={tone.marker} />
      <span className={['font-bold', classNames.label ?? ''].join(' ')}>{label}</span>
    </div>
  );
};
