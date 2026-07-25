# GhostTrace — Implementation Documentation

**Track 3: Life Admin — Legal & Compliance Assistance**
**Build window: 3 hours. One command to run: `docker compose up --build`.**

Elevator pitch: *"Every creator has had their work stolen. GhostTrace fingerprints your content, uses Gemini vision to spot leaked/re-uploaded copies across platforms, and one click — the Nuke button — files a complete DMCA takedown everywhere at once. 3 hours of admin work → 30 seconds."*

---

## 1. Architecture

```
┌─────────────────────────┐      HTTP (JSON/multipart)      ┌──────────────────────────┐
│   frontend (React/Vite)  │ ───────────────────────────────▶│   backend (FastAPI)      │
│   :5173 (host-mapped)    │◀─────────────────────────────── │   :8000 (host-mapped)    │
└─────────────────────────┘                                  └──────────┬───────────────┘
                                                                          │
                                                          calls Gemini    │  reads/writes
                                                          (vision+text)   ▼
                                                              ┌───────────────────────┐
                                                              │ Google AI Studio       │
                                                              │ (Gemini API)           │
                                                              └───────────────────────┘
                                                                          │
                                                                          ▼
                                                              ┌───────────────────────┐
                                                              │ backend/data/          │
                                                              │  - db.json (JSON "DB") │
                                                              │  - uploads/ (assets)   │
                                                              │  - seed_leaks/ (mock)  │
                                                              └───────────────────────┘
```

- **No real database.** A single JSON file (`backend/data/db.json`) acts as the store, read/written by a tiny repository module. This is a 3-hour hackathon build — a real DB buys nothing here.
- **No real web crawling.** "Detection" is simulated: we pre-seed a folder of mock "leaked" images (deliberately cropped / recolored / re-encoded variants of the demo assets, tagged with a fake platform: YouTube / X / Telegram). A `/api/scan` call runs Gemini vision comparisons between each real asset and each seeded leak to decide matches. This is the whole "monitoring" story for the demo.
- **Gemini does two jobs**: (1) vision comparison to detect/score leaks, (2) text generation to draft platform-specific DMCA notices.

---

## 2. Tech stack (decided — do not re-litigate mid-build)

| Layer | Choice | Why |
|---|---|---|
| Backend | Python 3.11 + FastAPI + Uvicorn | Fast to scaffold, native async, easy Gemini SDK integration, auto OpenAPI docs at `/docs` for quick manual testing |
| Vision/AI | Google AI Studio — **Gemini API** via `google-genai` SDK | Multimodal (image+image+text in one prompt) — lets us skip building a real embedding/similarity pipeline |
| Storage | JSON file + local filesystem for images | Zero setup, inspectable, good enough for a demo |
| Frontend | React + Vite + TypeScript + Tailwind CSS | Fast dev server, Tailwind gives "polished" look with near-zero design time |
| Containerization | Docker + docker-compose | User requirement: whole stack starts with **one command** |

---

## 3. Google AI Studio / Gemini vision integration

### 3.1 Getting the key
Already provisioned by the user in `backend/.env` (see §6). Get more / rotate at https://aistudio.google.com/apikey. **Never commit this file** — it's covered by `.gitignore` already (`.env` is ignored).

### 3.2 SDK
```
pip install google-genai pillow
```

### 3.3 Client init
```python
# backend/app/services/gemini_client.py
import os
from google import genai

_client: genai.Client | None = None

def get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.environ["GOOGLE_API_KEY"]
        _client = genai.Client(api_key=api_key)
    return _client

VISION_MODEL = "gemini-2.5-flash"
```

### 3.4 Job 1 — Describe an uploaded asset (acts as our "fingerprint")
Called once on upload. Produces a structured description we store next to the SHA-256 hash — this is what we show in the pitch as "semantic fingerprinting," standing in for a real CLIP/perceptual-hash pipeline.

```python
# backend/app/services/gemini_vision.py
from PIL import Image
from pydantic import BaseModel
from .gemini_client import get_client, VISION_MODEL

class AssetFingerprint(BaseModel):
    subject: str
    dominant_colors: list[str]
    distinguishing_features: list[str]

def describe_asset(image_path: str) -> AssetFingerprint:
    client = get_client()
    img = Image.open(image_path)
    resp = client.models.generate_content(
        model=VISION_MODEL,
        contents=[
            "Describe this image for content-identification purposes. "
            "Return JSON with keys: subject (string), dominant_colors "
            "(list of up to 4 color names), distinguishing_features "
            "(list of up to 5 short phrases naming unique visual traits "
            "useful for spotting re-uploads or edited copies of this exact image).",
            img,
        ],
        config={
            "response_mime_type": "application/json",
            "response_schema": AssetFingerprint,
        },
    )
    return AssetFingerprint.model_validate_json(resp.text)
```

