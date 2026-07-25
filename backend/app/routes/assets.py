from __future__ import annotations

import os

from fastapi import APIRouter, File, UploadFile

from .. import storage
from ..models import Asset, AssetFingerprint
from ..seed import generate_leak_for_asset
from ..services.gemini_vision import describe_asset
from ..utils import make_activity_entry, new_id, now_iso, sha256_of_bytes

router = APIRouter(tags=["assets"])


@router.get("/assets")
def list_assets() -> list[Asset]:
    db = storage.read_db()
    return db.get("assets", [])


@router.post("/assets")
async def upload_asset(file: UploadFile = File(...)) -> Asset:
    contents = await file.read()
    sha256 = sha256_of_bytes(contents)

    asset_id = new_id()
    _, ext = os.path.splitext(file.filename or "")
    ext = ext if ext else ".png"
    stored_filename = f"{asset_id}{ext}"
    stored_path = os.path.join(storage.UPLOADS_DIR, stored_filename)

    storage.ensure_dirs()
    with open(stored_path, "wb") as f:
        f.write(contents)

    fingerprint: AssetFingerprint = describe_asset(stored_path)

    asset = Asset(
        id=asset_id,
        filename=file.filename or stored_filename,
        sha256=sha256,
        uploaded_at=now_iso(),
        path=f"/uploads/{stored_filename}",
        fingerprint=fingerprint,
    )

    db = storage.read_db()
    db.setdefault("assets", []).append(asset.model_dump())
    db.setdefault("activity", []).append(
        make_activity_entry(
            "ASSET_UPLOADED",
            f"Uploaded asset '{asset.filename}' (sha256 {asset.sha256[:12]}...)",
        )
    )
    storage.write_db(db)

    # Synthesize one "leaked" variant of this asset so a subsequent /scan has
    # something of the user's own content to find, not just the 3 built-in
    # demo assets seeded on first boot.
    generate_leak_for_asset(stored_path, asset_id)

    return asset
