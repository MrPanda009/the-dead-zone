"""Re-exports all Pydantic v2 DTO schemas for SETU-DRR core."""

from core.schemas.common import (
    BaseSchema,
    PaginationParams,
    PaginatedResponse,
    BBoxQuery,
    PointGeometryDTO,
    PolygonGeometryDTO,
    MultiPolygonGeometryDTO,
    SCREENING_GRADE_NOTICE,
)
from core.schemas.zones import (
    FeatureContributionDTO,
    HazardDetailDTO,
    ZoneCellSummary,
    ZoneCellDetail,
)
from core.schemas.habitations import (
    LossEventDTO,
    VulnerabilityBreakdownDTO,
    HabitationListItem,
    HabitationRiskDossier,
)
from core.schemas.sites import (
    CapacityBreakdownDTO,
    AugmentedCapacityDTO,
    CandidateSiteItem,
    SiteCapacityOverrideRequest,
    SiteCapacityOverrideResponse,
)
from core.schemas.allocation import (
    AllocationPlanRequest,
    AllocationAssignmentDTO,
    AllocationPlanResponse,
)
from core.schemas.alerts import (
    ActiveAlertItem,
    ForecastAlertItem,
    ActiveAlertsResponse,
    ForecastAlertsResponse,
)
from core.schemas.scenario import (
    ScenarioWeightOverrideRequest,
    ScenarioHabitationItem,
    ScenarioResponse,
)
from core.schemas.flood import (
    FloodSemanticType,
    CanonicalFloodRecord,
    ValidationReport,
    RowValidationError,
)

__all__ = [
    "BaseSchema",
    "PaginationParams",
    "PaginatedResponse",
    "BBoxQuery",
    "PointGeometryDTO",
    "PolygonGeometryDTO",
    "MultiPolygonGeometryDTO",
    "SCREENING_GRADE_NOTICE",
    "FeatureContributionDTO",
    "HazardDetailDTO",
    "ZoneCellSummary",
    "ZoneCellDetail",
    "LossEventDTO",
    "VulnerabilityBreakdownDTO",
    "HabitationListItem",
    "HabitationRiskDossier",
    "CapacityBreakdownDTO",
    "AugmentedCapacityDTO",
    "CandidateSiteItem",
    "SiteCapacityOverrideRequest",
    "SiteCapacityOverrideResponse",
    "AllocationPlanRequest",
    "AllocationAssignmentDTO",
    "AllocationPlanResponse",
    "ActiveAlertItem",
    "ForecastAlertItem",
    "ActiveAlertsResponse",
    "ForecastAlertsResponse",
    "ScenarioWeightOverrideRequest",
    "ScenarioHabitationItem",
    "ScenarioResponse",
    "FloodSemanticType",
    "CanonicalFloodRecord",
    "ValidationReport",
    "RowValidationError",
]

