from datetime import datetime, timezone, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo import ReturnDocument

from ..deps import get_current_user, get_db
from ..mongo_helpers import get_next_id, strip_mongo_id
from ..schemas import (
    StudyAssistRequest,
    StudyAssistResponse,
    StudyCardCreate,
    StudyCardRead,
    StudyCardReview,
    StudyPlanGenerateRequest,
    StudyPlanRead,
    StudyPlanUpdate,
    StudySessionRead,
    StudySessionUpdate,
    StudySubjectCreate,
    StudySubjectRead,
    StudySubjectUpdate,
)
from ..services.learning import generate_revision_sessions, pedagogic_assist, sm2_update

router = APIRouter(prefix="/study", tags=["study"])


@router.post("/subjects", response_model=StudySubjectRead)
async def create_subject(
    payload: StudySubjectCreate,
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    doc = {
        "id": await get_next_id(session, "study_subjects"),
        "owner_id": user["id"],
        **payload.model_dump(),
    }
    await session["study_subjects"].insert_one(doc)
    return StudySubjectRead(**strip_mongo_id(doc))


@router.get("/subjects", response_model=List[StudySubjectRead])
async def list_subjects(
    session=Depends(get_db), user=Depends(get_current_user)
):
    subjects = await session["study_subjects"].find({"owner_id": user["id"]}).to_list(None)
    return [StudySubjectRead(**strip_mongo_id(s)) for s in subjects]


@router.patch("/subjects/{subject_id}", response_model=StudySubjectRead)
async def update_subject(
    subject_id: int,
    payload: StudySubjectUpdate,
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    update = payload.model_dump(exclude_unset=True)
    subject = await session["study_subjects"].find_one_and_update(
        {"id": subject_id, "owner_id": user["id"]},
        {"$set": update},
        return_document=ReturnDocument.AFTER,
    )
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sujet introuvable")
    return StudySubjectRead(**strip_mongo_id(subject))


@router.delete("/subjects/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subject_id: int,
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    deleted = await session["study_subjects"].delete_one({"id": subject_id, "owner_id": user["id"]})
    if deleted.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sujet introuvable")

    await session["study_sessions"].delete_many({"owner_id": user["id"], "subject_id": subject_id})
    await session["study_cards"].delete_many({"owner_id": user["id"], "subject_id": subject_id})
    await session["study_plans"].delete_many({"owner_id": user["id"], "subject_id": subject_id})
    return None


@router.post("/plan/generate", response_model=StudyPlanRead)
async def generate_plan(
    payload: StudyPlanGenerateRequest,
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    subject = await session["study_subjects"].find_one({"id": payload.subject_id, "owner_id": user["id"]})
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sujet introuvable")

    plan_id = await get_next_id(session, "study_plans")
    plan_doc = {
        "id": plan_id,
        "title": f"Plan {subject.get('name', '')}",
        "subject_id": payload.subject_id,
        "exam_date": payload.exam_date,
        "total_minutes": payload.total_minutes,
        "owner_id": user["id"],
    }
    await session["study_plans"].insert_one(plan_doc)

    sessions_data = generate_revision_sessions(
        topics=payload.topics,
        start_day=datetime.now(timezone.utc),
        exam_date=payload.exam_date,
        session_minutes=payload.session_minutes,
        sessions_per_day=payload.sessions_per_day,
    )

    sessions_docs: list[dict] = []
    for item in sessions_data:
        sessions_docs.append(
            {
                "id": await get_next_id(session, "study_sessions"),
                "subject_id": payload.subject_id,
                "plan_id": plan_id,
                "kind": item["kind"],
                "topic": item.get("topic"),
                "status": "planned",
                "scheduled_for": item["scheduled_for"],
                "duration_minutes": item["duration_minutes"],
                "completed_at": None,
                "difficulty": None,
                "notes": None,
                "owner_id": user["id"],
            }
        )

    if sessions_docs:
        await session["study_sessions"].insert_many(sessions_docs)

    sessions_reads = [StudySessionRead(**strip_mongo_id(doc)) for doc in sessions_docs]
    return StudyPlanRead(
        id=plan_id,
        title=plan_doc["title"],
        subject_id=plan_doc["subject_id"],
        exam_date=plan_doc["exam_date"],
        total_minutes=plan_doc["total_minutes"],
        sessions=sessions_reads,
    )


@router.get("/plans", response_model=List[StudyPlanRead])
async def list_plans(
    subject_id: int | None = Query(default=None),
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    query = {"owner_id": user["id"]}
    if subject_id is not None:
        query["subject_id"] = subject_id

    plans = await session["study_plans"].find(query).to_list(None)
    items: list[StudyPlanRead] = []
    for plan in plans:
        plan_id = plan.get("id")
        if plan_id is None:
            continue
        sessions = await session["study_sessions"].find({"owner_id": user["id"], "plan_id": plan_id}).to_list(None)
        items.append(
            StudyPlanRead(
                id=plan_id,
                title=plan.get("title"),
                subject_id=plan.get("subject_id"),
                exam_date=plan.get("exam_date"),
                total_minutes=plan.get("total_minutes"),
                sessions=[StudySessionRead(**strip_mongo_id(s)) for s in sessions],
            )
        )
    return items


@router.patch("/plans/{plan_id}", response_model=StudyPlanRead)
async def update_plan(
    plan_id: int,
    payload: StudyPlanUpdate,
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    plan = await session["study_plans"].find_one_and_update(
        {"id": plan_id, "owner_id": user["id"]},
        {"$set": payload.model_dump(exclude_unset=True)},
        return_document=ReturnDocument.AFTER,
    )
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan introuvable")

    sessions = await session["study_sessions"].find({"owner_id": user["id"], "plan_id": plan_id}).to_list(None)
    return StudyPlanRead(
        id=plan_id,
        title=plan.get("title"),
        subject_id=plan.get("subject_id"),
        exam_date=plan.get("exam_date"),
        total_minutes=plan.get("total_minutes"),
        sessions=[StudySessionRead(**strip_mongo_id(s)) for s in sessions],
    )


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
    plan_id: int,
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    await session["study_sessions"].delete_many({"owner_id": user["id"], "plan_id": plan_id})
    deleted = await session["study_plans"].delete_one({"id": plan_id, "owner_id": user["id"]})
    if deleted.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan introuvable")
    return None


@router.patch("/sessions/{session_id}", response_model=StudySessionRead)
async def update_session(
    session_id: int,
    payload: StudySessionUpdate,
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    update = payload.model_dump(exclude_unset=True)
    s = await db["study_sessions"].find_one_and_update(
        {"id": session_id, "owner_id": user["id"]},
        {"$set": update},
        return_document=ReturnDocument.AFTER,
    )
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Séance introuvable")
    return StudySessionRead(**strip_mongo_id(s))


@router.get("/sessions/due", response_model=List[StudySessionRead])
async def list_due_sessions(
    db=Depends(get_db), user=Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    sessions = await db["study_sessions"].find(
        {
            "owner_id": user["id"],
            "status": "planned",
            "scheduled_for": {"$lte": now},
        }
    ).to_list(None)

    return [StudySessionRead(**strip_mongo_id(s)) for s in sessions]


@router.post("/cards", response_model=StudyCardRead)
async def create_card(
    payload: StudyCardCreate,
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    subject = await session["study_subjects"].find_one({"id": payload.subject_id, "owner_id": user["id"]})
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sujet introuvable")

    due_at = payload.due_at or datetime.now(timezone.utc)
    card_doc = {
        "id": await get_next_id(session, "study_cards"),
        "subject_id": payload.subject_id,
        "front": payload.front,
        "back": payload.back,
        "due_at": due_at,
        "interval_days": 1,
        "ease": 2.5,
        "streak": 0,
        "last_score": None,
        "owner_id": user["id"],
    }
    await session["study_cards"].insert_one(card_doc)
    return StudyCardRead(**strip_mongo_id(card_doc))


@router.get("/cards/due", response_model=List[StudyCardRead])
async def list_due_cards(
    session=Depends(get_db), user=Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    cards = await session["study_cards"].find(
        {"owner_id": user["id"], "due_at": {"$lte": now}}
    ).to_list(None)
    return [StudyCardRead(**strip_mongo_id(c)) for c in cards]


@router.post("/cards/{card_id}/review", response_model=StudyCardRead)
async def review_card(
    card_id: int,
    payload: StudyCardReview,
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    card = await session["study_cards"].find_one({"id": card_id, "owner_id": user["id"]})
    if not card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carte introuvable")

    interval, ease, streak = sm2_update(card.get("interval_days", 1), card.get("ease", 2.5), card.get("streak", 0), payload.score)
    due_at = datetime.now(timezone.utc) + timedelta(days=interval)

    updated = await session["study_cards"].find_one_and_update(
        {"id": card_id, "owner_id": user["id"]},
        {
            "$set": {
                "interval_days": interval,
                "ease": ease,
                "streak": streak,
                "last_score": payload.score,
                "due_at": due_at,
            }
        },
        return_document=ReturnDocument.AFTER,
    )
    return StudyCardRead(**strip_mongo_id(updated))


@router.post("/assist", response_model=StudyAssistResponse)
async def study_assist(
    payload: StudyAssistRequest,
    user=Depends(get_current_user),
):
    output = await pedagogic_assist(
        subject=payload.subject,
        topic=payload.topic,
        content=payload.content,
        mode=payload.mode,
        difficulty=payload.difficulty,
        items=payload.items,
    )
    return StudyAssistResponse(output=output)


@router.get("/subjects/{subject_id}/progress", response_model=dict)
async def subject_progress(
    subject_id: int,
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    sessions = await session["study_sessions"].find({"owner_id": user["id"], "subject_id": subject_id}).to_list(None)
    if not sessions:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aucune donnée")

    done = len([s for s in sessions if s.get("status") == "done"])
    planned = len([s for s in sessions if s.get("status") == "planned"])
    skipped = len([s for s in sessions if s.get("status") == "skipped"])
    difficulties = [s.get("difficulty") for s in sessions if s.get("difficulty") is not None]
    avg_diff = sum(difficulties) / len(difficulties) if difficulties else None

    future_load = sum(s.get("duration_minutes", 0) for s in sessions if s.get("status") == "planned") / 60

    return {
        "done": done,
        "planned": planned,
        "skipped": skipped,
        "avg_difficulty": avg_diff,
        "future_load_hours": round(future_load, 2),
    }
