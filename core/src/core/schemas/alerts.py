"""Pydantic v2 schemas for Active and Forecast Alert Zones.

Endpoints: GET /alerts/active, GET /alerts/forecast
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import Field
from core.enums import DataQuality, ZoneClass
from core.schemas.common import BaseSchema, SCREENING_GRADE_NOTICE


class ActiveAlertItem(BaseSchema):
    """Dynamic alert zone item currently exceeding threshold (GET /alerts/active)."""
    h3: str
    h3_int: int
    res: int
    admin_id: Optional[int] = None
    admin_name: Optional[str] = None
    mhi_live: float = Field(ge=0.0, le=1.0, description="Active live MHI in [0, 1].")
    mhi_static: float = Field(ge=0.0, le=1.0, description="Static baseline MHI.")
    dominant_hazard: str
    trigger_source: Optional[str] = None
    valid_at: Optional[datetime] = None
    age_hours: Optional[float] = Field(default=None, description="Age of dynamic trigger observation in hours.")
    data_quality: Optional[DataQuality] = Field(default=None, description="Data quality / provenance classification.")
    exposed_population: float = 0.0
    exposed_built_area_m2: float = 0.0
    centroid: list[float] = Field(description="[longitude, latitude]")
    screening_grade: str = SCREENING_GRADE_NOTICE


class ForecastAlertItem(BaseSchema):
    """Forecast alert zone item predicted to cross threshold within 72 hours (GET /alerts/forecast)."""
    h3: str
    h3_int: int
    res: int
    admin_id: Optional[int] = None
    admin_name: Optional[str] = None
    mhi_fcst: float = Field(ge=0.0, le=1.0, description="Forecast MHI in [0, 1].")
    mhi_static: float = Field(ge=0.0, le=1.0, description="Static baseline MHI.")
    dominant_hazard: str
    issuing_model: Optional[str] = None
    forecast_cycle_at: Optional[datetime] = None
    valid_at: Optional[datetime] = None
    horizon_hours: int = Field(ge=1, le=72)
    data_quality: Optional[DataQuality] = Field(default=None, description="Data quality / provenance classification.")
    exposed_population: float = 0.0
    centroid: list[float]
    screening_grade: str = SCREENING_GRADE_NOTICE


class ActiveAlertsResponse(BaseSchema):
    total_active_cells: int
    total_exposed_population: int
    issued_at: Optional[datetime] = None
    items: List[ActiveAlertItem] = Field(default_factory=list)


class ForecastAlertsResponse(BaseSchema):
    total_forecast_cells: int
    total_exposed_population: int
    issuing_model: Optional[str] = None
    forecast_cycle_at: Optional[datetime] = None
    horizon_hours: int
    items: List[ForecastAlertItem] = Field(default_factory=list)


class ForecastTriggerRequest(BaseSchema):
    """Payload to trigger an on-demand forecast ingestion cycle."""
    district: Optional[str] = Field(
        default=None,
        description="Target district slug (e.g. 'wayanad', 'barpeta') or null for all operational districts.",
    )
    live: bool = Field(
        default=True,
        description="Fetch live Open-Meteo ECMWF IFS HRES data (False uses mock/offline data).",
    )
    dry_run: bool = Field(
        default=False,
        description="Simulate calculations and envelope detection without persisting database modifications.",
    )


class ForecastTriggerResponse(BaseSchema):
    """Asynchronous acknowledgement for an enqueued forecast ingestion cycle."""
    status: str = Field(default="ACCEPTED", description="Trigger status ('ACCEPTED', 'REJECTED')")
    message: str = Field(description="Operational outcome message")
    run_id: str = Field(description="Unique UUID string identifying the background run")
    target_districts: List[str] = Field(description="List of district slugs targeted in this cycle")
    enqueued_at: datetime = Field(description="Timestamp when the execution task was enqueued")


class DistrictForecastStatus(BaseSchema):
    """Real-time operational weather and forecast status for a registered district."""
    key: str
    name: str
    admin_id: int
    lgd_code: int
    last_cycle_at: Optional[datetime] = None
    danger_cells: int = 0
    weather_state: str = Field(
        description="Operational alert state: 'CLEAR', 'ALERT_ACTIVE', 'STALE', or 'NO_DATA'",
    )


class ForecastPipelineStatusResponse(BaseSchema):
    """System-wide telemetry and scheduler health for multi-district live forecasts."""
    scheduler_enabled: bool
    schedule_cron: str
    is_run_in_progress: bool
    global_latest_cycle_at: Optional[datetime] = None
    districts: List[DistrictForecastStatus] = Field(default_factory=list)

