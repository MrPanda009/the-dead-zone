"""Pure domain logic for min-cost flow allocation formulation and objective scoring.

Section refs: docs/PRD1.md §6.9, §14.1
"""

from typing import Sequence, Mapping, Any


def compute_assignment_cost(
    distance_km: float,
    priority_score: float,
    suitability: int,
    distance_penalty_weight: float = 1.0,
) -> float:
    """Computes the edge cost for min-cost flow solver.
    
    Maximizing (PS_j * suit_s) - c_js * x_js is equivalent to minimizing
    c_js - (PS_j * suit_s / 100.0) * weight.
    """
    suit_norm = min(max(suitability, 0), 100) / 100.0
    benefit = priority_score * suit_norm
    cost = (distance_km * distance_penalty_weight) - (benefit * 100.0)
    return cost


def validate_allocation_invariants(
    demands: Mapping[int, int],
    capacities: Mapping[int, int],
    assignments: Sequence[Mapping[str, Any]],
) -> list[str]:
    """Validates that assignments do not violate demand or capacity constraints.
    
    Invariants:
    1. sum_s x_js <= demand_j
    2. sum_j x_js <= CC_s
    """
    violations: list[str] = []
    
    # 1. Check demand per habitation
    hab_assigned: dict[int, int] = {}
    site_assigned: dict[int, int] = {}

    for a in assignments:
        h_id = a["habitation_id"]
        s_id = a["site_id"]
        hh = a["households"]

        hab_assigned[h_id] = hab_assigned.get(h_id, 0) + hh
        site_assigned[s_id] = site_assigned.get(s_id, 0) + hh

    for h_id, assigned_hh in hab_assigned.items():
        demand = demands.get(h_id, 0)
        if assigned_hh > demand:
            violations.append(
                f"Habitation {h_id} assigned {assigned_hh} households exceeding demand {demand}."
            )

    for s_id, assigned_hh in site_assigned.items():
        cap = capacities.get(s_id, 0)
        if assigned_hh > cap:
            violations.append(
                f"Site {s_id} assigned {assigned_hh} households exceeding capacity {cap}."
            )

    return violations
