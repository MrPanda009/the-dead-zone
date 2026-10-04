export interface BriefDossierSkeletonProps {
  className?: string;
  classNames?: {
    root?: string;
    block?: string;
  };
}

/** Placeholder shaped like the dossier body while the summary loads. */
export const BriefDossierSkeleton = ({ className = '', classNames = {} }: BriefDossierSkeletonProps) => {
  const block = ['rounded-xl bg-surface-2 dark:bg-white/10', classNames.block ?? ''].join(' ');
  return (
    <div aria-busy className={['animate-pulse space-y-2.5', classNames.root ?? '', className].filter(Boolean).join(' ')}>
      <div className={`h-20 ${block}`} />
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-16 ${block}`} />
        ))}
      </div>
      <div className={`h-16 ${block}`} />
      <div className={`h-28 ${block}`} />
    </div>
  );
};
