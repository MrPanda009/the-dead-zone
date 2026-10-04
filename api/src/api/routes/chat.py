"""FastAPI route handlers for Relocation Decision Assistant Chatbot.

Endpoint:
- POST /relocation/chat
"""

from __future__ import annotations

import uuid
from fastapi import APIRouter, Body, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_db, require_serving_version
from api.routes.common import error_responses
from api.services.chat_assistant_service import RelocationChatAssistantService
from core.schemas.chat import (
    RelocationChatRequest,
    RelocationChatResponse,
)

router = APIRouter(tags=["Relocation Assistant"])


@router.post(
    "/relocation/chat",
    response_model=RelocationChatResponse,
    responses=error_responses(400, 422, 500, 503),
    summary="Interactive Relocation Decision Assistant",
    description=(
        "Conversational AI decision assistant for government administrators and NDRF commanders. "
        "Answers queries regarding village triage priorities, carrying capacity deficits, "
        "and side-by-side comparative evaluations between SETU canonical allocations and external GIS proposals. "
        "Strictly grounded with source provenance citations and honest missing data handling."
    ),
)
def relocation_chat(
    request: RelocationChatRequest = Body(...),
    db: Session = Depends(get_db),
    _sv: uuid.UUID = Depends(require_serving_version),
) -> RelocationChatResponse:
    service = RelocationChatAssistantService(db)
    return service.answer_query(request)
