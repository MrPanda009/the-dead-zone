"""Pydantic v2 schemas for Relocation Decision Assistant Chatbot.

Endpoint: POST /relocation/chat
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional
from pydantic import Field
from core.schemas.common import BaseSchema


class ChatMessage(BaseSchema):
    """Single message in a conversational thread."""
    role: Literal["system", "user", "assistant"] = Field(
        ...,
        description="Role of the message sender.",
    )
    content: str = Field(
        ...,
        description="Text content of the message.",
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp of the message.",
    )


class ChatCitation(BaseSchema):
    """Grounding citation referencing verified pipeline data."""
    source: str = Field(
        ...,
        description="Origin source name (e.g. 'SETU PostGIS Engine', 'External Partner GIS').",
    )
    detail: str = Field(
        ...,
        description="Specific metric, row, or rule cited.",
    )
    metric: Optional[str] = Field(
        default=None,
        description="Quantitative value or threshold cited.",
    )
    provenance: str = Field(
        default="authoritative",
        description="Provenance grade ('authoritative', 'derived_unverified', 'external_gis').",
    )


class RelocationChatRequest(BaseSchema):
    """Request payload for the relocation AI assistant."""
    messages: List[ChatMessage] = Field(
        ...,
        min_length=1,
        description="Chat history leading up to the current prompt.",
    )
    district: Optional[str] = Field(
        default="Barpeta",
        description="Active administrative district in focus.",
    )
    habitation_id: Optional[int] = Field(
        default=None,
        description="Optional focused habitation ID for targeted analysis.",
    )
    site_id: Optional[int] = Field(
        default=None,
        description="Optional candidate site ID for targeted capacity analysis.",
    )
    screening_mode: bool = Field(
        default=False,
        description="Whether exploratory screening mode is active (permitting unmeasured lifelines/hazards).",
    )


class RelocationChatResponse(BaseSchema):
    """Response payload from the relocation AI assistant."""
    reply: str = Field(
        ...,
        description="Markdown-formatted, cited plain-English response.",
    )
    tools_called: List[str] = Field(
        default_factory=list,
        description="List of pipeline tool functions executed to answer the query.",
    )
    citations: List[ChatCitation] = Field(
        default_factory=list,
        description="Structured citations linking statements to pipeline data.",
    )
    grounding_data: Dict[str, Any] = Field(
        default_factory=dict,
        description="Raw structured pipeline data retrieved by tools.",
    )
    fallback_used: bool = Field(
        default=False,
        description="Whether the offline deterministic fallback synthesizer was used (e.g., on LLM timeout).",
    )
    model: str = Field(
        default="llama-3.3-70b-versatile",
        description="LLM model identifier used for completion.",
    )
    district: Optional[str] = Field(
        default=None,
        description="District context of the response.",
    )
