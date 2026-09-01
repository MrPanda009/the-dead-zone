"""Pure domain logic for exposure, loss history decay, priority scoring, and triage tiers.

Section refs: docs/PRD1.md §6.6, §6.7, §14.1
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import date
from typing import Any, Mapping, Optional, Sequence

from core.constants import LOSS_HALF_LIFE_YEARS, PRIORITY_GAMMA
from core.enums import SortMode, Tier


@dataclass(frozen=True)
class PriorityScoringConfig:
    """Configurable parameters for policy priority scoring.
    
    Decouples policy decision formulas from underlying ML model predictions.
    """
    hazard_weight: float = 1.0
    exposure_weight: float = 1.0
    vulnerability_weight: float = 1.0
    loss_gamma: float = PRIORITY_GAMMA
    loss_half_life_years: float = LOSS_HALF_LIFE_YEARS
    scoring_version: str = "priority-v1.0"
    formula_type: str = "multiplicative_v1"  # "multiplicative_v1", "linear_additive", "calibrated"

    def calculate_score(
        self,
        hazard_intensity: float,
        pop_fraction_in_prz: float,
        vulnerability_index: float,
        decayed_loss: float = 0.0,
    ) -> float:
        """Calculates normalized priority score PS_j in [0.0, inf)."""
        h = min(max(float(hazard_intensity), 0.0), 1.0) * self.hazard_weight
        f = min(max(float(pop_fraction_in_prz), 0.0), 1.0) * self.exposure_weight
        v = min(max(float(vulnerability_index), 0.0), 1.0) * self.vulnerability_weight
        l = max(float(decayed_loss), 0.0)

        if self.formula_type == "linear_additive":
            base = 0.4 * h + 0.3 * f + 0.3 * v
            score = base * (1.0 + self.loss_gamma * l)
        else:
            # Standard multiplicative formulation (PRD §6.6, FR-6.1)
            base_risk = h * f * v
            score = base_risk * (1.0 + self.loss_gamma * l)

        return round(float(score), 4)


@dataclass(frozen=True)
class TriageRuleConfig:
    """Configurable threshold criteria for triage tier classification."""
    immediate_prz_pop_min: float = 0.60
    immediate_hazard_min: float = 0.85
    mitigate_in_situ_prz_pop_max: float = 0.30
    short_term_prz_overlap_min: float = 30.0
    short_term_priority_min: float = 0.30


@dataclass
class TriageEvaluationResult:
    """Detailed result of triage classification with explanatory rationale."""
    tier: Tier
    rationale: str
    trigger_factors: list[str] = field(default_factory=list)


def compute_time_decayed_loss(
    events: Sequence[Mapping[str, Any]],
    reference_date: date | None = None,
    half_life_years: float = LOSS_HALF_LIFE_YEARS,
) -> float:
    """Computes time-decayed loss history:
    L_hat = sum_i e^(-lambda * (t_now - t_i)) * severity_i
    where lambda = ln(2) / half_life_years.
    
    PRD §6.6, FR-6.2
    """
    if not events:
        return 0.0

    today = reference_date or date.today()
    decay_constant = math.log(2.0) / max(half_life_years, 0.001)
    total_decayed_loss = 0.0

    for ev in events:
        ev_date = ev.get("ts")
        if isinstance(ev_date, str):
            ev_date = date.fromisoformat(ev_date)
        elif not isinstance(ev_date, date):
            continue

        delta_days = (today - ev_date).days
        if delta_days < 0:
            delta_days = 0  # clamp future dates
        delta_years = delta_days / 365.25

        severity = float(ev.get("severity", 1.0))
        weight = math.exp(-decay_constant * delta_years)
        total_decayed_loss += weight * severity

    return round(total_decayed_loss, 4)


def compute_priority_score(
    hazard_intensity: float,
    pop_fraction_in_prz: float,
    vulnerability_index: float,
    decayed_loss: float = 0.0,
    gamma: float = PRIORITY_GAMMA,
    config: Optional[PriorityScoringConfig] = None,
) -> float:
    """Computes habitation priority score:
    PS_j = (h_hat_j * f_hat_j * V_hat_j) * (1 + gamma * L_hat_j).
    
    PRD §6.6, FR-6.1
    """
    cfg = config or PriorityScoringConfig(loss_gamma=gamma)
    return cfg.calculate_score(
        hazard_intensity=hazard_intensity,
        pop_fraction_in_prz=pop_fraction_in_prz,
        vulnerability_index=vulnerability_index,
        decayed_loss=decayed_loss,
    )


def classify_triage_tier(
    has_prz_overlap: bool,
    active_deformation: bool = False,
    fatal_event_last_3_monsoons: bool = False,
    pop_fraction_in_prz: float = 0.0,
    hazard_intensity: float = 0.0,
    priority_score: float = 0.0,
    has_active_trigger: bool = False,
    in_situ_cost_cheaper: bool = False,
    is_caution_with_adverse_trend: bool = False,
    rules: Optional[TriageRuleConfig] = None,
) -> Tier:
    """Classifies a habitation into one of 4 permanent triage tiers.
    
    IMPORTANT ARCHITECTURAL INVARIANT:
    Active Alert Zones and Forecast Alert Zones (has_active_trigger) do NOT alter
    the permanent relocation tier. Permanent relocation is determined strictly by
    chronic/static risk, structural deformation, and past fatal recurrence.
    Active alerts dictate immediate emergency evacuation, never permanent resettlement.
    
    Rules (PRD §6.7):
    - Immediate (0-6 mo): PRZ overlap AND (active ground deformation OR fatal event in last 3 monsoons OR (f_j > 0.6 AND h_j > 0.85))
    - Mitigate in situ: Small PRZ fraction (< 0.30) where slope stabilisation / embankment / drainage costs less than relocation
    - Short-term (6-24 mo): Significant PRZ overlap or high priority score (PS >= 0.3)
    - Medium-term (2-5 yr): Caution Zone with adverse trend or moderate exposure
    """
    cfg = rules or TriageRuleConfig()

    # 1. Mitigate in situ check (PRD FR-6.5: mandatory tier to recommend against relocation when feasible)
    if in_situ_cost_cheaper and pop_fraction_in_prz < cfg.mitigate_in_situ_prz_pop_max:
        return Tier.MITIGATE_IN_SITU

    # 2. Immediate Relocation (PRD FR-6.4)
    # Permanent Red Zone overlap combined with severe chronic markers
    if has_prz_overlap and (
        active_deformation
        or fatal_event_last_3_monsoons
        or (pop_fraction_in_prz > cfg.immediate_prz_pop_min and hazard_intensity > cfg.immediate_hazard_min)
    ):
        return Tier.IMMEDIATE

    # 3. Short-term Relocation (6-24 months)
    if has_prz_overlap or priority_score >= cfg.short_term_priority_min:
        return Tier.SHORT_TERM

    # 4. Medium-term Relocation (2-5 years)
    if is_caution_with_adverse_trend:
        return Tier.MEDIUM_TERM

    return Tier.MEDIUM_TERM


def evaluate_triage_with_rationale(
    has_prz_overlap: bool,
    active_deformation: bool = False,
    fatal_event_last_3_monsoons: bool = False,
    pop_fraction_in_prz: float = 0.0,
    hazard_intensity: float = 0.0,
    priority_score: float = 0.0,
    in_situ_cost_cheaper: bool = False,
    is_caution_with_adverse_trend: bool = False,
    rules: Optional[TriageRuleConfig] = None,
) -> TriageEvaluationResult:
    """Evaluates triage tier and provides detailed audit rationale."""
    tier = classify_triage_tier(
        has_prz_overlap=has_prz_overlap,
        active_deformation=active_deformation,
        fatal_event_last_3_monsoons=fatal_event_last_3_monsoons,
        pop_fraction_in_prz=pop_fraction_in_prz,
        hazard_intensity=hazard_intensity,
        priority_score=priority_score,
        in_situ_cost_cheaper=in_situ_cost_cheaper,
        is_caution_with_adverse_trend=is_caution_with_adverse_trend,
        rules=rules,
    )

    factors = []
    if tier == Tier.IMMEDIATE:
        if active_deformation:
            factors.append("Active ground deformation detected in settlement footprint")
        if fatal_event_last_3_monsoons:
            factors.append("Fatal mass-wasting event recorded within the last 3 monsoons")
        if pop_fraction_in_prz > 0.6 and hazard_intensity > 0.85:
            factors.append("Critical exposure (>60% population in PRZ with severe hazard intensity >0.85)")
        rationale = (
            "Immediate permanent relocation required (0-6 months): "
            + "; ".join(factors)
        )
    elif tier == Tier.MITIGATE_IN_SITU:
        factors.append("PRZ exposure under 30% and in-situ engineering stabilization costs less than relocation")
        rationale = "Mitigate in-situ: Civil mitigation (embankment/retaining wall) recommended over physical relocation."
    elif tier == Tier.SHORT_TERM:
        if has_prz_overlap:
            factors.append("Permanent Red Zone (PRZ) boundary overlap")
        if priority_score >= 0.3:
            factors.append(f"High composite priority score ({priority_score:.2f} >= 0.30)")
        rationale = (
            "Short-term planned relocation required (6-24 months): "
            + "; ".join(factors)
        )
    else:
        factors.append("Moderate multi-hazard exposure within Caution Zone")
        rationale = "Medium-term monitoring and risk mitigation (2-5 years): Caution zone with moderate exposure."

    return TriageEvaluationResult(tier=tier, rationale=rationale, trigger_factors=factors)


def sort_habitations(
    habitations: list[dict[str, Any]],
    mode: SortMode = SortMode.URGENCY,
) -> list[dict[str, Any]]:
    """Sorts habitation records by Urgency (PS_j DESC) or Caseload (PS_j * pop DESC).
    
    Stable ordering: score DESC, id ASC.
    PRD §6.6, FR-6.3
    """
    def sort_key(h: dict[str, Any]) -> tuple[float, int]:
        ps = float(h.get("priority_score", 0.0))
        pop = int(h.get("population", 0))
        score = ps if mode == SortMode.URGENCY else (ps * pop)
        h_id = int(h.get("id", 0))
        return (-score, h_id)

    return sorted(habitations, key=sort_key)


class PriorityScoringEngine:
    """Orchestrates habitation risk prioritization, factor extraction, and triage."""

    def __init__(
        self,
        scoring_config: Optional[PriorityScoringConfig] = None,
        triage_config: Optional[TriageRuleConfig] = None,
    ) -> None:
        self.scoring_config = scoring_config or PriorityScoringConfig()
        self.triage_config = triage_config or TriageRuleConfig()

    def evaluate_habitation(
        self,
        hazard_intensity: float,
        pop_fraction_in_prz: float,
        vulnerability_index: float,
        decayed_loss: float = 0.0,
        population: int = 0,
        active_deformation: bool = False,
        fatal_event_last_3_monsoons: bool = False,
        in_situ_cost_cheaper: bool = False,
        is_caution_with_adverse_trend: bool = False,
    ) -> dict[str, Any]:
        """Evaluates priority score, caseload, triage tier, and factors for a habitation."""
        has_prz = pop_fraction_in_prz > 0.0 or (pop_fraction_in_prz * 100.0) >= self.triage_config.short_term_prz_overlap_min

        ps = self.scoring_config.calculate_score(
            hazard_intensity=hazard_intensity,
            pop_fraction_in_prz=pop_fraction_in_prz,
            vulnerability_index=vulnerability_index,
            decayed_loss=decayed_loss,
        )
        caseload = round(ps * max(population, 0), 2)

        triage_res = evaluate_triage_with_rationale(
            has_prz_overlap=has_prz,
            active_deformation=active_deformation,
            fatal_event_last_3_monsoons=fatal_event_last_3_monsoons,
            pop_fraction_in_prz=pop_fraction_in_prz,
            hazard_intensity=hazard_intensity,
            priority_score=ps,
            in_situ_cost_cheaper=in_situ_cost_cheaper,
            is_caution_with_adverse_trend=is_caution_with_adverse_trend,
            rules=self.triage_config,
        )

        factors = [
            {"factor": "PRZ Built-up Exposure", "weight": round(pop_fraction_in_prz, 2), "method": "heuristic"},
            {"factor": "Vulnerability Index", "weight": round(vulnerability_index, 2), "method": "heuristic"},
            {"factor": "Hazard Intensity", "weight": round(hazard_intensity, 2), "method": "heuristic"},
            {"factor": "Historical Loss Decay", "weight": round(decayed_loss, 2), "method": "heuristic"},
        ]

        return {
            "priority_score": ps,
            "caseload_score": caseload,
            "tier": triage_res.tier,
            "triage_rationale": triage_res.rationale,
            "contributing_factors": factors,
            "scoring_version": self.scoring_config.scoring_version,
        }
