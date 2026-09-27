"""FastAPI Route Handlers for Candidate Relocation Sites & Capacity Simulations (L5).

Endpoints:
- POST /sites/{id}/capacity
- GET /sites/{id}
"""

import uuid
from typing import Any, Optional
from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session

from api.dependencies import (
    get_db,
    require_serving_version,
    require_permission,
    get_site_district_admin_id,
    is_national_scope_user,
)
from api.repositories.sites_repo import SitesRepository
from api.routes.common import error_responses
from api.services.sites_service import SitesService
from core.db_models import AppUser
from core.domain.authorization import Permission, has_jurisdiction
from core.errors import ForbiddenError, SiteNotFoundError
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
        "Requires authenticated user with 'capacity.recompute' permission (Government Official) and authorized jurisdiction scope."
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
    national = is_national_scope_user(_current_user)
    if _current_user.admin_id is None and not national:
        raise ForbiddenError("User has no administrative jurisdiction assigned.")

    # 1. Verify site existence first to preserve 404 contract
    sites_repo = SitesRepository(db)
    site_record = sites_repo.get_candidate_site_by_id(id)
    if not site_record:
        raise SiteNotFoundError(id)

    # 2. Resolve candidate site's authoritative district boundary. A national-scope
    #    operator may recompute capacity for any district's site; a district official
    #    is confined to sites inside their own boundary.
    if not national:
        site_district_id = get_site_district_admin_id(db, id)
        if not has_jurisdiction(_current_user.admin_id, site_district_id):
            raise ForbiddenError("Candidate site is outside user's assigned administrative jurisdiction.")

    # 3. Execute domain service
    service = SitesService(db)
    return service.recompute_site_capacity(id, payload)


@router.get(
    "/facilities/health",
    responses=error_responses(422, 500, 503),
    summary="Get spatial healthcare facilities GeoJSON",
    description="Returns GeoJSON FeatureCollection of primary and secondary healthcare facilities with IPHS norms and flood safety flags.",
)
def get_health_facilities_geojson(
    admin: Optional[int] = Query(None, description="Administrative boundary ID or LGD code to filter facilities."),
    facility_type: Optional[str] = Query(None, description="Filter by facility type ('sub_cen', 'phc', 'chc')."),
    db: Session = Depends(get_db),
    _sv: uuid.UUID = Depends(require_serving_version),
) -> dict[str, Any]:
    from sqlalchemy import text
    import json

    where_clauses = ["hf.is_active = TRUE", "hf.is_physical = TRUE"]
    params: dict[str, Any] = {}

    if admin is not None:
        where_clauses.append("(hf.admin_id = :admin_id OR ab.lgd_code = :admin_id)")
        params["admin_id"] = admin

    if facility_type:
        where_clauses.append("hf.facility_type = :facility_type")
        params["facility_type"] = facility_type.lower().strip()

    where_sql = " AND ".join(where_clauses)

    query = text(f"""
        SELECT 
            hf.id,
            hf.nin_n,
            hf.name,
            hf.facility_type,
            hf.norm_population,
            ST_AsGeoJSON(hf.geom) AS geojson_geom,
            COALESCE(hsf.mean_inundation_frequency, 0.0) AS inundation_freq,
            COALESCE(hsf.mean_hand_m, 10.0) AS hand_m,
            CASE 
                WHEN (hsf.mean_inundation_frequency >= 0.25 OR hsf.mean_hand_m < 1.0) THEN FALSE 
                ELSE TRUE 
            END AS is_flood_safe
        FROM health_facility hf
        LEFT JOIN admin_boundary ab ON hf.admin_id = ab.id
        LEFT JOIN hazard_static_flood hsf ON hf.h3_res8 = hsf.h3
        WHERE {where_sql}
        ORDER BY hf.id ASC
        LIMIT 1000;
    """)

    rows = db.execute(query, params).mappings().all()

    features = []
    for r in rows:
        geom_str = r["geojson_geom"]
        geom = json.loads(geom_str) if geom_str else None
        if not geom:
            continue
        features.append({
            "type": "Feature",
            "id": r["id"],
            "geometry": geom,
            "properties": {
                "id": r["id"],
                "nin": r["nin_n"],
                "name": r["name"],
                "type": r["facility_type"],
                "norm_population": r["norm_population"],
                "flood_safe": bool(r["is_flood_safe"]),
                "inundation_freq": round(float(r["inundation_freq"]), 2),
                "hand_m": round(float(r["hand_m"]), 1),
            },
        })

    return {
        "type": "FeatureCollection",
        "features": features,
    }


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

