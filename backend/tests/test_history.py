import pytest
from datetime import datetime, timedelta, timezone


async def auth_headers(client):
    email = "history@example.com"
    password = "secret123"
    await client.post("/api/auth/register", json={"email": email, "password": password})
    res = await client.post("/api/auth/login", data={"username": email, "password": password})
    res.raise_for_status()
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def iso_in(minutes: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(minutes=minutes)).isoformat()


@pytest.mark.anyio
async def test_history_aggregates_data(client):
    headers = await auth_headers(client)

    # Seed minimal data for each section
    project_res = await client.post("/api/projects/", json={"name": "History Project"}, headers=headers)
    assert project_res.status_code == 200
    project_id = project_res.json()["id"]

    task_res = await client.post(
        "/api/tasks/",
        json={"title": "History Task", "project_id": project_id, "priority": "normale"},
        headers=headers,
    )
    assert task_res.status_code == 200

    event_payload = {
        "title": "History Event",
        "start": iso_in(5),
        "end": iso_in(65),
        "kind": "fixe",
    }
    event_res = await client.post("/api/events/", json=event_payload, headers=headers)
    assert event_res.status_code == 200

    chat_res = await client.post("/api/agent/chat", json={"message": "ping"}, headers=headers)
    assert chat_res.status_code == 200

    history_res = await client.get("/api/history", headers=headers)
    assert history_res.status_code == 200
    history = history_res.json()

    assert history["tasks"], "tasks should be present"
    assert history["events"], "events should be present"
    assert history["projects"], "projects should be present"
    assert history["agent_logs"], "agent logs should be present"

    # Basic shape checks on first items
    first_task = history["tasks"][0]
    assert first_task["title"] == "History Task"
    assert first_task["status"] in {"a_faire", "en_cours", "terminee"}

    first_event = history["events"][0]
    assert first_event["title"] == "History Event"
    assert "start" in first_event and "end" in first_event

    first_project = history["projects"][0]
    assert first_project["name"] == "History Project"

    first_log = history["agent_logs"][0]
    assert first_log["action"]
    assert first_log["created_at"]
