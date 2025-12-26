from datetime import datetime, timedelta, timezone
from typing import Iterable, Optional

from ..config import Settings
from .llm_client import LLMClient

settings = Settings()
llm_client = LLMClient(settings)


def _date_floor(day: datetime) -> datetime:
    return datetime.combine(day.date(), datetime.min.time(), tzinfo=timezone.utc)


def generate_revision_sessions(
    topics: list[str],
    start_day: datetime,
    exam_date: Optional[datetime],
    session_minutes: int,
    sessions_per_day: int,
) -> list[dict]:
    """Deterministic lightweight planner: short sessions, spaced reminders."""

    start = _date_floor(start_day)
    sessions: list[dict] = []
    day_cursor = start
    topic_index = 0
    spacing = [1, 3]  # simple spaced reminders

    # primary coverage
    while topic_index < len(topics):
        for _ in range(sessions_per_day):
            if topic_index >= len(topics):
                break
            topic = topics[topic_index]
            sessions.append(
                {
                    "kind": "revision",
                    "topic": topic,
                    "scheduled_for": day_cursor,
                    "duration_minutes": session_minutes,
                }
            )
            # schedule reminders for the same topic
            for offset in spacing:
                sessions.append(
                    {
                        "kind": "rappel",
                        "topic": topic,
                        "scheduled_for": day_cursor + timedelta(days=offset),
                        "duration_minutes": max(20, int(session_minutes * 0.6)),
                    }
                )
            topic_index += 1
        day_cursor += timedelta(days=1)

    # If exam_date is set, add a consolidation the day before
    if exam_date:
        eve = _date_floor(exam_date - timedelta(days=1))
        sessions.append(
            {
                "kind": "quiz",
                "topic": "consolidation",
                "scheduled_for": eve,
                "duration_minutes": session_minutes,
            }
        )

    sessions.sort(key=lambda s: s["scheduled_for"])
    return sessions


def sm2_update(interval: int, ease: float, streak: int, score: int) -> tuple[int, float, int]:
    """Simplified SM-2 spaced repetition update."""
    if score < 3:
        return 1, max(1.3, ease - 0.2), 0
    ease = ease + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02))
    ease = max(1.3, min(2.8, ease))
    if streak == 0:
        interval = 1
    elif streak == 1:
        interval = 6
    else:
        interval = int(interval * ease)
    return interval, ease, streak + 1


async def pedagogic_assist(
    subject: str,
    topic: Optional[str],
    content: Optional[str],
    mode: str,
    difficulty: str,
    items: int,
) -> str:
    if not settings.openai_api_key:
        return (
            f"Assistant non configuré (clé LLM manquante). Mode={mode}, sujet={subject}, "
            f"topic={topic or 'n/a'}, items={items}, difficulty={difficulty}."
        )

    prompt_map = {
        "resume": "Résume le cours de façon structurée en puces.",
        "explication": "Explique le concept de manière claire et concise en français.",
        "exercices": "Génère des exercices corrigés adaptés au niveau.",
        "quiz": "Crée un quiz à choix multiples avec les réponses et une justification courte.",
    }
    instruction = prompt_map.get(mode, "Explique de façon pédagogique.")

    base = (
        f"Sujet: {subject}. Topic: {topic or 'n/a'}. Difficulté: {difficulty}. "
        f"Nombre d'items: {items}. {instruction}"
    )
    if content:
        base += f"\nContexte:\n{content}"

    messages = [
        {"role": "system", "content": "Tu es un tuteur pédagogique concis. Réponds en français."},
        {"role": "user", "content": base},
    ]

    try:
        return await llm_client.chat(messages, max_tokens=400, allow_reasoning=False)
    except Exception as exc:  # pragma: no cover - safety net
        return f"Impossible de générer l'aide pédagogique: {exc}"
