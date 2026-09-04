"""FastAPI Route Handlers for Scenario Simulation & Sensitivity Analysis (L5).

Endpoint:
- POST /scenario
Section refs: docs/PRD1.md §6.10 (FR-9.4), §9.6
"""

from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session

from api.dependencies import get_db
from api.routes.common import error_responses
from api.services.scenario_service import ScenarioService
from core.schemas.scenario import ScenarioWeightOverrideRequest, ScenarioResponse

router = APIRouter(prefix="/scenario", tags=["Scenario & Decision Analysis"])


@router.post(
    "",
    response_model=ScenarioResponse,
    responses=error_responses(422, 500),
    summary="Evaluate hypothetical policy and hazard weight scenarios without mutating baseline data",
    description=(
        "Executes a pure, stateless scenario evaluation over habitation baselines. "
        "Allows decision-makers to adjust hazard weights w_h and loss history amplifier gamma, "
        "recomputing priority scores, rank deltas, and triage tier shifts. "
        "Optionally simulates min-cost flow relocation allocation without modifying database records."
    ),
)
def evaluate_scenario(
    payload: ScenarioWeightOverrideRequest = Body(
        ...,
        description="Scenario assumptions and parameters (hazard weights, priority gamma, sort mode).",
    ),
    db: Session = Depends(get_db),
) -> ScenarioResponse:
    service = ScenarioService(db)
    return service.evaluate_scenario(payload)
