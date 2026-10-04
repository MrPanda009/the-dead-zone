import type { DistrictHazardSummaryDTO } from '@/lib/api/stats';
import { FLOOD_MODEL_INPUTS } from '@/lib/stats/copy';
import { formatInteger } from '@/lib/stats/format';
import {
  AT_RISK_THRESHOLD,
  driverRowsFromSummary,
  highSharePct,
  isComputed,
} from '@/lib/stats/derive';

import { NotComputedNotice } from '../../NotComputedNotice';
import { DecisionPromptCard } from './DecisionPromptCard';
import { DriverBreakdownList } from './DriverBreakdownList';
import { HighShareGauge } from './HighShareGauge';
import { StatTile } from './StatTile';
import { UnavailableStatTile } from './UnavailableStatTile';

export interface BriefDossierBodyProps {
  summary: DistrictHazardSummaryDTO;
  districtName: string;
  className?: string;
}

function coverageLine(summary: DistrictHazardSummaryDTO): string | null {
  if (!summary.coverage) return null;
  const { full, low_coverage, no_coverage } = summary.coverage;
  return `${formatInteger(full)} measured · ${formatInteger(low_coverage)} partial · ${formatInteger(no_coverage)} unmeasured (never counted as safe)`;
}

/** Dossier content for a loaded summary. Computed and not-computed districts render differently. */
export const BriefDossierBody = ({ summary, districtName, className = '' }: BriefDossierBodyProps) => {
  if (!isComputed(summary)) {
    return (
      <div className={['space-y-2.5', className].join(' ')}>
        <NotComputedNotice districtName={districtName} />
        <DecisionPromptCard prompt={summary.officer_decision_prompt} />
      </div>
    );
  }

  return (
    <div className={['space-y-2.5', className].join(' ')}>
      <HighShareGauge value={highSharePct(summary)} />

      <div className="grid grid-cols-2 gap-2 shrink-0">
        <StatTile
          icon="home"
          label="Habitations at risk"
          value={formatInteger(summary.habitations_at_risk_count)}
          valueClassName="text-rose-500"
          caption={`In cells with susceptibility ≥ ${AT_RISK_THRESHOLD.toFixed(2)}`}
        />
        <StatTile
          icon="groups"
          label="Population at risk"
          value={formatInteger(summary.population_at_risk_sum)}
          valueClassName="text-amber-500"
          caption="Same cells, WorldPop dasymetric"
        />
        <UnavailableStatTile icon="local_hospital" label="Nearest PHC" />
        <UnavailableStatTile icon="construction" label="Infrastructure damage" />
      </div>

      <DecisionPromptCard prompt={summary.officer_decision_prompt} coverageLine={coverageLine(summary) ?? undefined} />

      <DriverBreakdownList rows={driverRowsFromSummary(summary.drivers_summary)} />

      <div className="pt-1.5 border-t border-line dark:border-white/10 text-[9px] font-mono text-text-muted space-y-0.5">
        <div>Model: {summary.model_version ?? 'version unknown'}</div>
        <div>Inputs: {FLOOD_MODEL_INPUTS}</div>
      </div>
    </div>
  );
};
