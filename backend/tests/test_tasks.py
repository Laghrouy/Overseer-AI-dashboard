import pytest


async def register_and_login(client):
    email = "test@example.com"
    password = "secret123"
    await client.post("/api/auth/register", json={"email": email, "password": password})
    res = await client.post("/api/auth/login", data={"username": email, "password": password})
    res.raise_for_status()
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_task_crud(client):
    headers = await register_and_login(client)

    payload = {
        "title": "Nouvelle tâche",
        "description": "Avec attributs enrichis",
        "priority": "haute",
        "duration_minutes": 45,
        "category": "test",
        "energy": 5,
        "order_index": 1,
    }
    res = await client.post("/api/tasks/", json=payload, headers=headers)
    assert res.status_code == 200
    task = res.json()
    assert task["title"] == payload["title"]
    assert task["category"] == "test"
    task_id = task["id"]

    res = await client.patch(f"/api/tasks/{task_id}", json={"status": "terminee"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "terminee"

    res = await client.delete(f"/api/tasks/{task_id}", headers=headers)
    assert res.status_code == 204


@pytest.mark.asyncio
async def test_task_dependencies_and_parent(client):
    headers = await register_and_login(client)
    # parent task
    parent_res = await client.post("/api/tasks/", json={"title": "Parent"}, headers=headers)
    parent_id = parent_res.json()["id"]

    child_res = await client.post(
        "/api/tasks/",
        json={
          "title": "Child",
          "parent_task_id": parent_id,
          "dependencies": [parent_id],
          "priority": "normale",
        },
        headers=headers,
    )
    assert child_res.status_code == 200
    child = child_res.json()
    assert child["parent_task_id"] == parent_id
    assert parent_id in child.get("dependencies", [])
