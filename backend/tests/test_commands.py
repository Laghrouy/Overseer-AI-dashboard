import pytest

from tests.test_tasks import register_and_login


@pytest.mark.asyncio
async def test_command_success(client):
    headers = await register_and_login(client)

    res = await client.post("/api/commands", json={"command": "deploy", "args": ["staging"]}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "deploy staging" in data["output"]


@pytest.mark.asyncio
async def test_command_empty_rejected(client):
    headers = await register_and_login(client)

    res = await client.post("/api/commands", json={"command": "   "}, headers=headers)
    assert res.status_code == 400
    assert "Commande vide" in res.text