### 3.5 Job 2 — Compare original vs. candidate leak (the "detection")
Called by `/api/scan` for every (asset, seeded-leak) pair.

```python
class MatchResult(BaseModel):
    match: bool
    similarity_score: int  # 0-100
    reasoning: str

def compare_images(original_path: str, candidate_path: str) -> MatchResult:
    client = get_client()
    original = Image.open(original_path)
    candidate = Image.open(candidate_path)
    resp = client.models.generate_content(
        model=VISION_MODEL,
        contents=[
            "You are a content-leak detector. Image A is original protected "
            "content. Image B is a candidate found on a public platform, "
            "possibly cropped, recolored, watermarked, or re-encoded from A. "
            "Decide if B is a copy/derivative of A. Return JSON with keys: "
            "match (boolean), similarity_score (integer 0-100), reasoning "
            "(one sentence).",
            "Image A (original):", original,
            "Image B (candidate):", candidate,
        ],
        config={
            "response_mime_type": "application/json",
            "response_schema": MatchResult,
        },
    )
    return MatchResult.model_validate_json(resp.text)
```
Threshold: `similarity_score >= 60` → create an `Incident`.

### 3.6 Job 3 — Draft the DMCA notice text (per platform)
Text-only call, same client/model, `contents=[prompt_string]`, no images. Prompt includes: creator profile (name/email/address), platform name, platform-specific required fields (see §5 `PLATFORM_TEMPLATES`), asset description, incident evidence (similarity score + reasoning). Returns plain text notice body.

### 3.7 Fallback if the API is slow/rate-limited during the demo
Wrap every Gemini call in a `try/except`; on failure, fall back to a canned/randomized-but-plausible response (fixed `similarity_score=87`, canned reasoning string, canned DMCA boilerplate). **Log to console which path was used** so it's obvious during rehearsal whether live calls are working. This is a hackathon demo — a network hiccup must never kill the live run.

---

## 4. Data model (Pydantic, mirrors JSON shape in `db.json`)

```python
class CreatorProfile(BaseModel):
    name: str
    email: str
    address: str
    phone: str

class Asset(BaseModel):
    id: str
    filename: str
    sha256: str
    uploaded_at: str  # ISO 8601
    path: str
    fingerprint: AssetFingerprint | None = None

class Incident(BaseModel):
    id: str
    asset_id: str
    platform: str  # "YouTube" | "X" | "Telegram"
    leak_image_path: str
    leak_url: str  # fake/mock URL for the demo, e.g. "https://youtube.com/watch?v=demo123"
    similarity_score: int
    reasoning: str
    status: str  # "DETECTED" | "FILED" | "IN_REVIEW" | "RESOLVED"
    detected_at: str

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
    action: str      # "ASSET_UPLOADED" | "SCAN_RUN" | "INCIDENT_DETECTED" | "DMCA_FILED" | "NUKE_TRIGGERED"
    details: str
```

`db.json` shape:
```json
{
  "profile": null,
  "assets": [],
  "incidents": [],
  "takedowns": [],
  "activity": []
}
```

---

## 5. Platform DMCA templates

Hardcode 3 platforms in `backend/app/services/platform_templates.py`:

```python
PLATFORM_TEMPLATES = {
    "YouTube": {
        "required_fields": ["video_url", "channel_name", "timestamp_of_infringement"],
        "submission_method": "Web form (copyright.youtube.com)",
    },
    "X": {
        "required_fields": ["tweet_url", "handle", "media_type"],
        "submission_method": "Web form (help.x.com/forms/dmca)",
    },
    "Telegram": {
        "required_fields": ["channel_or_chat_link", "message_link"],
        "submission_method": "Email (dmca@telegram.org)",
    },
}
```
Each generated notice is a plain-text block the UI renders in a `<pre>`/code block per platform tab, with a "Copy" button. There is no real submission — "Nuke" simulates filing to all 3 at once and flips each `Takedown.status` to `FILED`.

