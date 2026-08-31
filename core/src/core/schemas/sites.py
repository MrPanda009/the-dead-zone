"""Pydantic v2 schemas for Candidate Relocation Sites and Carrying Capacity.

Endpoints: GET /habitations/{id}/sites, POST /sites/{id}/capacity
"""

from typing import Optional, List, Dict, Any
from pydantic import Field
from core.enums import BindingConstraint, TenureType
from core.schemas.common import BaseSchema, SCREENING_GRADE_NOTICE


class CapacityBreakdownDTO(BaseSchema):
    cc_land: int = Field(ge=0, description="Households supportable by developable land area.")
    cc_water: int = Field(ge=0, description="Households supportable by sustainable potable water yield.")
    cc_school: int = Field(ge=0, description="Households supportable by spare school capacity within 1 km.")
    cc_health: int = Field(ge=0, description="Households supportable by spare primary health capacity.")
    livelihood_multiplier: float = Field(ge=0.0, le=1.0, description="Multiplier for economic connectivity.")
    cc_final: int = Field(ge=0, description="Binding minimum carrying capacity.")
    binding_constraint: BindingConstraint = Field(description="The limiting capacity bottleneck.")


class AugmentedCapacityDTO(BaseSchema):
    relieved_constraint: BindingConstraint
    augmented_capacity: int = Field(ge=0)
    indicative_intervention: str = Field(description="Recommended engineering intervention.")
    indicative_cost_inr_lakhs: float = Field(ge=0.0, description="Estimated intervention cost in Lakhs INR.")


class CandidateSiteItem(BaseSchema):
    """Candidate site card in ranked destination list (GET /habitations/{id}/sites)."""
    id: int
    distance_km: float = Field(ge=0.0)
    area_ha: float = Field(ge=0.0)
    tenure: TenureType
    slope_mean: float = 0.0
    mhi_max: float = Field(ge=0.0, le=1.0)
    suitability: int = Field(ge=0, le=100, description="Composite suitability score (0-100).")
    capacity: CapacityBreakdownDTO
    augmented: Optional[AugmentedCapacityDTO] = None
    centroid: list[float] = Field(description="[longitude, latitude]")
    screening_grade: str = SCREENING_GRADE_NOTICE


class SiteCapacityOverrideRequest(BaseSchema):
    """Request payload for capacity scenario simulation (POST /sites/{id}/capacity)."""
    plot_area_m2: Optional[float] = Field(default=None, gt=0.0, description="Override plot area per HH.")
    water_lpcd: Optional[int] = Field(default=None, gt=0, description="Override LPCD norm (55 rural, 135 urban).")
    daily_water_yield_liters: Optional[float] = Field(default=None, gt=0.0, description="Override sustainable water yield.")
    spare_school_seats: Optional[int] = Field(default=None, ge=0, description="Override spare school seats.")
    spare_health_capacity_pop: Optional[int] = Field(default=None, ge=0, description="Override spare PHC population.")
    livelihood_multiplier: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Override livelihood multiplier.")


class SiteCapacityOverrideResponse(BaseSchema):
    """Response payload for capacity scenario simulation (POST /sites/{id}/capacity)."""
    site_id: int
    base_capacity: CapacityBreakdownDTO
    scenario_capacity: CapacityBreakdownDTO
    delta_households: int
    augmented_options: List[AugmentedCapacityDTO] = Field(default_factory=list)
    screening_grade: str = SCREENING_GRADE_NOTICE
