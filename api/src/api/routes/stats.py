"""FastAPI route handlers for Historical Disaster Losses and Statistics.

Endpoints:
- GET /stats/states
- GET /stats/disasters?state=&from_year=&to_year=
- GET /stats/disasters/comparison?state1=&state2=
- GET /stats/case-studies?slug=
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from api.dependencies import get_db
from api.routes.common import error_responses
from api.services.stats_service import StatsService
from core.schemas.stats import (
    AvailableStatesResponse,
    DisasterCaseStudyDTO,
    DisasterStatsResponse,
    StateDisasterComparisonDTO,
)

router = APIRouter(
    prefix="/stats",
    tags=["Disaster History & Statistics"],
    responses=error_responses(400, 404, 422, 500, 503),
)


@router.get(
    "/states",
    response_model=AvailableStatesResponse,
    summary="List states with published historical disaster records",
)
def list_available_states(db: Session = Depends(get_db)) -> AvailableStatesResponse:
    return StatsService(db).list_states()


@router.get(
    "/disasters",
    response_model=DisasterStatsResponse,
    summary="Get historical disaster loss time-series and NCRB hazard breakdowns",
    description=(
        "Returns chained annual disaster losses (lives, cattle, houses, crop area), "
        "NCRB Forces of Nature casualty breakdown by hazard, CWC flood damage records, "
        "MoRTH highway damage, and SDRF/NDRF relief allocation curves."
    ),
)
def get_disaster_stats(
    state: str = Query("Assam", description="State name (e.g. 'Assam', 'Rajasthan', 'Kerala', 'Madhya Pradesh')."),
    from_year: int = Query(2014, ge=2000, le=2030, description="Start year filter."),
    to_year: int = Query(2024, ge=2000, le=2030, description="End year filter."),
    db: Session = Depends(get_db),
) -> DisasterStatsResponse:
    return StatsService(db).get_disaster_stats(state=state, from_year=from_year, to_year=to_year)


@router.get(
    "/disasters/comparison",
    response_model=StateDisasterComparisonDTO,
    summary="Compare historical disaster impact between two states",
    description="Compares cumulative fatalities, housing loss, crop damages, and dominant hazard killers.",
)
def compare_disaster_stats(
    state1: str = Query("Assam", description="First state to compare."),
    state2: str = Query("Kerala", description="Second state to compare."),
    db: Session = Depends(get_db),
) -> StateDisasterComparisonDTO:
    return StatsService(db).compare_states(state1=state1, state2=state2)


@router.get(
    "/case-studies",
    response_model=List[DisasterCaseStudyDTO],
    summary="List curated landmark disaster event case studies",
    description="Returns detailed geotechnical context, casualty records, and response agency actions.",
)
def list_case_studies(
    slug: Optional[str] = Query(None, description="Optional case study slug filter (e.g. 'manipur-noney-landslide-2022')."),
    db: Session = Depends(get_db),
) -> List[DisasterCaseStudyDTO]:
    return StatsService(db).list_case_studies(slug=slug)