---

## 6. Environment variables

`backend/.env` (already created by user, **do not print its contents in any output**):
```
GOOGLE_API_KEY=<gemini api key>
```
`backend/.env.example` (committed, no secret):
```
GOOGLE_API_KEY=your-google-ai-studio-key-here
```

`frontend/.env` / `frontend/.env.example`:
```
VITE_API_URL=http://localhost:8000
```

---

## 7. REST API contract

Base URL: `http://localhost:8000/api`

| Method | Path | Body | Response | Notes |
|---|---|---|---|---|
| GET | `/profile` | — | `CreatorProfile \| null` | |
| POST | `/profile` | `CreatorProfile` | `CreatorProfile` | upsert, no auth |
| POST | `/assets` | multipart: `file` | `Asset` | computes sha256, calls Gemini `describe_asset`, logs activity |
| GET | `/assets` | — | `Asset[]` | |
| POST | `/scan` | — | `{ new_incidents: Incident[] }` | compares every asset vs every seeded leak image not yet matched, creates Incidents ≥60 score, logs activity |
| GET | `/incidents` | — | `Incident[]` | |
| GET | `/incidents/{id}` | — | `Incident` | 404 if missing |
| POST | `/incidents/{id}/dmca` | `{ platform: string }` | `{ notice_text: string }` | preview only, does not change status |
| POST | `/incidents/{id}/nuke` | — | `{ takedowns: Takedown[] }` | generates + "files" DMCA for **all 3 platforms**, creates 3 `Takedown` records, sets incident `status="FILED"`, logs activity |
| GET | `/dashboard/stats` | — | `{ assets: int, incidents: int, filed: int, resolved: int }` | |
| GET | `/activity` | — | `ActivityLogEntry[]` (newest first) | |
| GET | `/health` | — | `{ ok: true }` | for Docker healthcheck / frontend "backend reachable" indicator |

Images are served statically at `GET /uploads/{filename}` and `GET /seed_leaks/{filename}` (FastAPI `StaticFiles` mount) so the frontend can `<img src=>` them directly.

CORS: allow `http://localhost:5173` origin, all methods, all headers.

---

## 8. Frontend pages/components

| Route | Purpose |
|---|---|
| `/` | Dashboard — stat cards (assets/incidents/filed/resolved), recent activity strip, "Run Scan" button |
| `/onboarding` | First-run creator profile form (name/email/address/phone) → `POST /profile`; redirect to `/` after. Skip if profile already exists (check `GET /profile` on load) |
| `/assets` | Grid of uploaded assets with thumbnail, hash (truncated), upload date; drag-drop / file-input upload calling `POST /assets` |
| `/incidents` | List of detected incidents (thumbnail, platform badge, similarity score, status chip) |
| `/incidents/:id` | **Incident Room** — original vs. leaked image side-by-side, similarity score + Gemini reasoning, per-platform DMCA preview tabs (YouTube/X/Telegram), big red **"NUKE"** button that calls `/nuke` and animates all three platform cards flipping to "FILED" |
| `/activity` | Scrollable timeline of `ActivityLogEntry`, newest first, "Export JSON" button (client-side blob download, no backend needed) |

Shared: top nav bar with dashboard stats badge; toast notifications (simple custom hook, no extra lib needed) for "Asset uploaded", "Scan complete — N new incidents", "Takedown filed on 3 platforms".

`frontend/src/lib/api.ts` — one fetch wrapper per endpoint in §7, typed with the interfaces mirroring §4.

---

## 9. Repo layout

```
sketch-ship/                      (this repo)
├── IMPLEMENTATION.md             (this file)
├── docker-compose.yml
├── README.md                     (one-command run instructions)
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env                      (secret, gitignored — already present)
│   ├── .env.example
│   └── app/
│       ├── main.py               (FastAPI app, CORS, static mounts, router includes)
│       ├── models.py             (§4 Pydantic models)
│       ├── storage.py            (JSON db read/write helpers)
│       ├── seed.py               (creates demo assets + seed_leaks on first boot)
│       ├── routes/
│       │   ├── profile.py
│       │   ├── assets.py
│       │   ├── incidents.py
│       │   ├── dashboard.py
│       │   └── activity.py
│       └── services/
│           ├── gemini_client.py
│           ├── gemini_vision.py
│           ├── platform_templates.py
│           └── dmca.py           (notice text generation)
│   └── data/
│       ├── db.json               (created at runtime if absent)
│       ├── uploads/
│       └── seed_leaks/
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── .env.example
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── lib/api.ts
        ├── pages/ (Dashboard, Onboarding, Assets, Incidents, IncidentRoom, Activity)
        └── components/ (NavBar, StatCard, Toast, IncidentCard, DmcaPreview, NukeButton, ...)
```

