from __future__ import annotations

from fastapi import APIRouter

from .. import storage
from ..models import CreatorProfile

router = APIRouter(tags=["profile"])


@router.get("/profile")
def get_profile() -> CreatorProfile | None:
    db = storage.read_db()
    profile = db.get("profile")
    return profile


@router.post("/profile")
def upsert_profile(profile: CreatorProfile) -> CreatorProfile:
    db = storage.read_db()
    db["profile"] = profile.model_dump()
    storage.write_db(db)
    return profile
