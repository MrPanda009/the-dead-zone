"""FastAPI Route Handlers for Relocation Plan Optimization (Day 6).

Endpoint:
- POST /plan/allocate
"""

from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session

from api.dependencies import get_db
from api.services.allocation_service import AllocationService
from core.schemas.allocation import AllocationPlanRequest, AllocationPlanResponse

router = APIRouter(prefix="/plan", tags=["Relocation Planning & Allocation"])


@router.post(
    "/allocate",
    response_model=AllocationPlanResponse,
    summary="Solve optimal habitation-to-site relocation allocation via min-cost flow",
    description=(
        "Executes exact min-cost flow optimization (Google OR-Tools) to assign vulnerable habitations to candidate relocation sites. "
        "Respects carrying capacity constraints (Day 5), maximizes composite suitability/priority benefit, minimizes distance penalty, "
        "and explicitly reports any village household group splits requiring social sign-off."
    ),
)
def generate_allocation_plan(
    payload: AllocationPlanRequest = Body(
        ...,
        description="Configuration and constraints for the min-cost-flow allocation solver.",
    ),
    db: Session = Depends(get_db),
) -> AllocationPlanResponse:
    service = AllocationService(db)
    return service.generate_allocation_plan(payload)
