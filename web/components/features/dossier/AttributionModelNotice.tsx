import type { ReactNode } from 'react';

export interface AttributionModelNoticeProps {
  /** Model that produced the attributions. */
  attributionModelVersion?: string | null;
  /** Model behind the score shown in the metrics box. */
  scoreModelVersion?: string | null;
  /** Replaces the default explanation. */
  message?: ReactNode;
  className?: string;
  classNames?: {
    root?: string;
    text?: string;
  };
}

/**
 * Warns when the attributions were computed by a different model than the score.
 *
 * Attributions are only faithful to the model that produced them, so after a layer is
 * re-ingested without regenerating them the bars would otherwise explain a score they did
 * not produce. Renders nothing while both versions agree.
 */
export const AttributionModelNotice = ({
  attributionModelVersion,
  scoreModelVersion,
  message,
  className = '',
  classNames = {},
}: AttributionModelNoticeProps) => {
  if (!attributionModelVersion || !scoreModelVersion) return null;
  if (attributionModelVersion === scoreModelVersion) return null;

  return (
    <div
      role="note"
      className={[
        'rounded-xl border border-warning/40 bg-warning/10 px-3 py-2',
        classNames.root ?? '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <p className={['text-[10px] leading-snug text-warning', classNames.text ?? ''].join(' ')}>
        {message ?? (
          <>
            Attributions come from <span className="font-mono">{attributionModelVersion}</span>; the
            score above comes from <span className="font-mono">{scoreModelVersion}</span>. Treat the
            contributions as indicative until they are regenerated.
          </>
        )}
      </p>
    </div>
  );
};
