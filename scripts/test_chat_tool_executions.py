"""Verifies tool_executions in RelocationChatResponse from the chat assistant service."""

import sys
from api.dependencies import get_db
from core.schemas.chat import RelocationChatRequest, ChatMessage
from api.services.chat_assistant_service import RelocationChatAssistantService

def main():
    print("Testing RelocationChatAssistantService with tool execution tracking...")
    db_gen = get_db()
    db = next(db_gen)
    try:
        service = RelocationChatAssistantService(db)

        # Test 1: Query about village priority
        req = RelocationChatRequest(
            messages=[
                ChatMessage(role="user", content="Why was village #775 prioritized for relocation?")
            ],
            district="Barpeta",
            habitation_id=775,
        )

        resp = service.answer_query(req)
        print(f"\n[Response Model]: {resp.model}")
        print(f"[Fallback Used]: {resp.fallback_used}")
        print(f"[Tools Called]: {resp.tools_called}")
        print(f"[Tool Executions Count]: {len(resp.tool_executions)}")

        for te in resp.tool_executions:
            print(f"  -> Tool: {te.name}")
            print(f"     Description: {te.description}")
            print(f"     Data Source: {te.data_source}")
            print(f"     Arguments: {te.arguments}")
            print(f"     Status: {te.status}")

        assert len(resp.tool_executions) > 0, "Expected at least one tool execution"
        assert resp.tool_executions[0].name in ["get_village_priority", "list_urgent_villages"]
        assert resp.tool_executions[0].data_source
        print("\nAll tool execution checks passed successfully!")
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass

if __name__ == "__main__":
    main()
