"""Pure domain logic for carrying capacity assessment, binding constraints, and augmentation.

Section refs: docs/PRD1.md §6.8, §14.1
"""

import math
from typing import Any
from core.constants import (
    AREA_PER_HOUSEHOLD_M2,
    LPCD_RURAL,
    PHC_POP_PLAINS,
    PHC_POP_HILLY_TRIBAL,
)
from core.enums import BindingConstraint


def compute_land_capacity(
    area_developable_m2: float,
    area_per_hh_m2: float = AREA_PER_HOUSEHOLD_M2,
) -> int:
    """Computes land capacity = floor(A_developable / (a_hh * 1.4)).
    
    Norm: 90 m2 plot + 40% infra = 126.0 m2/HH.
    PRD §6.8
    """
    if area_developable_m2 <= 0.0 or area_per_hh_m2 <= 0.0:
        return 0
    return math.floor(area_developable_m2 / area_per_hh_m2)


def compute_water_capacity(
    yield_liters_per_day: float,
    lpcd: int = LPCD_RURAL,
    hh_size: float = 4.5,
) -> int:
    """Computes water capacity = floor(Y_sustainable / (LPCD * HH_size)).
    
    Norm: 55 LPCD rural, 135 LPCD urban sewered (CPHEEO).
    PRD §6.8
    """
    if yield_liters_per_day <= 0.0 or lpcd <= 0 or hh_size <= 0.0:
        return 0
    daily_water_per_hh = lpcd * hh_size
    return math.floor(yield_liters_per_day / daily_water_per_hh)


def compute_school_capacity(
    spare_seats: int,
    children_per_hh: float = 1.2,
) -> int:
    """Computes schooling capacity = floor(spare_seats / children_per_HH).
    
    Norm: UDISE+ enrolment vs sanctioned capacity within 1 km.
    PRD §6.8
    """
    if spare_seats <= 0 or children_per_hh <= 0.0:
        return 0
    return math.floor(spare_seats / children_per_hh)


def compute_health_capacity(
    phc_norm_pop: int = PHC_POP_HILLY_TRIBAL,
    catchment_pop: int = 0,
    hh_size: float = 4.5,
) -> int:
    """Computes health capacity = floor((PHC_norm - catchment_pop) / HH_size).
    
    Norm: 1 PHC per 30,000 plains / 20,000 hilly and tribal (IPHS).
    PRD §6.8
    """
    if hh_size <= 0.0:
        return 0
    spare_health_capacity_pop = max(0, phc_norm_pop - catchment_pop)
    return math.floor(spare_health_capacity_pop / hh_size)


def compute_carrying_capacity(
    cc_land: int,
    cc_water: int,
    cc_school: int,
    cc_health: int,
    livelihood_multiplier: float = 1.0,
) -> tuple[int, BindingConstraint]:
    """Computes final carrying capacity as the strict minimum across all constraints:
    CC(s) = min(CC_land, CC_water, CC_school, CC_health) * mu_livelihood.
    
    Invariant (PRD §1, FR-7.4): Constraints are NEVER averaged.
    """
    c_land = max(0, cc_land)
    c_water = max(0, cc_water)
    c_school = max(0, cc_school)
    c_health = max(0, cc_health)

    constraints = [
        (c_land, BindingConstraint.LAND),
        (c_water, BindingConstraint.WATER),
        (c_school, BindingConstraint.SCHOOL),
        (c_health, BindingConstraint.HEALTH),
    ]

    min_val, binding_constraint = min(constraints, key=lambda x: x[0])
    mu = min(max(livelihood_multiplier, 0.0), 1.0)
    final_cc = math.floor(min_val * mu)

    return final_cc, binding_constraint


def compute_augmented_capacity(
    cc_land: int,
    cc_water: int,
    cc_school: int,
    cc_health: int,
    relieved_constraint: BindingConstraint,
    relieved_value: int,
    livelihood_multiplier: float = 1.0,
) -> tuple[int, BindingConstraint]:
    """Computes capacity if the binding constraint is relieved by targeted investment."""
    c_land = relieved_value if relieved_constraint == BindingConstraint.LAND else max(0, cc_land)
    c_water = relieved_value if relieved_constraint == BindingConstraint.WATER else max(0, cc_water)
    c_school = relieved_value if relieved_constraint == BindingConstraint.SCHOOL else max(0, cc_school)
    c_health = relieved_value if relieved_constraint == BindingConstraint.HEALTH else max(0, cc_health)

    return compute_carrying_capacity(c_land, c_water, c_school, c_health, livelihood_multiplier)
