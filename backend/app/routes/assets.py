from __future__ import annotations

import os

from fastapi import APIRouter, File, HTTPException, Query, Response, UploadFile

from .. import storage
from ..models import Asset, AssetFingerprint
from ..seed import generate_leak_for_asset
from ..services.gemini_vision import describe_asset
from ..utils import make_activity_entry, new_id, now_iso, sha256_of_bytes

router = APIRouter(tags=["assets"])


def _matches_query(asset: dict, needle: str) -> bool:
    """Search across filename, hash and the Gemini fingerprint text."""
    fp = asset.get("fingerprint") or {}
    haystack = " ".join(
        [
            asset.get("filename", ""),
            asset.get("sha256", ""),
            fp.get("subject", "") or "",
            " ".join(fp.get("dominant_colors") or []),
            " ".join(fp.get("distinguishing_features") or []),
        ]
    ).lower()
    return needle in haystack


@router.get("/assets")
def list_assets(
    response: Response,
    limit: int | None = Query(None, ge=1, le=500),
    offset: int = Query(0, ge=0),
    q: str | None = None,
    sort: str = Query("newest", pattern="^(newest|oldest|name)$"),
) -> list[Asset]:
    """Paginated + searchable asset list.

    `limit` is deliberately optional: omitting it returns everything, which
    keeps older callers (IncidentRoom resolves an incident's asset out of the
    full list) working unchanged. The total count before slicing goes out in
    X-Total-Count so the UI can drive infinite scroll without a second call.
    """
    db = storage.read_db()
    assets: list[dict] = list(db.get("assets", []))

    if q:
        needle = q.strip().lower()
        assets = [a for a in assets if _matches_query(a, needle)]

    if sort == "name":
        assets.sort(key=lambda a: (a.get("filename") or "").lower())
    else:
        assets.sort(key=lambda a: a.get("uploaded_at") or "", reverse=(sort == "newest"))

    response.headers["X-Total-Count"] = str(len(assets))
    if limit is None:
        return assets[offset:]
    return assets[offset : offset + limit]


# The whole upload is read into memory to hash it, so cap it. The frontend
# downscales oversized images before sending, making this a backstop against
# direct/curl uploads rather than something a normal user should ever hit.
MAX_UPLOAD_BYTES = 25 * 1024 * 1024


@router.post("/assets")
async def upload_asset(file: UploadFile = File(...)) -> Asset:
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File is {len(contents) / 1048576:.1f} MB — the limit is "
            f"{MAX_UPLOAD_BYTES // 1048576} MB.",
        )
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
