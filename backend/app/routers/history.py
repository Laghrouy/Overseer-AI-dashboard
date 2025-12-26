from fastapi import APIRouter, Depends, HTTPException, status

from ..deps import get_current_user, get_db
from ..mongo_helpers import strip_mongo_id
from ..repositories.history import HistoryRepository
from ..schemas import EventRead, HistoryResponse, ProjectRead, TaskRead

router = APIRouter(prefix="/history", tags=["history"])


@router.get("", response_model=HistoryResponse)
async def get_history(session=Depends(get_db), user=Depends(get_current_user)):
    repo = HistoryRepository(session)

    tasks = await repo.get_open_tasks(owner_id=user["id"])
    events = await repo.get_recent_events(owner_id=user["id"])
    projects = await repo.get_projects(owner_id=user["id"])
    logs = await repo.get_agent_logs(owner_id=user["id"])

    task_reads = [TaskRead(**strip_mongo_id(dict(t))) for t in tasks]
    event_reads = [EventRead(**strip_mongo_id(dict(e))) for e in events]
    project_reads = [ProjectRead(**strip_mongo_id(dict(p))) for p in projects]

    agent_logs = []
    for log in logs:
        doc = strip_mongo_id(dict(log))
        created = doc.get("created_at")
        agent_logs.append(
            {
                "id": str(doc.get("id", "")),
                "action": doc.get("action", ""),
                "rationale": doc.get("rationale", ""),
                "diff": doc.get("diff", ""),
                "created_at": created.isoformat() if hasattr(created, "isoformat") else str(created or ""),
            }
        )

    return HistoryResponse(tasks=task_reads, events=event_reads, projects=project_reads, agent_logs=agent_logs)
