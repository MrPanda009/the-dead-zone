"""FastAPI Route Handlers for Habitations Triage Queue and Risk Dossiers (L5).

Endpoints:
- GET /habitations?admin=&tier=&sort=&limit=&offset=
- GET /habitations/{id}/risk
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session

from api.dependencies import get_db
from api.services.habitations_service import HabitationsService
from core.enums import Tier, SortMode
from core.schemas.common import PaginatedResponse
from core.schemas.habitations import HabitationListItem, HabitationRiskDossier

router = APIRouter(prefix="/habitations", tags=["Habitations & Triage"])


@router.get(
    "",
    response_model=PaginatedResponse[HabitationListItem],
    summary="Get prioritized habitation triage queue",
    description=(
        "Returns a paginated list of habitations ranked by Per-Capita Urgency or Caseload. "
        "Supports filtering by Administrative Boundary (LGD Code) and 4-tier Triage Category."
    ),
)
def get_habitations(
    admin: Optional[int] = Query(
        None,
        description="Filter by Administrative Unit ID or LGD Code (e.g. 555 for Wayanad)",
    ),
    tier: Optional[Tier] = Query(
        None,
        description="Filter by Triage Tier (Immediate, Short-term, Medium-term, Mitigate in situ)",
    ),
    sort: SortMode = Query(
        SortMode.URGENCY,
        description="Ranking mode: 'urgency' (PS_j) or 'caseload' (PS_j * population)",
    ),
    limit: int = Query(
        50,
        description="Number of records per page (max 200).",
        ge=1,
        le=200,
    ),
    offset: int = Query(
        0,
        description="Pagination offset.",
        ge=0,
    ),
    db: Session = Depends(get_db),
) -> PaginatedResponse[HabitationListItem]:
    service = HabitationsService(db)
    return service.get_habitations(
        admin=admin,
        tier=tier,
        sort=sort,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{id}/risk",
    response_model=HabitationRiskDossier,
    summary="Get complete risk dossier for a habitation",
    description="Retrieves vulnerability breakdown (SoVI), time-decayed loss history, and priority score explanation.",
)
def get_habitation_risk_dossier(
    id: int = Path(
        ...,
        description="Habitation ID (integer primary key).",
        example=1,
    ),
    db: Session = Depends(get_db),
) -> HabitationRiskDossier:
    service = HabitationsService(db)
    return service.get_habitation_risk_dossier(id)
