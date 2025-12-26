from fastapi import APIRouter, Depends, HTTPException, status
from pymongo import ReturnDocument

from ..config import Settings
from ..deps import get_current_user, get_db
from ..mongo_helpers import get_next_id, strip_mongo_id
from ..schemas import ProjectCreate, ProjectRead, ProjectUpdate, ProjectMilestonesUpdate

router = APIRouter(prefix="/projects", tags=["projects"])
settings = Settings()


@router.get("/", response_model=list[ProjectRead])
async def list_projects(session=Depends(get_db), user=Depends(get_current_user)):
    projects = await session["projects"].find({"owner_id": user["id"]}).to_list(None)
    return [ProjectRead(**strip_mongo_id(p)) for p in projects]


@router.post("/", response_model=ProjectRead)
async def create_project(
    payload: ProjectCreate,
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    doc = {**payload.model_dump(), "owner_id": user["id"], "id": await get_next_id(session, "projects")}
    await session["projects"].insert_one(doc)
    return ProjectRead(**strip_mongo_id(doc))


@router.patch("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: int,
    payload: ProjectUpdate,
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    update = payload.model_dump(exclude_unset=True)
    project = await session["projects"].find_one_and_update(
        {"id": project_id, "owner_id": user["id"]},
        {"$set": update},
        return_document=ReturnDocument.AFTER,
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projet introuvable")
    return ProjectRead(**strip_mongo_id(project))


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: int, session=Depends(get_db), user=Depends(get_current_user)):
    result = await session["projects"].delete_one({"id": project_id, "owner_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projet introuvable")
    return None


@router.patch("/{project_id}/milestones", response_model=ProjectRead)
async def update_project_milestones(
    project_id: int,
    payload: ProjectMilestonesUpdate,
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    project = await session["projects"].find_one_and_update(
        {"id": project_id, "owner_id": user["id"]},
        {"$set": payload.model_dump()},
        return_document=ReturnDocument.AFTER,
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projet introuvable")
    return ProjectRead(**strip_mongo_id(project))
