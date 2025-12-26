from datetime import datetime, time, timedelta, timezone
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..deps import get_current_user, get_db
from ..schemas import FeedbackEstimateAdjustment, FeedbackHabitWindow, FeedbackStats
router = APIRouter(prefix="/feedback", tags=["feedback"])


def _period_bounds(anchor: datetime, scope: str) -> tuple[datetime, datetime]:
    base = datetime.combine(anchor.date(), time.min)
    if scope == "week":
        base = base - timedelta(days=base.weekday())
        end = base + timedelta(days=7)
    elif scope == "month":
        base = base.replace(day=1)
        if base.month == 12:
            end = base.replace(year=base.year + 1, month=1)
        else:
            end = base.replace(month=base.month + 1)
    else:
        end = base + timedelta(days=1)
    return base, end


def _hours_between(start: datetime, end: datetime) -> float:
    return (end - start).total_seconds() / 3600.0


def _minutes_between(start: datetime, end: datetime) -> float:
    return (end - start).total_seconds() / 60.0


def _bucket_label(hour: int) -> str:
    window_start = (hour // 2) * 2
    window_end = window_start + 2
    return f"{window_start:02d}:00-{window_end:02d}:00"


@router.get("", response_model=FeedbackStats)
async def feedback_loop(
    scope: str = Query("day", description="day | week | month"),
    date: datetime | None = Query(None, description="Anchor date in ISO format"),
    session=Depends(get_db),
    user=Depends(get_current_user),
):
    anchor = date or datetime.now(timezone.utc)
    if anchor.tzinfo:
        anchor = anchor.astimezone(timezone.utc).replace(tzinfo=None)
    start, end = _period_bounds(anchor, scope)

    tasks = await session["tasks"].find({"owner_id": user["id"]}).to_list(None)
    events = await session["events"].find({"owner_id": user["id"], "start": {"$gte": start, "$lt": end}}).to_list(None)

    planned_events = [e for e in events if e.get("kind") == "propose"]
    actual_events = [e for e in events if e.get("kind") != "propose"]

    planned_hours = sum(_hours_between(e.get("start"), e.get("end")) for e in planned_events)
    actual_hours = sum(_hours_between(e.get("start"), e.get("end")) for e in actual_events)

    tasks_in_scope = [t for t in tasks if t.get("deadline") is None or (t.get("deadline") >= start and t.get("deadline") < end)]
    tasks_done = [t for t in tasks_in_scope if t.get("status") == "terminee"]
    deferred_tasks = [
        t
        for t in tasks
        if t.get("status") != "terminee" and t.get("deadline") is not None and t.get("deadline") < start
    ]

    completion_rate = round(len(tasks_done) / len(tasks_in_scope), 3) if tasks_in_scope else 0.0

    durations_by_task: dict[int, float] = defaultdict(float)
    for e in actual_events:
        if e.get("task_id"):
            durations_by_task[e["task_id"]] += _minutes_between(e.get("start"), e.get("end"))

    adjustments: list[FeedbackEstimateAdjustment] = []
    for task in tasks:
        if not task.get("duration_minutes") or not task.get("id"):
            continue
        actual_minutes = durations_by_task.get(task["id"])
        if actual_minutes is None or actual_minutes <= 0:
            continue
        ratio = actual_minutes / task["duration_minutes"] if task.get("duration_minutes") else 0
        if ratio < 0.9 or ratio > 1.1:
            suggested = int(round(actual_minutes))
            delta = actual_minutes - task["duration_minutes"]
            adjustments.append(
                FeedbackEstimateAdjustment(
                    task_id=task["id"],
                    title=task.get("title"),
                    planned_minutes=task["duration_minutes"],
                    actual_minutes=round(actual_minutes, 1),
                    delta_minutes=round(delta, 1),
                    ratio=round(ratio, 2),
                    suggested_minutes=suggested,
                    note="Ajuster l'estimation pour coller à la réalité",
                )
            )

    bucket_hours: dict[str, float] = defaultdict(float)
    bucket_events: dict[str, int] = defaultdict(int)
    for e in actual_events:
        start_dt = e.get("start")
        label = _bucket_label(start_dt.hour)
        bucket_hours[label] += _hours_between(start_dt, e.get("end"))
        bucket_events[label] += 1

    habit_windows: list[FeedbackHabitWindow] = [
        FeedbackHabitWindow(window=label, events=bucket_events[label], hours=round(bucket_hours[label], 2))
        for label in bucket_hours
    ]
    habit_windows.sort(key=lambda h: h.hours, reverse=True)
    habit_windows = habit_windows[:3]

    return FeedbackStats(
        scope=scope,
        start=start,
        end=end,
        planned_hours=round(planned_hours, 2),
        actual_hours=round(actual_hours, 2),
        tasks_planned=len(tasks_in_scope),
        tasks_done=len(tasks_done),
        completion_rate=completion_rate,
        deferred_tasks=[
          {
                        "id": t.get("id", 0),
                        "title": t.get("title"),
                        "deadline": t.get("deadline"),
                        "status": t.get("status"),
                        "late_days": (start - t.get("deadline")).days if t.get("deadline") else None,
          }
          for t in deferred_tasks
        ],
        estimate_adjustments=adjustments,
        habit_windows=habit_windows,
    )
