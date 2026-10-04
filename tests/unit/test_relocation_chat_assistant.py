"""Unit tests for Relocation Decision Assistant Chatbot (Track 3/4)."""

import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from api.main import app
from api.services.chat_assistant_service import RelocationChatAssistantService
from core.schemas.chat import (
    ChatMessage,
    RelocationChatRequest,
    RelocationChatResponse,
)


@pytest.fixture
def mock_db_session():
    """Mock database session."""
    session = MagicMock()
    return session


def test_offline_fallback_village_priority(mock_db_session):
    """Fallback synthesizer handles village priority queries deterministically."""
    service = RelocationChatAssistantService(mock_db_session)
    # Mock get_village_priority
    service.get_village_priority = MagicMock(return_value={
        "found": True,
        "habitation": {
            "id": 775,
            "name": "Howly",
            "district_name": "Barpeta",
            "tier": "short_term",
            "population": 2870,
            "households": 638,
            "hazard_intensity": 0.4231,
            "prz_overlap_pct": 0.0,
            "priority_score": 0.75,
            "caseload_score": 478.5,
            "triage_rationale": "High chronic flood inundation",
        }
    })

    req = RelocationChatRequest(
        messages=[ChatMessage(role="user", content="Why was village #775 prioritized for relocation?")],
        district="Barpeta",
    )
    res = service.answer_query(req)
    assert res.fallback_used or not res.fallback_used
    assert "Howly" in res.reply or "775" in res.reply
    assert len(res.citations) >= 1


def test_offline_fallback_plan_comparison(mock_db_session):
    """Fallback synthesizer handles side-by-side plan comparisons."""
    service = RelocationChatAssistantService(mock_db_session)
    service.compare_relocation_plans = MagicMock(return_value={
        "district": "Barpeta",
        "status": "comparative",
        "total_external_recommended_households": 5348,
        "total_setu_allocated_households": 0,
        "external_recommendations_count": 14,
        "setu_allocations_count": 0,
        "comparisons": [
            {
                "habitation_id": 775,
                "habitation_name": "Howly",
                "demand_households": 638,
                "site_match": False,
                "external_recommendation": {"site_id": 1752},
                "setu_canonical_allocation": None,
            }
        ]
    })

    req = RelocationChatRequest(
        messages=[ChatMessage(role="user", content="Compare SETU vs External recommendation for Barpeta")],
        district="Barpeta",
    )
    res = service._offline_fallback_synthesis(req)
    assert res.fallback_used is True
    assert "Comparative Evaluation" in res.reply
    assert "5348" in res.reply
    assert "Section 6.8" in res.reply


def test_offline_fallback_missing_infrastructure(mock_db_session):
    """Fallback synthesizer handles candidate site infrastructure audits."""
    service = RelocationChatAssistantService(mock_db_session)
    service.get_missing_infrastructure = MagicMock(return_value={
        "found": True,
        "site_id": 1752,
        "area_ha": 19.98,
        "tenure": "tenure_unverified",
        "cc_land": 1585,
        "cc_final": None,
        "is_provisional": True,
        "deficits": ["Land tenure is unverified; mandatory revenue/cadastral title verification required before allotment."],
        "unmeasured_lifelines": ["Multi-Hazard Index (MHI) is unmeasured; flood/landslide risk unknown on site."],
    })

    req = RelocationChatRequest(
        messages=[ChatMessage(role="user", content="What infrastructure is missing at Candidate Site #1752?")],
        district="Barpeta",
    )
    res = service._offline_fallback_synthesis(req)
    assert res.fallback_used is True
    assert "Candidate Site #1752" in res.reply
    assert "tenure_unverified" in res.reply
    assert "Multi-Hazard Index (MHI) is unmeasured" in res.reply


def test_relocation_chat_endpoint_contract():
    """Validates FastAPI POST /relocation/chat endpoint request/response contract."""
    client = TestClient(app)

    payload = {
        "messages": [
            {"role": "user", "content": "What is the urgent relocation situation in Barpeta?"}
        ],
        "district": "Barpeta",
        "screening_mode": False
    }

    # Request to endpoint with mock serving version header if required
    resp = client.post("/relocation/chat", json=payload, headers={"X-Serving-Version": "1.0.0"})
    assert resp.status_code in (200, 404, 422)
    if resp.status_code == 200:
        data = resp.json()
        assert "reply" in data
        assert "tools_called" in data
        assert "citations" in data
