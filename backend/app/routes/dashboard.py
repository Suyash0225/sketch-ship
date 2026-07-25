from __future__ import annotations

from fastapi import APIRouter

from .. import storage

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/stats")
def dashboard_stats() -> dict:
    db = storage.read_db()
    incidents = db.get("incidents", [])

    # "filed"/"resolved" track Incident.status (the incident lifecycle), not
    # raw Takedown record count -- a single nuke files 3 Takedowns for one
    # incident, so counting incidents keeps the stat cards 1:1 with what the
    # creator actually sees in the Incidents list.
    return {
        "assets": len(db.get("assets", [])),
        "incidents": len(incidents),
        "filed": len([i for i in incidents if i.get("status") == "FILED"]),
        "resolved": len([i for i in incidents if i.get("status") == "RESOLVED"]),
    }
