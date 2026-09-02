"""Service layer for Active and Forecast Alert Zones (Day 6).

Section refs: docs/PRD1.md §6.3, §8.2, §14.1 (FR-3.10, FR-3.12, FR-3.15)
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session

from api.repositories.alerts_repo import AlertsRepository
from core.constants import (
    ACTIVE_ALERT_MHI_LIVE,
    FORECAST_HORIZON_HOURS,
    PRZ_MHI_STATIC,
    SCREENING_GRADE_NOTICE,
)
from core.errors import InvalidParametersError
from core.h3_utils import h3_to_str
from core.schemas.alerts import (
    ActiveAlertItem,
    ActiveAlertsResponse,
    ForecastAlertItem,
    ForecastAlertsResponse,
)

logger = logging.getLogger("setu_api.alerts_service")


class AlertsService:
    """Business logic for serving active trigger alerts and forecast threshold crossings."""

    def __init__(self, db: Session) -> None:
        self.repo = AlertsRepository(db)

    def get_active_alerts(
        self,
        admin_id: Optional[int] = None,
        min_mhi: float = ACTIVE_ALERT_MHI_LIVE,
        dominant_hazard: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> ActiveAlertsResponse:
        """Retrieves currently active dynamic alert cells exceeding MHI >= 0.75."""
        clamped_limit = min(max(limit, 1), 500)
        clamped_offset = max(offset, 0)

        records, total_cells, total_pop = self.repo.query_active_alerts(
            admin_id=admin_id,
            min_mhi=min_mhi,
            dominant_hazard=dominant_hazard,
            limit=clamped_limit,
            offset=clamped_offset,
        )

        items: list[ActiveAlertItem] = []
        for r in records:
            h_int = r["h3"]
            h_str = h3_to_str(h_int)
            mhi_live = float(r.get("mhi_live") or 0.0)
            mhi_static = float(r.get("mhi_static") or 0.0)

            items.append(
                ActiveAlertItem(
                    h3=h_str,
                    h3_int=h_int,
                    res=r["res"],
                    admin_id=r.get("admin_id"),
                    admin_name=r.get("admin_name"),
                    mhi_live=round(mhi_live, 4),
                    mhi_static=round(mhi_static, 4),
                    dominant_hazard=r.get("dominant_hazard") or "landslide",
                    trigger_source="IMERG Early / Live Ingestion",
                    valid_at=r.get("valid_at") or datetime.now(timezone.utc),
                    exposed_population=round(float(r.get("population") or 0.0), 2),
                    exposed_built_area_m2=round(float(r.get("built_area_m2") or 0.0), 2),
                    centroid=[r["lon"], r["lat"]],
                    screening_grade=SCREENING_GRADE_NOTICE,
                )
            )

        return ActiveAlertsResponse(
            total_active_cells=total_cells,
            total_exposed_population=total_pop,
            issued_at=datetime.now(timezone.utc),
            items=items,
        )

    def get_forecast_alerts(
        self,
        horizon_hours: int = 72,
        admin_id: Optional[int] = None,
        min_mhi: float = ACTIVE_ALERT_MHI_LIVE,
        limit: int = 100,
        offset: int = 0,
    ) -> ForecastAlertsResponse:
        """Retrieves forecast alert cells predicted to cross threshold within horizon (max 72h).
        
        Enforces FR-3.12 / FR-3.15: Horizon must be between 1 and 72 hours.
        """
        if horizon_hours < 1 or horizon_hours > FORECAST_HORIZON_HOURS:
            raise InvalidParametersError(
                f"Forecast horizon {horizon_hours}h is outside supported bounds [1, {FORECAST_HORIZON_HOURS}]."
            )

        clamped_limit = min(max(limit, 1), 500)
        clamped_offset = max(offset, 0)

        records, total_cells, total_pop = self.repo.query_forecast_alerts(
            admin_id=admin_id,
            min_mhi=min_mhi,
            horizon_hours=horizon_hours,
            limit=clamped_limit,
            offset=clamped_offset,
        )

        now_utc = datetime.now(timezone.utc)
        items: list[ForecastAlertItem] = []

        for r in records:
            h_int = r["h3"]
            h_str = h3_to_str(h_int)
            mhi_fcst = float(r.get("mhi_fcst") or 0.0)
            mhi_static = float(r.get("mhi_static") or 0.0)

            items.append(
                ForecastAlertItem(
                    h3=h_str,
                    h3_int=h_int,
                    res=r["res"],
                    admin_id=r.get("admin_id"),
                    admin_name=r.get("admin_name"),
                    mhi_fcst=round(mhi_fcst, 4),
                    mhi_static=round(mhi_static, 4),
                    dominant_hazard=r.get("dominant_hazard") or "landslide",
                    issuing_model="ECMWF Open Data",
                    forecast_cycle_at=now_utc,
                    valid_at=r.get("valid_at") or now_utc,
                    horizon_hours=horizon_hours,
                    exposed_population=round(float(r.get("population") or 0.0), 2),
                    centroid=[r["lon"], r["lat"]],
                    screening_grade=SCREENING_GRADE_NOTICE,
                )
            )

        return ForecastAlertsResponse(
            total_forecast_cells=total_cells,
            total_exposed_population=total_pop,
            issuing_model="ECMWF Open Data",
            forecast_cycle_at=now_utc,
            horizon_hours=horizon_hours,
            items=items,
        )
