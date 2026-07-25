from __future__ import annotations

from fastapi import APIRouter

from .. import storage
from ..models import ActivityLogEntry

router = APIRouter(tags=["activity"])


@router.get("/activity")
def list_activity() -> list[ActivityLogEntry]:
    db = storage.read_db()
    entries = db.get("activity", [])
    return sorted(entries, key=lambda e: e.get("timestamp", ""), reverse=True)
