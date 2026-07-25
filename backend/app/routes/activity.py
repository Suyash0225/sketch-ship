from __future__ import annotations

from fastapi import APIRouter, Query, Response

from .. import storage
from ..models import ActivityLogEntry

router = APIRouter(tags=["activity"])


@router.get("/activity")
def list_activity(
    response: Response,
    limit: int | None = Query(None, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    action: str | None = None,
) -> list[ActivityLogEntry]:
    """Newest-first audit log. `limit` optional so the Activity page's
    "Export JSON" can still pull the complete record in one call."""
    db = storage.read_db()
    entries = sorted(
        db.get("activity", []), key=lambda e: e.get("timestamp", ""), reverse=True
    )

    if action:
        entries = [e for e in entries if e.get("action") == action]

    response.headers["X-Total-Count"] = str(len(entries))
    if limit is None:
        return entries[offset:]
    return entries[offset : offset + limit]
