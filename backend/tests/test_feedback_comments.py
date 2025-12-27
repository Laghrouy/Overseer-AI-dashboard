import os
from bson import ObjectId
import pytest

from tests.test_tasks import register_and_login


@pytest.mark.asyncio
async def test_feedback_comment_requires_auth(client):
    res = await client.post(
        "/api/feedback/comments",
        json={
            "category": "suggestion",
            "summary": "Test",
            "details": "Détails",
        },
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_feedback_comment_creation(client, mongo_client):
    headers = await register_and_login(client)
    payload = {
        "category": "bug",
        "summary": "Impossible d'ouvrir le chat",
        "details": "Le bouton ne répond pas",
        "reproduction": "Onglet Dashboard > Cliquer sur Chat",
        "contact": "bug@example.com",
    }

    res = await client.post("/api/feedback/comments", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["category"] == payload["category"]
    assert data["summary"] == payload["summary"]
    assert data["details"] == payload["details"]
    assert "id" in data
    assert "created_at" in data
    assert data["owner_id"] > 0

    db = mongo_client[os.environ["MONGODB_DB"]]
    inserted = await db["dev_comments"].find_one({"_id": ObjectId(data["id"])})
    assert inserted is not None
    assert inserted.get("category") == payload["category"]


@pytest.mark.asyncio
async def test_feedback_comment_invalid_payload(client):
    headers = await register_and_login(client)
    res = await client.post(
        "/api/feedback/comments",
        json={
            "category": "suggestion",
            "summary": "",  # summary vide
            "details": "",
        },
        headers=headers,
    )
    assert res.status_code == 422
*** End of File