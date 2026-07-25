from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import storage
from .routes import activity, assets, dashboard, incidents, profile
from .seed import run_seed_if_needed

app = FastAPI(title="GhostTrace API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    storage.ensure_dirs()
    run_seed_if_needed()


app.include_router(profile.router, prefix="/api")
app.include_router(assets.router, prefix="/api")
app.include_router(incidents.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(activity.router, prefix="/api")

# Static image mounts so the frontend can <img src="http://localhost:8000/uploads/...">
# and .../seed_leaks/... directly. Not under /api per IMPLEMENTATION.md §7.
storage.ensure_dirs()
app.mount("/uploads", StaticFiles(directory=storage.UPLOADS_DIR), name="uploads")
app.mount("/seed_leaks", StaticFiles(directory=storage.SEED_LEAKS_DIR), name="seed_leaks")


@app.get("/health")
def health() -> dict:
    return {"ok": True}
