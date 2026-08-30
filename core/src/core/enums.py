"""Domain enums for SETU-DRR.

Single source of truth for all enumeration types across core, pipeline, and API.
"""

from enum import StrEnum


class Hazard(StrEnum):
    """Supported hazard types (PRD §5.1, §6.3)."""
    LANDSLIDE = "landslide"
    FLASH_FLOOD = "flash_flood"
    STORM_SURGE = "storm_surge"
    RIVERINE_FLOOD = "riverine_flood"
    COASTAL_EROSION = "coastal_erosion"
    CLOUDBURST = "cloudburst"


class ZoneClass(StrEnum):
    """Hazard zone classifications (PRD §6.3)."""
    PERMANENT_RED = "permanent_red"
    CAUTION = "caution"
    ACTIVE_ALERT = "active_alert"
    FORECAST_ALERT = "forecast_alert"
    NONE = "none"


class Tier(StrEnum):
    """Four-tier triage categorization for relocation planning (PRD §6.7)."""
    IMMEDIATE = "immediate"
    SHORT_TERM = "short_term"
    MEDIUM_TERM = "medium_term"
    MITIGATE_IN_SITU = "mitigate_in_situ"


class TenureType(StrEnum):
    """Land tenure status for candidate relocation sites (PRD §6.8, FR-7.3)."""
    GOVERNMENT_REVENUE = "government_revenue"
    PRIVATE = "private"
    TENURE_UNVERIFIED = "tenure_unverified"


class BindingConstraint(StrEnum):
    """Binding capacity constraints for destination sites (PRD §6.8)."""
    LAND = "land"
    WATER = "water"
    SCHOOL = "school"
    HEALTH = "health"


class SortMode(StrEnum):
    """Sort modes for prioritized habitation queues (PRD §6.6, FR-6.3)."""
    URGENCY = "urgency"
    CASELOAD = "caseload"


class PipelineRunStatus(StrEnum):
    """Lifecycle statuses for pipeline versioning runs."""
    RUNNING = "RUNNING"
    VALIDATING = "VALIDATING"
    READY = "READY"
    FAILED = "FAILED"
    SUPERSEDED = "SUPERSEDED"


class RunType(StrEnum):
    """Types of pipeline processing executions."""
    FULL = "FULL"
    GRID = "GRID"
    HAZARD_STATIC = "HAZARD_STATIC"
    HAZARD_DYNAMIC = "HAZARD_DYNAMIC"
    EXPOSURE = "EXPOSURE"
    CAPACITY = "CAPACITY"
    ALLOCATION = "ALLOCATION"


class AdminLevel(StrEnum):
    """Administrative hierarchy levels (LGD standard)."""
    COUNTRY = "country"
    STATE = "state"
    DISTRICT = "district"
    SUBDISTRICT = "subdistrict"
    VILLAGE = "village"
