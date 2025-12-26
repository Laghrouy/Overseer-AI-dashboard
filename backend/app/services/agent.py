from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable

from ..config import Settings
from ..mongo_helpers import get_next_id
from .llm_client import LLMClient

settings = Settings()
llm_client = LLMClient(settings)


def _event_summary(evt) -> str:
    title = getattr(evt, "title", None) or (evt.get("title") if isinstance(evt, dict) else "")
    start = getattr(evt, "start", None) or (evt.get("start") if isinstance(evt, dict) else None)
    end = getattr(evt, "end", None) or (evt.get("end") if isinstance(evt, dict) else None)
    kind = getattr(evt, "kind", None) or (evt.get("kind") if isinstance(evt, dict) else "")
    try:
        start_s = start.isoformat() if hasattr(start, "isoformat") else str(start)
        end_s = end.isoformat() if hasattr(end, "isoformat") else str(end)
    except Exception:
        start_s, end_s = str(start), str(end)
    return f"- {title} {start_s} -> {end_s} ({kind})"


async def log_agent_decision(session, user, action: str, rationale: str, events: Iterable[dict | object]) -> None:
    """Persist a lightweight trace of the agent proposal in Mongo."""

    summary = "\n".join([_event_summary(e) for e in events])
    owner_id = user["id"] if isinstance(user, dict) else getattr(user, "id", None)
    doc = {
        "id": await get_next_id(session, "agent_logs"),
        "owner_id": owner_id,
        "action": action,
        "rationale": rationale,
        "diff": summary,
        "created_at": datetime.now(timezone.utc),
    }
    await session["agent_logs"].insert_one(doc)


def extract_choice_text(data: dict, allow_reasoning: bool = True) -> str:
    """Compatibilité ascendante : délègue à LLMClient._extract_choice_text."""

    return LLMClient._extract_choice_text(data, allow_reasoning=allow_reasoning)


async def generate_chat_reply(message: str, user) -> str:
    if not settings.openai_api_key:
        return "LLM non configuré — réponse simplifiée générée."

    prompt = (
        "Tu es un assistant personnel concis. Réponds en français en 3 phrases max, "
        "ton neutre et utile."
    )
    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": message},
    ]

    try:
        return await llm_client.chat(messages, max_tokens=512, allow_reasoning=False)
    except Exception as exc:
        return f"Impossible de répondre via le LLM: {exc}"


async def summarize_chat(messages: list[dict[str, str]]) -> str:
    if not messages:
        return "Aucune conversation."

    # Best-effort local summary when no LLM key
    if not settings.openai_api_key:
        last_user = [m["content"] for m in messages if m.get("role") == "user"]
        joined = " | ".join(last_user[-5:])
        return f"Derniers échanges: {joined}" if joined else "Aucune conversation."

    prompt = (
        "Tu es un assistant qui résume une conversation en français en 4 phrases max. "
        "Mentionne les intentions clés et décisions."
    )
    chat_messages = [
        {"role": "system", "content": prompt},
        *[
            {"role": m.get("role", "user"), "content": m.get("content", "")}
            for m in messages[-20:]
        ],
    ]

    try:
        return await llm_client.chat(chat_messages, max_tokens=200, allow_reasoning=False)
    except Exception as exc:
        return f"Impossible de résumer la conversation: {exc}"
