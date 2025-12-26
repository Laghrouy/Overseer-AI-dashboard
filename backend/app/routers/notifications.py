from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from ..deps import get_current_user, get_db
from ..mongo_helpers import get_next_id
from ..schemas import NotificationSignals

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.post("", status_code=204)
async def push_notifications(
    payload: NotificationSignals,
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    doc = {
        "id": await get_next_id(session, "agent_logs"),
        "action": "notifications",
        "rationale": payload.context or "",
        "diff": payload.model_dump_json(),
        "owner_id": user["id"],
        "created_at": datetime.now(timezone.utc),
    }
    await session["agent_logs"].insert_one(doc)
    return None
