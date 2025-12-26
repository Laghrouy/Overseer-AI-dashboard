from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Optional

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from .config import Settings

settings = Settings()
_client: Optional[AsyncIOMotorClient] = None


def get_client() -> AsyncIOMotorClient:
    if _client is None:
        raise RuntimeError("MongoDB client is not initialized. Call init_mongo() at startup.")
    return _client


def get_database() -> AsyncIOMotorDatabase:
    client = get_client()
    return client[settings.mongodb_db]


async def init_mongo(document_models: list[type] | None = None) -> None:
    """Initialize Mongo client and Beanie ODM.

    document_models can be provided when models are migrated to Beanie.
    """
    global _client
    if settings.mongodb_uri is None:
        raise RuntimeError("MONGODB_URI is not set in configuration")

    _client = AsyncIOMotorClient(settings.mongodb_uri)
    await init_beanie(database=_client[settings.mongodb_db], document_models=document_models or [])


@asynccontextmanager
async def mongo_lifespan(app):  # type: ignore[override]
    await init_mongo()
    try:
        yield
    finally:
        if _client is not None:
            _client.close()

