"""Test user queries for Barpeta and Wayanad population at risk."""

import sys
sys.stdout.reconfigure(encoding='utf-8')

from api.dependencies import get_db
from core.schemas.chat import RelocationChatRequest, ChatMessage
from api.services.chat_assistant_service import RelocationChatAssistantService

def test_query(prompt: str, district: str = "Barpeta"):
    print(f"\n{'='*70}\nUSER QUERY: '{prompt}' (Initial context district={district})\n{'='*70}")
    db_gen = get_db()
    db = next(db_gen)
    try:
        service = RelocationChatAssistantService(db)
        req = RelocationChatRequest(
            messages=[ChatMessage(role="user", content=prompt)],
            district=district,
        )
        resp = service.answer_query(req)
        print(f"[Model]: {resp.model} | [Fallback Used]: {resp.fallback_used} | [District]: {resp.district}")
        print(f"[Tools Called]: {resp.tools_called}")
        print(f"\n--- BOT REPLY ---\n{resp.reply}\n-----------------")
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass

if __name__ == "__main__":
    test_query("how many people are in danger in barpeta?")
    test_query("how many people are in danger in wayanad?")
