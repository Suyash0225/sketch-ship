from __future__ import annotations

import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .. import storage
from ..models import Asset, CreatorProfile, Incident, Takedown
from ..services.dmca import generate_dmca_notice
from ..services.gemini_vision import compare_images
from ..services.platform_templates import PLATFORM_TEMPLATES
from ..utils import make_activity_entry, new_id, now_iso

router = APIRouter(tags=["incidents"])

MATCH_THRESHOLD = 60

DEFAULT_PROFILE = CreatorProfile(
    name="GhostTrace Demo Creator",
    email="creator@example.com",
    address="123 Creator Ave, Internet",
    phone="+1-555-0100",
)


def _find_asset(db: dict, asset_id: str) -> Asset:
    for a in db.get("assets", []):
        if a["id"] == asset_id:
            return Asset(**a)
    # defensive fallback -- should not happen in normal flow
    return Asset(id=asset_id, filename="unknown", sha256="", uploaded_at=now_iso(), path="", fingerprint=None)


def _get_profile(db: dict) -> CreatorProfile:
    profile = db.get("profile")
    if profile is None:
        return DEFAULT_PROFILE
    return CreatorProfile(**profile)


@router.post("/scan")
def run_scan() -> dict:
    db = storage.read_db()
    seed_leaks = storage.read_seed_leaks_meta()

    already_incidented_paths = {inc["leak_image_path"] for inc in db.get("incidents", [])}

    new_incidents: list[Incident] = []

    for leak in seed_leaks:
        leak_web_path = leak["leak_path"]
        if leak_web_path in already_incidented_paths:
            continue  # this leak was already turned into an incident in a prior scan

        leak_fs_path = os.path.join(storage.SEED_LEAKS_DIR, leak["leak_filename"])
        if not os.path.exists(leak_fs_path):
            continue

        # Compare against every asset and keep the best-scoring match rather
        # than stopping at the first one that clears the threshold -- with
        # several template-like demo assets, more than one can score >=60,
        # and we want the incident attributed to the truest match.
        best_asset = None
        best_result = None
        for asset in db.get("assets", []):
            asset_filename = os.path.basename(asset["path"])
            asset_fs_path = os.path.join(storage.UPLOADS_DIR, asset_filename)
            if not os.path.exists(asset_fs_path):
                continue

            result = compare_images(asset_fs_path, leak_fs_path)
            if best_result is None or result.similarity_score > best_result.similarity_score:
                best_asset = asset
                best_result = result

        if best_result is not None and best_result.similarity_score >= MATCH_THRESHOLD:
            incident = Incident(
                id=new_id(),
                asset_id=best_asset["id"],
                platform=leak["platform"],
                leak_image_path=leak_web_path,
                leak_url=leak["leak_url"],
                similarity_score=best_result.similarity_score,
                reasoning=best_result.reasoning,
                status="DETECTED",
                detected_at=now_iso(),
            )
            db.setdefault("incidents", []).append(incident.model_dump())
            new_incidents.append(incident)
            db.setdefault("activity", []).append(
                make_activity_entry(
                    "INCIDENT_DETECTED",
                    f"Detected leak on {incident.platform} "
                    f"(score {incident.similarity_score}) for asset {best_asset['id']}",
                    incident_id=incident.id,
                )
            )

    db.setdefault("activity", []).append(
        make_activity_entry(
            "SCAN_RUN",
            f"Scan completed: {len(new_incidents)} new incident(s) detected",
        )
    )
    storage.write_db(db)

    return {"new_incidents": [i.model_dump() for i in new_incidents]}


@router.get("/incidents")
def list_incidents() -> list[Incident]:
    db = storage.read_db()
    return db.get("incidents", [])


@router.get("/incidents/{incident_id}")
def get_incident(incident_id: str) -> Incident:
    db = storage.read_db()
    for inc in db.get("incidents", []):
        if inc["id"] == incident_id:
            return inc
    raise HTTPException(status_code=404, detail="Incident not found")


@router.get("/incidents/{incident_id}/takedowns")
def get_incident_takedowns(incident_id: str) -> list[Takedown]:
    db = storage.read_db()
    if not any(inc["id"] == incident_id for inc in db.get("incidents", [])):
        raise HTTPException(status_code=404, detail="Incident not found")
    return [t for t in db.get("takedowns", []) if t["incident_id"] == incident_id]


class DmcaPreviewRequest(BaseModel):
    platform: str


@router.post("/incidents/{incident_id}/dmca")
def preview_dmca(incident_id: str, body: DmcaPreviewRequest) -> dict:
    db = storage.read_db()
    incident_dict = None
    for inc in db.get("incidents", []):
        if inc["id"] == incident_id:
            incident_dict = inc
            break
    if incident_dict is None:
        raise HTTPException(status_code=404, detail="Incident not found")

    if body.platform not in PLATFORM_TEMPLATES:
        raise HTTPException(status_code=400, detail=f"Unknown platform '{body.platform}'")

    incident = Incident(**incident_dict)
    asset = _find_asset(db, incident.asset_id)
    profile = _get_profile(db)

    notice_text = generate_dmca_notice(profile, body.platform, asset, incident)
    return {"notice_text": notice_text}


@router.post("/incidents/{incident_id}/nuke")
def nuke_incident(incident_id: str) -> dict:
    db = storage.read_db()
    incident_idx = None
    for idx, inc in enumerate(db.get("incidents", [])):
        if inc["id"] == incident_id:
            incident_idx = idx
            break
    if incident_idx is None:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident = Incident(**db["incidents"][incident_idx])
    asset = _find_asset(db, incident.asset_id)
    profile = _get_profile(db)

    takedowns: list[Takedown] = []
    for platform in PLATFORM_TEMPLATES.keys():
        notice_text = generate_dmca_notice(profile, platform, asset, incident)
        takedown = Takedown(
            id=new_id(),
            incident_id=incident.id,
            platform=platform,
            notice_text=notice_text,
            filed_at=now_iso(),
            status="FILED",
        )
        db.setdefault("takedowns", []).append(takedown.model_dump())
        takedowns.append(takedown)
        db.setdefault("activity", []).append(
            make_activity_entry(
                "DMCA_FILED",
                f"DMCA notice filed on {platform} for incident {incident.id}",
                incident_id=incident.id,
            )
        )

    db["incidents"][incident_idx]["status"] = "FILED"

    db.setdefault("activity", []).append(
        make_activity_entry(
            "NUKE_TRIGGERED",
            f"Nuke triggered for incident {incident.id}: filed on all {len(takedowns)} platforms",
            incident_id=incident.id,
        )
    )

    storage.write_db(db)

    return {"takedowns": [t.model_dump() for t in takedowns]}
