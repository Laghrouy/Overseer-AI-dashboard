from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any


class HistoryRepository:
    """Read-only access to aggregated history data (Mongo)."""

    def __init__(self, session) -> None:
        self.session = session

    async def get_open_tasks(self, owner_id: int) -> list[dict[str, Any]]:
        return await self.session["tasks"].find({"owner_id": owner_id, "status": {"$ne": "terminee"}}).to_list(None)

    async def get_recent_events(
        self,
        owner_id: int,
        days: int = 7,
    ) -> list[dict[str, Any]]:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        return await self.session["events"].find({"owner_id": owner_id, "start": {"$gte": since}}).to_list(None)

    async def get_projects(self, owner_id: int) -> list[dict[str, Any]]:
        return await self.session["projects"].find({"owner_id": owner_id}).to_list(None)

    async def get_agent_logs(
        self,
        owner_id: int,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        cursor = self.session["agent_logs"].find({"owner_id": owner_id}).sort("created_at", -1).limit(limit)
        return await cursor.to_list(None)
