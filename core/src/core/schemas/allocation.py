"""Pydantic v2 schemas for Relocation Allocation Optimization.

Endpoint: POST /plan/allocate
"""

from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import Field
from core.enums import Tier
from core.schemas.common import BaseSchema, SCREENING_GRADE_NOTICE


class AllocationPlanRequest(BaseSchema):
    """Request payload for min-cost flow allocation solver (POST /plan/allocate)."""
    admin_id: Optional[int] = Field(default=None, description="Scope solver to specific administrative boundary (LGD/ID).")
    max_search_radius_km: float = Field(default=15.0, gt=0.0, le=100.0, description="Max allowed relocation distance.")
    target_tiers: List[Tier] = Field(
        default_factory=lambda: [Tier.IMMEDIATE, Tier.SHORT_TERM],
        description="Tiers included in this relocation budget allocation.",
    )
    allow_group_splits: bool = Field(
        default=True,
        description="Whether a village household group may split across multiple candidate sites.",
    )
    distance_penalty_weight: float = Field(
        default=1.0,
        ge=0.0,
        description="Cost penalty weight per kilometer of distance from source habitation.",
    )


class AllocationAssignmentDTO(BaseSchema):
    habitation_id: int
    habitation_name: str
    site_id: int
    site_distance_km: float
    households: int
    tier: Tier
    priority_score: float
    site_suitability: Optional[int] = Field(
        default=None,
        ge=0,
        le=100,
        description="Composite suitability score (0-100, None if unassigned/provisional).",
    )
    has_group_split: bool = False
    split_details: Optional[str] = None


class AllocationPlanResponse(BaseSchema):
    """Response payload for min-cost flow allocation solver (POST /plan/allocate)."""
    allocation_run_id: UUID
    status: str = "COMPLETED"
    admin_id: Optional[int] = None
    total_demand_households: int
    total_relocated_households: int
    unmet_demand_households: int
    solver_latency_ms: float
    assignments: List[AllocationAssignmentDTO] = Field(default_factory=list)
    group_split_warnings: List[str] = Field(default_factory=list)
    screening_grade: str = SCREENING_GRADE_NOTICE
