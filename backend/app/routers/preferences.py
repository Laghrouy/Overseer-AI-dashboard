from fastapi import APIRouter, Depends

from ..config import Settings
from ..deps import get_current_user, get_db
from ..mongo_helpers import strip_mongo_id
from ..schemas import UserPreferenceRead, UserPreferenceUpdate

router = APIRouter(prefix="/user", tags=["preferences"])
settings = Settings()


def to_read(pref: dict) -> UserPreferenceRead:
    return UserPreferenceRead(
        productive_hours=pref.get("productive_hours"),
        daily_load_limit_hours=pref.get("daily_load_limit_hours"),
        session_duration_minutes=pref.get("session_duration_minutes"),
        days_off=pref.get("days_off"),
        painful_tasks=pref.get("painful_tasks"),
    )


@router.get("/preferences", response_model=UserPreferenceRead)
async def get_preferences(
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    pref = await session["user_preferences"].find_one({"owner_id": user["id"]})
    if not pref:
        pref = {"owner_id": user["id"], "id": user["id"]}
        await session["user_preferences"].insert_one(pref)
    return to_read(strip_mongo_id(pref))


@router.put("/preferences", response_model=UserPreferenceRead)
async def update_preferences(
    payload: UserPreferenceUpdate,
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    update = payload.model_dump(exclude_unset=True)
    pref = await session["user_preferences"].find_one_and_update(
        {"owner_id": user["id"]},
        {"$set": update},
        upsert=True,
        return_document=True,
    )
    if not pref:
        pref = {"owner_id": user["id"], **update}
    return to_read(strip_mongo_id(pref))
