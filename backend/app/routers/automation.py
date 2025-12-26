import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from ..deps import get_current_user, get_db
from ..mongo_helpers import get_next_id
from ..schemas import AutomationRequest, AutomationResponse, AutomationRollbackRequest, AutomationRollbackResponse

router = APIRouter(prefix="/automation", tags=["automation"])


action_details = {
    "script": "Script déclenché",
    "api": "Appel API déclenché",
    "file": "Fichier généré",
    "message": "Message envoyé",
    "webhook": "Webhook déclenché",
}


@router.post("", response_model=AutomationResponse)
async def trigger_automation(
    payload: AutomationRequest,
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    detail = action_details.get(payload.action, "Action exécutée")
    target = payload.target or payload.message or ""
    if target:
        detail = f"{detail}: {target}"

    doc = {
        "id": await get_next_id(session, "agent_logs"),
        "action": f"automation:{payload.action}",
        "rationale": target,
        "diff": json.dumps(payload.model_dump()),
        "owner_id": user["id"],
        "created_at": datetime.now(timezone.utc),
    }
    await session["agent_logs"].insert_one(doc)

    return AutomationResponse(id=str(doc["id"]), action=payload.action, status="ok", detail=detail, created_at=doc["created_at"])


@router.post("/rollback", response_model=AutomationRollbackResponse)
async def rollback_automation(
    payload: AutomationRollbackRequest,
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    rationale = payload.reason or "rollback triggered"
    doc = {
        "id": await get_next_id(session, "agent_logs"),
        "action": "automation:rollback",
        "rationale": rationale,
        "diff": json.dumps(payload.model_dump()),
        "owner_id": user["id"],
        "created_at": datetime.now(timezone.utc),
    }
    await session["agent_logs"].insert_one(doc)
    detail = "Rollback enregistré" if payload.id else "Rollback enregistré (sans identifiant)"
    return AutomationRollbackResponse(status="ok", detail=detail, created_at=doc["created_at"])
