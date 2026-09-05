"""FastAPI Route Handlers for Candidate Relocation Sites & Capacity Simulations (L5).

Endpoints:
- POST /sites/{id}/capacity
- GET /sites/{id}
"""

import uuid
from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from api.dependencies import get_db, require_serving_version, require_permission
from api.routes.common import error_responses
from api.services.sites_service import SitesService
from core.db_models import AppUser
from core.domain.authorization import Permission
from core.schemas.sites import (
    CandidateSiteDetail,
    SiteCapacityOverrideRequest,
    SiteCapacityOverrideResponse,
)

router = APIRouter(prefix="/sites", tags=["Candidate Sites & Capacity"])


@router.post(
    "/{id}/capacity",
    response_model=SiteCapacityOverrideResponse,
    responses=error_responses(401, 403, 404, 422, 500, 503),
    summary="Recompute candidate site carrying capacity with overridden policy norms",
    description=(
        "Simulates carrying capacity under modified policy parameters (e.g. plot area, LPCD, spare school/health capacity). "
        "Returns the baseline capacity, scenario capacity, net delta in supportable households, and augmented relief options. "
        "Requires authenticated user with 'capacity.recompute' permission (Government Official)."
    ),
)
def recompute_site_capacity(
    id: int = Path(
        ...,
        description="Candidate Site ID (integer primary key).",
        examples=[1],
    ),
    payload: SiteCapacityOverrideRequest = ...,
    db: Session = Depends(get_db),
    _current_user: AppUser = Depends(require_permission(Permission.CAPACITY_RECOMPUTE)),
    _sv: uuid.UUID = Depends(require_serving_version),
) -> SiteCapacityOverrideResponse:
    service = SitesService(db)
    return service.recompute_site_capacity(id, payload)


@router.get(
    "/{id}",
    response_model=CandidateSiteDetail,
    responses=error_responses(404, 422, 500, 503),
    summary="Get candidate site detail by ID",
    description="Retrieves full candidate relocation site profile including GeoJSON polygon geometry and resource capacity breakdown.",
)
def get_site_detail(
    id: int = Path(
        ...,
        description="Candidate Site ID (integer primary key).",
        examples=[1],
    ),
    db: Session = Depends(get_db),
    _sv: uuid.UUID = Depends(require_serving_version),
) -> CandidateSiteDetail:
    service = SitesService(db)
    return service.get_candidate_site_detail(id)
