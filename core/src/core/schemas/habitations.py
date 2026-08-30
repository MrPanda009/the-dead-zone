"""Pydantic v2 schemas for Habitations, Prioritized Queues, and Risk Dossiers.

Endpoints: GET /habitations, GET /habitations/{id}/risk, GET /habitations/{id}/sites
"""

from typing import Optional, List, Dict, Any
from datetime import date
from pydantic import Field
from core.enums import Tier
from core.schemas.common import BaseSchema, SCREENING_GRADE_NOTICE


class LossEventDTO(BaseSchema):
    id: int
    ts: date
    hazard_type: str
    fatalities: int = 0
    injured: int = 0
    houses_damaged: int = 0
    severity: float = 1.0
    source: str
    source_ref: Optional[str] = None


class VulnerabilityBreakdownDTO(BaseSchema):
    v_demographic: float = Field(ge=0.0, le=1.0)
    v_structural: float = Field(ge=0.0, le=1.0)
    v_access: float = Field(ge=0.0, le=1.0)
    v_economic: float = Field(ge=0.0, le=1.0)
    v_index: float = Field(ge=0.0, le=1.0)
    is_district_flat: bool = False


class HabitationListItem(BaseSchema):
    """Item in prioritized habitation triage queue (GET /habitations)."""
    id: int
    lgd_code: Optional[int] = None
    name: str
    type: str = "village"
    admin_id: Optional[int] = None
    admin_name: Optional[str] = None
    population: int = 0
    households: int = 0
    priority_score: float = Field(description="Per-capita urgency score PS_j.")
    caseload_score: float = Field(description="Caseload urgency score PS_j * population.")
    tier: Tier = Field(description="Four-tier triage category.")
    prz_overlap_pct: float = Field(ge=0.0, le=100.0, description="Percentage of built area inside PRZ.")
    dominant_hazard: str = "landslide"
    centroid: list[float] = Field(description="[longitude, latitude]")


class HabitationRiskDossier(BaseSchema):
    """Full risk dossier for a single habitation (GET /habitations/{id}/risk)."""
    id: int
    lgd_code: Optional[int] = None
    name: str
    type: str = "village"
    admin_id: Optional[int] = None
    admin_name: Optional[str] = None
    population: int
    households: int
    centroid: list[float]

    # Prioritization & Triage
    priority_score: float
    caseload_score: float
    tier: Tier
    triage_rationale: str
    prz_overlap_pct: float
    hazard_intensity: float
    decayed_loss_score: float

    # Risk Components
    vulnerability: VulnerabilityBreakdownDTO
    past_disasters: List[LossEventDTO] = Field(default_factory=list)
    top_contributing_factors: List[dict[str, Any]] = Field(default_factory=list)

    screening_grade: str = SCREENING_GRADE_NOTICE