---

## 10. Docker — one command

```
docker compose up --build
```
starts:
- `backend` → `http://localhost:8000` (FastAPI + Uvicorn, `--reload` off in container for stability)
- `frontend` → `http://localhost:5173` (Vite dev server, `--host 0.0.0.0` so it's reachable from outside the container)

`docker-compose.yml` (root):
```yaml
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file:
      - ./backend/.env
    volumes:
      - ./backend/data:/app/data
  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:8000
    depends_on:
      - backend
```

Backend seeds demo data (a handful of synthetic "asset" images + matching "leaked" variants) into `data/` on first startup if `db.json` doesn't exist yet, so the demo has content without manual setup.

---

## 11. Seed / demo data plan

We don't have real leaked content, so we **generate synthetic placeholder images** at backend startup (`app/seed.py`) using Pillow: solid-color canvases with bold text (e.g. "DEMO ASSET 1") plus a couple of shapes, saved as the "original" assets. For each original, generate 1-2 "leaked" variants by cropping, rotating slightly, or shifting hue, saved into `seed_leaks/` tagged with a random platform. This gives Gemini real (if synthetic) pixel differences to reason about, rather than faking the comparison result entirely — keeps the "AI vision" claim honest for judges who ask.

---

## 12. Three-hour build timeline (parallel tracks)

Both tracks work against the API contract in §7 from minute 0 — that contract is the sync point, not a shared codebase.

| Time | Backend track | Frontend track |
|---|---|---|
| 0:00–0:20 | Scaffold FastAPI app, `models.py`, `storage.py`, `/health`, Dockerfile | Scaffold Vite+React+TS+Tailwind, router, NavBar, `api.ts` stubs against §7 |
| 0:20–0:50 | `seed.py` synthetic image generator, `/assets` upload + sha256 + Gemini `describe_asset` | Onboarding form, Dashboard shell with stat cards (static data first) |
| 0:50–1:20 | Gemini `compare_images`, `/scan` endpoint, Incident model wiring | Assets grid page wired to real `/assets` |
| 1:20–1:50 | `/incidents`, `/incidents/{id}`, `/dashboard/stats`, `/activity` | Incidents list page + Incident Room layout (side-by-side images) |
| **1:50** | **Sync point: both run `docker compose up`, confirm frontend can list assets/incidents from real backend** ||
| 1:50–2:20 | DMCA text generation (`/incidents/{id}/dmca`), platform templates, `/nuke` | Incident Room: DMCA preview tabs + Nuke button wired to `/nuke`, toasts |
| 2:20–2:40 | Gemini fallback/error handling hardening, activity logging everywhere | Activity page, polish stat cards/animations |
| 2:40–3:00 | **Final integration**: full `docker compose up --build` run-through, fix CORS/field-name mismatches | Same — joint smoke test, rehearse demo click-path |

---

## 13. Demo script (30-second hook + walkthrough)

> *"Every creator has had their work stolen. And every creator knows the nightmare — hours of Googling DMCA templates and filing forms per platform. GhostTrace changes that."*

1. Show Dashboard — empty stats.
2. Upload a demo asset — show SHA-256 + Gemini's fingerprint description appear.
3. Click **Run Scan** — toast: "Scan complete — 2 new incidents detected."
4. Open an Incident → Incident Room: original vs. leaked side-by-side, Gemini's similarity score + one-sentence reasoning.
5. Show DMCA preview tabs for YouTube / X / Telegram — pre-filled, platform-correct fields.
6. Hit **NUKE** — all three flip to "FILED" with an animation; toast: "Takedown filed on 3 platforms."
7. Activity log — full audit trail, exportable.
8. Close: *"3 hours of admin work → 30 seconds. That's GhostTrace."*

---

## 14. Explicitly out of scope for this build (say it, don't build it)

Real authentication, blockchain/Arweave timestamping, real perceptual hashing/CLIP, real platform API submission, push notifications, mobile-responsive polish. Mention these as "production roadmap" if asked by judges — do not spend build time on them.
