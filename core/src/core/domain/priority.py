"""Pure domain logic for exposure, loss history decay, priority scoring, and triage tiers.

Section refs: docs/PRD1.md §6.6, §6.7, §14.1
"""

import math
from typing import Any, Mapping, Sequence
from datetime import date
from core.constants import PRIORITY_GAMMA, LOSS_HALF_LIFE_YEARS
from core.enums import Tier, SortMode


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
    decay_constant = math.log(2.0) / half_life_years
    total_decayed_loss = 0.0

    for ev in events:
        ev_date = ev.get("ts")
        if isinstance(ev_date, str):
            ev_date = date.fromisoformat(ev_date)
        elif not isinstance(ev_date, date):
            continue

        delta_days = (today - ev_date).days
        if delta_days < 0:
            delta_days = 0
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
) -> float:
    """Computes habitation priority score:
    PS_j = (h_hat_j * f_hat_j * V_hat_j) * (1 + gamma * L_hat_j).
    
    PRD §6.6, FR-6.1
    """
    h = min(max(hazard_intensity, 0.0), 1.0)
    f = min(max(pop_fraction_in_prz, 0.0), 1.0)
    v = min(max(vulnerability_index, 0.0), 1.0)
    l = max(decayed_loss, 0.0)

    base_risk = h * f * v
    score = base_risk * (1.0 + gamma * l)
    return round(score, 4)


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
) -> Tier:
    """Classifies a habitation into one of 4 triage tiers.
    
    Rules (PRD §6.7):
    - Immediate (0-6 mo): PRZ overlap AND (active ground deformation OR fatal event in last 3 monsoons OR (f_j > 0.6 AND h_j > 0.85))
    - Mitigate in situ: Small PRZ fraction where slope stabilisation / embankment / drainage costs less than relocation
    - Short-term (6-24 mo): Significant PRZ overlap, high priority score, no active trigger
    - Medium-term (2-5 yr): Caution Zone with adverse trend
    """
    # 1. Mitigate in situ check (PRD FR-6.5: mandatory tier to recommend against relocation when feasible)
    if in_situ_cost_cheaper and pop_fraction_in_prz < 0.3:
        return Tier.MITIGATE_IN_SITU

    # 2. Immediate Relocation
    if has_prz_overlap and (
        active_deformation
        or fatal_event_last_3_monsoons
        or (pop_fraction_in_prz > 0.6 and hazard_intensity > 0.85)
    ):
        return Tier.IMMEDIATE

    # 3. Short-term Relocation
    if has_prz_overlap or priority_score >= 0.3:
        return Tier.SHORT_TERM

    # 4. Medium-term Relocation
    if is_caution_with_adverse_trend:
        return Tier.MEDIUM_TERM

    return Tier.MEDIUM_TERM


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
