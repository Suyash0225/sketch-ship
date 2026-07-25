"""Tiny JSON-file "database" for GhostTrace.

No real DB for a 3-hour hackathon build — a single JSON file on disk,
guarded by an in-process lock so concurrent requests don't corrupt it.
"""
from __future__ import annotations

import json
import os
import threading
from typing import Any

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # backend/
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "db.json")
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
SEED_LEAKS_DIR = os.path.join(DATA_DIR, "seed_leaks")
# sidecar metadata for generated seed leaks (platform tag + fake leak url per
# leak image) -- lives alongside db.json rather than inside seed_leaks/ so it
# never gets served by the static files mount.
SEED_LEAKS_META_PATH = os.path.join(DATA_DIR, "seed_leaks_meta.json")

_lock = threading.Lock()

EMPTY_DB: dict[str, Any] = {
    "profile": None,
    "assets": [],
    "incidents": [],
    "takedowns": [],
    "activity": [],
}


def db_exists() -> bool:
    return os.path.exists(DB_PATH)


def ensure_dirs() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    os.makedirs(SEED_LEAKS_DIR, exist_ok=True)


def init_db_if_missing() -> None:
    ensure_dirs()
    if not db_exists():
        write_db(dict(EMPTY_DB))


def read_db() -> dict[str, Any]:
    with _lock:
        if not db_exists():
            ensure_dirs()
            write_db_unlocked(dict(EMPTY_DB))
        with open(DB_PATH, "r", encoding="utf-8") as f:
            return json.load(f)


def write_db_unlocked(data: dict[str, Any]) -> None:
    ensure_dirs()
    tmp_path = DB_PATH + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)
    os.replace(tmp_path, DB_PATH)


def write_db(data: dict[str, Any]) -> None:
    with _lock:
        write_db_unlocked(data)


def read_seed_leaks_meta() -> list[dict[str, Any]]:
    if not os.path.exists(SEED_LEAKS_META_PATH):
        return []
    with open(SEED_LEAKS_META_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def append_seed_leak(entry: dict[str, Any]) -> None:
    with _lock:
        existing: list[dict[str, Any]] = []
        if os.path.exists(SEED_LEAKS_META_PATH):
            with open(SEED_LEAKS_META_PATH, "r", encoding="utf-8") as f:
                existing = json.load(f)
        existing.append(entry)
        tmp_path = SEED_LEAKS_META_PATH + ".tmp"
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(existing, f, indent=2)
        os.replace(tmp_path, SEED_LEAKS_META_PATH)
