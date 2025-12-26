from datetime import datetime, time

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from icalendar import Calendar, Event as IcsEvent
from pymongo import ReturnDocument
from ..config import Settings
from ..deps import get_current_user, get_db
from ..mongo_helpers import get_next_id, strip_mongo_id
from ..schemas import EventCreate, EventRead, EventUpdate

router = APIRouter(prefix="/events", tags=["events"])
settings = Settings()


@router.get("/", response_model=list[EventRead])
async def list_events(session=Depends(get_db), user=Depends(get_current_user)):
    events = await session["events"].find({"owner_id": user["id"]}).to_list(None)
    return [EventRead(**strip_mongo_id(e)) for e in events]


@router.post("/", response_model=EventRead)
async def create_event(payload: EventCreate, session=Depends(get_db), user=Depends(get_current_user)):
    doc = {**payload.model_dump(), "owner_id": user["id"], "id": await get_next_id(session, "events")}
    await session["events"].insert_one(doc)
    return EventRead(**strip_mongo_id(doc))


@router.patch("/{event_id}", response_model=EventRead)
async def update_event(
    event_id: int,
    payload: EventUpdate,
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    update = payload.model_dump(exclude_unset=True)
    event = await session["events"].find_one_and_update(
        {"id": event_id, "owner_id": user["id"]},
        {"$set": update},
        return_document=ReturnDocument.AFTER,
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Événement introuvable")
    return EventRead(**strip_mongo_id(event))


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(event_id: int, session=Depends(get_db), user=Depends(get_current_user)):
    result = await session["events"].delete_one({"id": event_id, "owner_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Événement introuvable")
    return None


def _as_datetime(value) -> datetime:
    """Normalize icalendar date/datetime to naive datetime."""
    if isinstance(value, datetime):
        return value.replace(tzinfo=None)
    if hasattr(value, "dt"):
        inner = value.dt
        if isinstance(inner, datetime):
            return inner.replace(tzinfo=None)
        if hasattr(inner, "year") and hasattr(inner, "month") and hasattr(inner, "day"):
            return datetime.combine(inner, time.min)
    raise ValueError("Date ICS invalide")


@router.post("/import/ics")
async def import_ics(
    file: UploadFile = File(...),
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    content = await file.read()
    try:
        cal = Calendar.from_ical(content)
    except Exception as exc:  # pragma: no cover - ical parse errors
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fichier ICS invalide") from exc

    to_create: list[dict] = []
    for component in cal.walk():
        if component.name != "VEVENT":
            continue
        summary = component.get("SUMMARY", "Événement")
        dtstart = component.get("DTSTART")
        dtend = component.get("DTEND")
        if not dtstart or not dtend:
            continue
        try:
            start_dt = _as_datetime(dtstart)
            end_dt = _as_datetime(dtend)
        except ValueError:
            continue
        categories = component.get("CATEGORIES")
        category = None
        if categories:
            if isinstance(categories, list):
                category = str(categories[0])
            else:
                category = str(categories)
        evt = {
            "id": await get_next_id(session, "events"),
            "title": str(summary),
            "start": start_dt,
            "end": end_dt,
            "kind": "fixe",
            "category": category or "general",
            "owner_id": user["id"],
        }
        to_create.append(evt)

    if not to_create:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Aucun événement importé")

    if to_create:
        await session["events"].insert_many(to_create)
    return {"imported": len(to_create)}


@router.get("/export/ics")
async def export_ics(session=Depends(get_db), user=Depends(get_current_user)):
    events = await session["events"].find({"owner_id": user["id"]}).to_list(None)
    cal = Calendar()
    cal.add("prodid", "-//OVERSEER//Agenda//FR")
    cal.add("version", "2.0")
    for evt in events:
        vevent = IcsEvent()
        vevent.add("summary", evt.get("title"))
        vevent.add("dtstart", evt.get("start"))
        vevent.add("dtend", evt.get("end"))
        if evt.get("category"):
            vevent.add("categories", evt.get("category"))
        cal.add_component(vevent)
    payload = cal.to_ical()
    return Response(content=payload, media_type="text/calendar")
