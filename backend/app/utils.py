"""Small shared helpers: ids, timestamps, hashing."""
from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone


def new_id() -> str:
    return uuid.uuid4().hex


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_of_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def sha256_of_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def make_activity_entry(action: str, details: str, incident_id: str | None = None) -> dict:
    return {
        "id": new_id(),
        "timestamp": now_iso(),
        "action": action,
        "details": details,
        "incident_id": incident_id,
    }
