from fastapi import APIRouter, Depends, HTTPException, status
from pymongo import ReturnDocument

from ..deps import get_current_user, get_db
from ..mongo_helpers import get_next_id, strip_mongo_id
from ..schemas import TaskCreate, TaskRead, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("/", response_model=list[TaskRead])
async def list_tasks(session=Depends(get_db), user=Depends(get_current_user)):
    tasks = await session["tasks"].find({"owner_id": user["id"]}).to_list(None)
    return [TaskRead(**strip_mongo_id(t)) for t in tasks]


@router.post("/", response_model=TaskRead)
async def create_task(payload: TaskCreate, session=Depends(get_db), user=Depends(get_current_user)):
    doc = {
        **payload.model_dump(),
        "owner_id": user["id"],
        "id": await get_next_id(session, "tasks"),
        "status": "a_faire",
    }
    await session["tasks"].insert_one(doc)
    return TaskRead(**strip_mongo_id(doc))


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: int,
    payload: TaskUpdate,
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items()}
    result = await session["tasks"].find_one_and_update(
        {"id": task_id, "owner_id": user["id"]},
        {"$set": update},
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tâche introuvable")
    return TaskRead(**strip_mongo_id(result))


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: int, session=Depends(get_db), user=Depends(get_current_user)):
    result = await session["tasks"].delete_one({"id": task_id, "owner_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tâche introuvable")
    return None
