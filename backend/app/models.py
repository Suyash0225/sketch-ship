"""Pydantic data models for GhostTrace (see IMPLEMENTATION.md §4)."""
from __future__ import annotations

from pydantic import BaseModel


class CreatorProfile(BaseModel):
    name: str
    email: str
    address: str
    phone: str


class AssetFingerprint(BaseModel):
    subject: str
    dominant_colors: list[str]
    distinguishing_features: list[str]


class Asset(BaseModel):
    id: str
    filename: str
    sha256: str
    uploaded_at: str  # ISO 8601
    path: str
    fingerprint: AssetFingerprint | None = None


class MatchResult(BaseModel):
    match: bool
    similarity_score: int  # 0-100
    reasoning: str


class Incident(BaseModel):
    id: str
    asset_id: str
    platform: str  # "YouTube" | "X" | "Instagram" | real domain (Google-sourced)
    leak_image_path: str
    leak_url: str  # fake/mock URL for the demo, or a real page URL for Google-sourced incidents
    similarity_score: int
    reasoning: str
    status: str  # "DETECTED" | "FILED" | "IN_REVIEW" | "RESOLVED"
    detected_at: str
    source: str = "SYNTHETIC"  # "SYNTHETIC" (seeded /scan) | "GOOGLE_VISION" (real /web-scan)


class Takedown(BaseModel):
    id: str
    incident_id: str
    platform: str
    notice_text: str
    filed_at: str
    status: str  # "FILED" | "IN_REVIEW" | "RESOLVED" | "FAILED"


class ActivityLogEntry(BaseModel):
    id: str
    timestamp: str
    action: str  # "ASSET_UPLOADED" | "SCAN_RUN" | "INCIDENT_DETECTED" | "DMCA_FILED" | "NUKE_TRIGGERED"
    details: str
    incident_id: str | None = None
