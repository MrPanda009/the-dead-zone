"""Pydantic v2 schemas for the Historical Disaster Statistics API.

Endpoints:
- GET /stats/disasters
- GET /stats/disasters/comparison
- GET /stats/case-studies
- GET /stats/states
"""

from typing import Any, List, Optional
from pydantic import Field

from core.schemas.common import BaseSchema


class HistoricalLossDTO(BaseSchema):
    """Annual loss tally from MHA / Rajya Sabha reports."""

    year_label: str = Field(description="Fiscal or monsoon year string, e.g. '2019-20'.")
    year_start: int
    year_end: int
    lives_lost: int = 0
    cattle_lost: int = 0
    houses_damaged: int = 0
    crop_area_affected_ha: float = 0.0
    hazard_types_included: str = "Floods/Landslides"
    source_uuid: str
    source_title: str
    source_ministry: str
    data_quality_notes: Optional[str] = None


class NcrbHazardCasualtyDTO(BaseSchema):
    """Accidental deaths categorized by natural hazard trigger (NCRB Forces of Nature)."""

    calendar_year: int
    landslide_deaths: int = 0
    flash_flood_deaths: int = 0
    flood_deaths: int = 0
    cloudburst_deaths: int = 0
    cyclone_deaths: int = 0
    avalanche_deaths: int = 0
    lightning_deaths: int = 0
    cold_heat_wave_deaths: int = 0
    other_nature_deaths: int = 0
    total_deaths: int
    source_uuid: str


class CwcFloodDamageDTO(BaseSchema):
    """CWC recorded flood losses and economic damages."""

    calendar_year: int
    area_affected_mha: float = 0.0
    population_affected_m: float = 0.0
    human_lives_lost: int = 0
    cattle_lost: int = 0
    houses_damaged_count: int = 0
    total_damage_crores: float = 0.0
    source_uuid: str


class HighwayDisasterDamageDTO(BaseSchema):
    """Damaged National Highways reported to MoRTH."""

    state_name: str
    reporting_period: str
    damaged_length_km: float
    disaster_triggers: str = "Heavy Rain / Landslide / Flood"
    source_uuid: str


class ReliefAllocationDTO(BaseSchema):
    """SDRF and NDRF disaster response allocations and lives saved."""

    fiscal_year: str
    sdrf_central_share_cr: float = 0.0
    sdrf_state_share_cr: float = 0.0
    ndrf_releases_cr: float = 0.0
    lives_saved_count: int = 0
    source_uuid: str


class DisasterStatsResponse(BaseSchema):
    """Complete disaster history dossier for a state (GET /stats/disasters)."""

    state_name: str
    period_start: int
    period_end: int
    loss_time_series: List[HistoricalLossDTO] = Field(default_factory=list)
    ncrb_hazard_breakdown: List[NcrbHazardCasualtyDTO] = Field(default_factory=list)
    cwc_flood_history: List[CwcFloodDamageDTO] = Field(default_factory=list)
    highway_damage: Optional[HighwayDisasterDamageDTO] = None
    response_funding: List[ReliefAllocationDTO] = Field(default_factory=list)
    data_caveats: List[str] = Field(
        default_factory=lambda: [
            "MHA annual figures aggregate multiple hazard triggers (floods, heavy rains, landslides, cyclones) and cannot be attributed solely to landslides.",
            "Missing years reflect unrecorded/unpublished annual reports in the open data portal, not zero damage.",
            "NCRB casualties record confirmed fatalities only; missing and displaced populations are tracked separately by state revenue departments.",
            "Landslide scores in other views are illustrative models; past recorded events describe where slides previously occurred, not deterministic future locations.",
        ]
    )


class StateLossSummary(BaseSchema):
    state_name: str
    total_lives_lost: int = 0
    total_houses_damaged: int = 0
    total_cattle_lost: int = 0
    total_crop_area_ha: float = 0.0
    dominant_hazard_killer: str = "Flood / Heavy Rain"
    avg_annual_deaths: float = 0.0


class StateDisasterComparisonDTO(BaseSchema):
    """Comparative analysis between two states or state vs national."""

    state1: StateLossSummary
    state2: StateLossSummary
    comparison_period: str
    insights: List[str] = Field(default_factory=list)


class DisasterCaseStudyDTO(BaseSchema):
    """Detailed geotechnical and operational profile for landmark disaster events."""

    slug: str
    title: str
    disaster_type: str
    state_name: str
    location_name: str
    event_date: str
    fatalities: int = 0
    injured: int = 0
    missing: int = 0
    compensation_cr: float = 0.0
    summary: str
    geotechnical_context: Optional[str] = None
    response_actions: List[dict[str, Any]] = Field(default_factory=list)
    source_refs: List[dict[str, Any]] = Field(default_factory=list)


class AvailableStatesResponse(BaseSchema):
    """States with published historical disaster records."""

    states: List[str]
    default_state: str = "Assam"
