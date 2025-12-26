import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from ..deps import get_current_user, get_db
from ..mongo_helpers import get_next_id
from ..schemas import CommandRequest, CommandResponse
from ..utils import build_command_repr

router = APIRouter(prefix="/commands", tags=["commands"])


@router.post("", response_model=CommandResponse)
async def run_command(
    payload: CommandRequest,
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    cmd_repr = build_command_repr(payload.command, payload.args)
    if not cmd_repr:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Commande vide")

    doc = {
        "id": await get_next_id(session, "agent_logs"),
        "action": "command",
        "rationale": cmd_repr,
        "diff": json.dumps(payload.model_dump()),
        "owner_id": user["id"],
        "created_at": datetime.now(timezone.utc),
    }
    try:
        await session["agent_logs"].insert_one(doc)
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Impossible d'enregistrer la commande") from exc

    return CommandResponse(status="ok", output=f"Commande enregistrée: {cmd_repr}", created_at=doc["created_at"])
