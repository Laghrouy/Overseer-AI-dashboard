from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from .config import Settings

settings = Settings()

_mongo_client: Optional[AsyncIOMotorClient] = None


def get_mongo_client() -> AsyncIOMotorClient:
    if _mongo_client is None:
        raise RuntimeError("MongoDB client not initialized")
    return _mongo_client


def get_mongo_db() -> AsyncIOMotorDatabase:
    client = get_mongo_client()
    return client[settings.mongodb_db]


@asynccontextmanager
async def lifespan(app):  # type: ignore[override]
    global _mongo_client
    if settings.mongodb_uri is None:
        raise RuntimeError("MONGODB_URI must be set (Mongo backend)")
    _mongo_client = AsyncIOMotorClient(settings.mongodb_uri)
    try:
        yield
    finally:
        _mongo_client.close()


async def get_mongo_session() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    db = get_mongo_db()
    yield db
