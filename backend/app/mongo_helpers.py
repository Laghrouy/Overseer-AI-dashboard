from __future__ import annotations

from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument


async def get_next_id(db: AsyncIOMotorDatabase, name: str) -> int:
    """Atomic counter for integer IDs per collection name."""
    doc = await db["counters"].find_one_and_update(
        {"_id": name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return int(doc.get("seq", 1))


def strip_mongo_id(document: dict[str, Any]) -> dict[str, Any]:
    """Remove Mongo _id to avoid leaking ObjectId in responses."""
    document.pop("_id", None)
    return document
