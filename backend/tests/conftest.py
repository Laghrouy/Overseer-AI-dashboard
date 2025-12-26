import asyncio
import os
import sys
from pathlib import Path
from typing import AsyncIterator
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(PROJECT_ROOT))

# Force test backend to Mongo with an isolated database
TEST_DB_NAME = f"overseer_test_{uuid4().hex}"
os.environ.setdefault("MONGODB_URI", "mongodb://localhost:27017")
os.environ.setdefault("MONGODB_DB", TEST_DB_NAME)

from app.main import app  # noqa: E402
from app.deps import get_db, get_mongo_session  # noqa: E402
import app.db as db_module  # noqa: E402


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture(scope="session")
def event_loop() -> asyncio.AbstractEventLoop:
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def mongo_client():
    client = AsyncIOMotorClient(os.environ["MONGODB_URI"])
    yield client
    await client.drop_database(TEST_DB_NAME)
    client.close()


@pytest.fixture(scope="session", autouse=True)
def override_db(mongo_client):
    async def _get_db():
        db = mongo_client[TEST_DB_NAME]
        yield db

    # Inject client into the module-level cache and override dependencies
    db_module._mongo_client = mongo_client

    app.dependency_overrides[get_db] = _get_db
    app.dependency_overrides[get_mongo_session] = _get_db
    return _get_db


@pytest.fixture()
async def client(mongo_client) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
