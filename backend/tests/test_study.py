import pytest
from datetime import datetime, timedelta, timezone


async def auth_headers(client):
    email = "study@example.com"
    password = "secret123"
    await client.post("/api/auth/register", json={"email": email, "password": password})
    res = await client.post("/api/auth/login", data={"username": email, "password": password})
    res.raise_for_status()
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def in_days(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


@pytest.mark.asyncio
async def test_study_plan_and_sessions(client):
    headers = await auth_headers(client)

    subj_res = await client.post("/api/study/subjects", json={"name": "Maths", "ue_code": "UE101"}, headers=headers)
    assert subj_res.status_code == 200
    subject_id = subj_res.json()["id"]

    plan_res = await client.post(
        "/api/study/plan/generate",
        json={
            "subject_id": subject_id,
            "topics": ["Algèbre", "Analyse"],
            "exam_date": in_days(7),
            "session_minutes": 25,
            "sessions_per_day": 2,
        },
        headers=headers,
    )
    assert plan_res.status_code == 200
    plan = plan_res.json()
    assert plan["sessions"]

    due_res = await client.get("/api/study/sessions/due", headers=headers)
    assert due_res.status_code == 200
    due_sessions = due_res.json()
    assert isinstance(due_sessions, list)

    if due_sessions:
        sid = due_sessions[0]["id"]
        upd = await client.patch(
            f"/api/study/sessions/{sid}",
            json={"status": "done", "completed_at": iso_now(), "difficulty": 3},
            headers=headers,
        )
        assert upd.status_code == 200


@pytest.mark.asyncio
async def test_study_subject_and_plan_update_delete(client):
    headers = await auth_headers(client)

    # Création sujet
    subj_res = await client.post("/api/study/subjects", json={"name": "Bio", "ue_code": "UE202"}, headers=headers)
    assert subj_res.status_code == 200
    subject = subj_res.json()
    subject_id = subject["id"]

    # Mise à jour sujet
    upd_subj = await client.patch(
        f"/api/study/subjects/{subject_id}",
        json={"name": "Biologie avancée"},
        headers=headers,
    )
    assert upd_subj.status_code == 200
    assert upd_subj.json()["name"] == "Biologie avancée"

    # Génération d'un plan pour ce sujet
    plan_res = await client.post(
        "/api/study/plan/generate",
        json={
            "subject_id": subject_id,
            "topics": ["Cellule"],
            "exam_date": in_days(3),
            "session_minutes": 20,
            "sessions_per_day": 1,
        },
        headers=headers,
    )
    assert plan_res.status_code == 200
    plan = plan_res.json()
    plan_id = plan["id"]

    # Listing des plans
    list_res = await client.get(f"/api/study/plans?subject_id={subject_id}", headers=headers)
    assert list_res.status_code == 200
    plans = list_res.json()
    assert any(p["id"] == plan_id for p in plans)

    # Mise à jour du plan
    upd_plan = await client.patch(
        f"/api/study/plans/{plan_id}",
        json={"title": "Plan Bio"},
        headers=headers,
    )
    assert upd_plan.status_code == 200
    assert upd_plan.json()["title"] == "Plan Bio"

    # Suppression du plan
    del_plan = await client.delete(f"/api/study/plans/{plan_id}", headers=headers)
    assert del_plan.status_code == 204

    # Suppression du sujet (et entités liées)
    del_subj = await client.delete(f"/api/study/subjects/{subject_id}", headers=headers)
    assert del_subj.status_code == 204


@pytest.mark.asyncio
async def test_study_cards_and_review(client):
    headers = await auth_headers(client)
    subj_res = await client.post("/api/study/subjects", json={"name": "Physique"}, headers=headers)
    subject_id = subj_res.json()["id"]

    card_res = await client.post(
        "/api/study/cards",
        json={"subject_id": subject_id, "front": "F= ?", "back": "ma", "due_at": iso_now()},
        headers=headers,
    )
    assert card_res.status_code == 200
    card_id = card_res.json()["id"]

    due_res = await client.get("/api/study/cards/due", headers=headers)
    assert due_res.status_code == 200
    assert any(c["id"] == card_id for c in due_res.json())

    review_res = await client.post(f"/api/study/cards/{card_id}/review", json={"score": 4}, headers=headers)
    assert review_res.status_code == 200
    data = review_res.json()
    assert data["streak"] >= 0


@pytest.mark.asyncio
async def test_study_assist(client):
    headers = await auth_headers(client)
    res = await client.post(
        "/api/study/assist",
        json={"subject": "History", "topic": "WW2", "mode": "resume", "items": 3},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json().get("output")
