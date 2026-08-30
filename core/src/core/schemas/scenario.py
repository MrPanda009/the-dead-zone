"""Pydantic v2 schemas for Scenario Simulation and Sensitivity Analysis.

Endpoint: POST /scenario
"""

from typing import Optional, List, Dict, Any
from pydantic import Field
from core.enums import Hazard, Tier, SortMode
from core.schemas.common import BaseSchema, SCREENING_GRADE_NOTICE


class ScenarioWeightOverrideRequest(BaseSchema):
    """Request payload for scenario simulation with custom weights and parameters (POST /scenario)."""
    admin_id: Optional[int] = Field(default=None, description="Scope simulation to specific administrative boundary.")
    hazard_weights: Optional[Dict[Hazard, float]] = Field(
        default=None,
        description="Override hazard union weights w_h (e.g. {'landslide': 1.0, 'flash_flood': 0.8}).",
    )
    priority_gamma: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=2.0,
        description="Override loss history amplifier gamma (default 0.5).",
    )
    sort_mode: SortMode = Field(
        default=SortMode.URGENCY,
        description="Sort by urgency (PS_j) or caseload (PS_j * pop).",
    )
    limit: int = Field(default=50, ge=1, le=500)


class ScenarioHabitationItem(BaseSchema):
    habitation_id: int
    name: str
    original_rank: int
    scenario_rank: int
    rank_delta: int = Field(description="Positive means rose in priority, negative dropped.")
    original_priority_score: float
    scenario_priority_score: float
    original_tier: Tier
    scenario_tier: Tier
    tier_changed: bool
    population: int


class ScenarioResponse(BaseSchema):
    """Response payload for scenario simulation (POST /scenario)."""
    admin_id: Optional[int] = None
    total_habitations_evaluated: int
    total_tier_shifts: int
    applied_weights: Dict[str, float]
    applied_gamma: float
    sort_mode: SortMode
    items: List[ScenarioHabitationItem] = Field(default_factory=list)
    screening_grade: str = SCREENING_GRADE_NOTICE
