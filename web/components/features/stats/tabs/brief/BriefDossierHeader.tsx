import { HexMarker } from '@/components/common/HexMarker';

import type { StatsDistrict } from '../../types';

export interface BriefDossierHeaderProps {
  district: StatsDistrict;
  className?: string;
  classNames?: {
    root?: string;
    eyebrow?: string;
    name?: string;
    code?: string;
  };
}

export const BriefDossierHeader = ({ district, className = '', classNames = {} }: BriefDossierHeaderProps) => (
  <div
    className={[
      'flex items-center justify-between border-b border-line dark:border-white/10 pb-2 shrink-0',
      classNames.root ?? '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <div>
      <div className={['text-[9px] font-mono uppercase tracking-wider text-citron font-bold flex items-center gap-1', classNames.eyebrow ?? ''].join(' ')}>
        <HexMarker />
        <span>DISTRICT DOSSIER</span>
      </div>
      <h2 className={['font-display text-base sm:text-lg font-bold text-ink dark:text-white mt-0.5', classNames.name ?? ''].join(' ')}>
        {district.name} ({district.state})
      </h2>
    </div>
    <div className="text-right">
      <span className="text-[10px] font-mono text-text-muted block">LGD Code</span>
      <span className={['text-xs font-mono font-bold text-ink dark:text-white', classNames.code ?? ''].join(' ')}>
        #{district.lgdCode}
      </span>
    </div>
  </div>
);
