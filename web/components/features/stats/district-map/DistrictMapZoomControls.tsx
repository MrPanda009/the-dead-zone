export interface DistrictMapZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  className?: string;
  classNames?: {
    root?: string;
    button?: string;
  };
}

const BUTTON_CLASS =
  'p-2 text-text-secondary hover:text-ink dark:hover:text-white hover:bg-surface-2 dark:hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center cursor-pointer';

export const DistrictMapZoomControls = ({
  onZoomIn,
  onZoomOut,
  className = '',
  classNames = {},
}: DistrictMapZoomControlsProps) => (
  <div
    className={[
      'absolute top-4 right-4 z-30 pointer-events-auto flex flex-col rounded-xl border border-line dark:border-white/10 glass-card text-ink dark:text-white backdrop-blur-xl shadow-xl overflow-hidden select-none',
      classNames.root ?? '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <button
      type="button"
      onClick={onZoomIn}
      className={[BUTTON_CLASS, classNames.button ?? ''].join(' ')}
      title="Zoom in"
      aria-label="Zoom in"
    >
      <span className="material-symbols-outlined text-base">add</span>
    </button>
    <div className="h-px w-full bg-line dark:bg-white/10" />
    <button
      type="button"
      onClick={onZoomOut}
      className={[BUTTON_CLASS, classNames.button ?? ''].join(' ')}
      title="Zoom out"
      aria-label="Zoom out"
    >
      <span className="material-symbols-outlined text-base">remove</span>
    </button>
  </div>
);
