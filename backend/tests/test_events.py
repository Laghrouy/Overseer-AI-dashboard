import pytest

from datetime import datetime, timedelta, timezone

from app.schemas import EventRead


async def auth_headers(client):
    email = "eventer@example.com"
    password = "secret123"
    await client.post("/api/auth/register", json={"email": email, "password": password})
    res = await client.post("/api/auth/login", data={"username": email, "password": password})
    res.raise_for_status()
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def iso_in(minutes: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(minutes=minutes)).isoformat()


@pytest.mark.anyio
async def test_event_crud(client):
    headers = await auth_headers(client)
    payload = {
        "title": "Réunion",
        "start": iso_in(10),
        "end": iso_in(70),
        "kind": "fixe",
        "category": "work",
    }
    res = await client.post("/api/events/", json=payload, headers=headers)
    assert res.status_code == 200
    event = EventRead.model_validate(res.json())
    event_id = event.id
    assert event.category == "work"

    res = await client.patch(f"/api/events/{event_id}", json={"title": "Maj"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["title"] == "Maj"

    res = await client.get("/api/events/", headers=headers)
    assert res.status_code == 200
    assert any(evt["id"] == event_id for evt in res.json())

    res = await client.delete(f"/api/events/{event_id}", headers=headers)
    assert res.status_code == 204
