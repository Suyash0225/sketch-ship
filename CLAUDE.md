# GhostTrace — Project Context for Claude

> Handoff doc. Read this first, then [IMPLEMENTATION.md](./IMPLEMENTATION.md) for the original spec.
> Where this file and IMPLEMENTATION.md disagree, **this file wins** — IMPLEMENTATION.md is the pre-build plan, this describes what actually got built.

---

## 1. What this is

**GhostTrace** — automated leak detection + DMCA takedown filing for content creators.

Built for a 3-hour hackathon, **Track 3: Life Admin — Legal & Compliance Assistance**.

Pitch: *"Every creator has had their work stolen. GhostTrace fingerprints your content, uses Gemini vision to spot leaked/re-uploaded copies across platforms, and one click — the Nuke button — files a complete DMCA takedown everywhere at once. 3 hours of admin work → 30 seconds."*

Demo click-path: upload asset → Run Scan → open Incident → review side-by-side match + AI reasoning → hit **NUKE** → all 3 platforms flip to FILED → export audit log.

---

## 2. Known traps (previously broken, now fixed — don't regress these)

### `frontend/src/lib/` is gitignore-cursed

[.gitignore:17](./.gitignore#L17) contains `lib/` (inherited from the Python gitignore template), which silently matches `frontend/src/lib/`. Both `api.ts` and `format.ts` were lost this way once — every page imports them, so the frontend could not build at all.

A negation was appended at the bottom of `.gitignore` (`!frontend/src/lib/`, `!frontend/src/lib/**`). **Do not remove it**, and verify with `git add -n frontend/src/lib/api.ts` after touching `.gitignore`.

`lib/api.ts` export surface, as consumed across `frontend/src`:

| Export | Kind | Used by |
|---|---|---|
| `ApiError` | class | every page |
| `getProfile`, `postProfile` | fn | App.tsx, Onboarding |
| `getAssets`, `postAsset` | fn | Assets, IncidentRoom |
| `postScan` | fn | Dashboard |
| `postWebScan` | fn | Assets |
| `getIncidents`, `getIncident` | fn | Incidents, IncidentRoom |
| `getTakedowns` | fn | IncidentRoom |
| `postDmcaPreview`, `postNuke` | fn | IncidentRoom |
| `getDashboardStats` | fn | AppStatusContext |
| `getActivity` | fn | Dashboard, Activity |
| `uploadUrl`, `seedLeakUrl` | fn | Assets, Incidents, IncidentRoom |
| `CreatorProfile`, `Asset`, `Incident`, `Takedown`, `ActivityLogEntry`, `DashboardStats`, `Platform` | type | various |

`Platform` is a union of `"YouTube" | "X" | "Instagram"`. Base URL comes from `import.meta.env.VITE_API_URL`. `uploadUrl`/`seedLeakUrl` build absolute image URLs against the backend (`${base}/uploads/${file}`, `${base}/seed_leaks/${file}`) — note these are **not** under `/api`.

`lib/format.ts` exports `formatDate`, `timeAgo`, `caseNo`.

### ⚠️ Live bug: `source` enum drift between backend and frontend

The backend now writes `Incident.source = "SERPAPI"` ([incidents.py:162](./backend/app/routes/incidents.py#L162)), but the UI still compares against the old `"GOOGLE_VISION"` value in three places — [IncidentRoom.tsx:228](./frontend/src/pages/IncidentRoom.tsx#L228), [IncidentRoom.tsx:278](./frontend/src/pages/IncidentRoom.tsx#L278), [Incidents.tsx:102](./frontend/src/pages/Incidents.tsx#L102).

Effect: the `GoogleVisionBadge` never renders on real matches, and the Incident Room credits "Gemini vision analysis" for findings that actually came from SerpApi. `db.json` contains rows with **both** values, so any fix must handle both. `api.ts` types `source` as the union of all three for this reason.

### `.env` files are gitignored (expected)

`backend/.env` and `frontend/.env` exist locally but are correctly gitignored. Templates: [backend/.env.example](./backend/.env.example), [frontend/.env.example](./frontend/.env.example). Never print their contents.

The repo-root [.env](./.env) holds an unrelated `OPENROUTER_API_KEY`, used only by [code.py](./code.py) — an untracked OpenRouter smoke test, **not part of the app**.

---

## 3. Run it

**Docker is not installed on this machine**, so the README's `docker compose up --build` does not work here. Run natively instead, two terminals:

```bash
# backend — from backend/
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# frontend — from frontend/
npm run dev
```

- Frontend: http://localhost:5173
- Backend + Swagger docs: http://localhost:8000/docs

Note `python -m uvicorn`, not bare `uvicorn` — the Scripts dir isn't on PATH. Verified working on Python 3.14.6 / Node 24.18.0 (the Dockerfile pins 3.11 / node 20, but all wheels install cleanly on 3.14).

[gemini_client.py:12](./backend/app/services/gemini_client.py#L12) hand-rolls a `.env` parser precisely so bare `uvicorn` works outside Docker. `frontend/.env` must exist with `VITE_API_URL=http://localhost:8000`, since compose normally injects it.

Backend auto-seeds synthetic demo assets + leak variants on first boot if `db.json` is absent ([seed.py](./backend/app/seed.py)).

---

## 4. Architecture

```
frontend (React 19 + Vite + TS + Tailwind 4)  :5173
        │  HTTP JSON / multipart
        ▼
backend (FastAPI + Uvicorn, Python 3.11)      :8000
        │
        ├──► Google AI Studio / Gemini  (vision compare + DMCA text gen)
        ├──► Google Cloud Vision Web Detection  (optional real reverse-image search)
        └──► backend/data/{db.json, uploads/, seed_leaks/}
```

Deliberate design decisions — **do not "improve" these**, they're intentional hackathon scope:

- **No database.** A single `backend/data/db.json` file is the store, via [storage.py](./backend/app/storage.py).
- **No auth.** Single implicit user.
- **No real crawling** in the default path. `/api/scan` compares uploaded assets against pre-seeded synthetic "leak" images. The *vision matching is real Gemini*; only the discovery step is simulated. Be honest about this — it's the documented story ([IMPLEMENTATION.md §35](./IMPLEMENTATION.md#L35)).
- **No real DMCA submission.** "Nuke" generates real notice text and flips local status to `FILED`.
- **Fail-soft everywhere.** Every Gemini/Vision call is wrapped in try/except with a canned fallback, and logs which path was taken (`LIVE ok` vs `FALLBACK`). A network hiccup must never kill a live demo.

---

## 5. Backend map

```
backend/app/
├── main.py                 FastAPI app, CORS (localhost:5173), static mounts, startup seed
├── models.py               Pydantic models (§6)
├── storage.py              db.json read/write, UPLOADS_DIR / SEED_LEAKS_DIR
├── seed.py                 Pillow-generated synthetic assets + leak variants on first boot
├── utils.py                new_id(), now_iso(), make_activity_entry()
├── routes/
│   ├── profile.py          GET/POST /api/profile
│   ├── assets.py           GET/POST /api/assets
│   ├── incidents.py        /scan, /web-scan, /incidents*, /dmca, /nuke
│   ├── dashboard.py        GET /api/dashboard/stats
│   └── activity.py         GET /api/activity
└── services/
    ├── gemini_client.py    client singleton, model pin, hand-rolled .env loader
    ├── gemini_vision.py    describe_asset() fingerprint, compare_images() match
    ├── serpapi_web_detection.py  SerpApi Google Lens reverse image search (§7)
    ├── platform_templates.py    YouTube / X / Instagram DMCA metadata
    └── dmca.py             notice text generation
```

### Endpoints (all under `/api` except health + static)

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{ok: true}` |
| GET/POST | `/api/profile` | upsert creator profile |
| GET/POST | `/api/assets` | POST is multipart `file`; computes sha256 + Gemini fingerprint |
| POST | `/api/scan` | synthetic scan — all assets × all unmatched seed leaks, score ≥60 → Incident |
| POST | `/api/assets/{id}/web-scan` | **real** reverse image search (§7) |
| GET | `/api/incidents` | |
| GET | `/api/incidents/{id}` | 404 if missing |
| GET | `/api/incidents/{id}/takedowns` | |
| POST | `/api/incidents/{id}/dmca` | body `{platform}`, preview only, no state change |
| POST | `/api/incidents/{id}/nuke` | files all 3 platforms, creates 3 Takedowns, incident → `FILED` |
| GET | `/api/dashboard/stats` | `{assets, incidents, filed, resolved}` |
| GET | `/api/activity` | newest first |
| GET | `/uploads/{f}`, `/seed_leaks/{f}` | StaticFiles mounts — **not** under `/api` |

### Gemini specifics

Model is `gemini-flash-latest`, **not** `gemini-2.5-flash` as IMPLEMENTATION.md §3.3 says. The pinned name's free-tier quota (20 req/day) was exhausted during build; the rolling alias sits in a separate quota bucket. Override with `GEMINI_MODEL`. See the comment at [gemini_client.py:48-58](./backend/app/services/gemini_client.py#L48-L58).

Structured output uses `response_mime_type: "application/json"` + `response_schema: <PydanticModel>` via the `google-genai` SDK.

`gemini_client.py` hand-rolls a `.env` parser rather than adding `python-dotenv`, so bare `uvicorn` runs work outside Docker. It never overrides an already-set env var.

---

## 6. Data model

`db.json` shape: `{profile, assets[], incidents[], takedowns[], activity[]}`. Full Pydantic definitions in [models.py](./backend/app/models.py).

Two fields added after the original spec — IMPLEMENTATION.md §4 won't mention them:
- `Incident.source`: `"SYNTHETIC"` (seeded `/scan`) | `"SERPAPI"` (real `/web-scan`). Historic rows also carry `"GOOGLE_VISION"`. Drives the `GoogleVisionBadge` — see the enum-drift bug in §2.
- `ActivityLogEntry.incident_id`: optional, links log rows to incidents.

Template platforms are **YouTube / X / Instagram** (spec said Telegram — Instagram replaced it), see [platform_templates.py](./backend/app/services/platform_templates.py). But real SerpApi matches land on arbitrary domains (`commons.wikimedia.org`, `www.reddit.com`), which become the incident's platform. `/nuke` files on the incident's own platform **plus** the three templates, deduped — so a real incident produces 4 takedowns, not 3.

Live `db.json` state: profile set, 10 assets, 11 incidents (4 synthetic, 7 SerpApi), 1 filed. Delete `backend/data/db.json` to force a clean reseed.

---

## 7. Reverse image search — real, and working

[serpapi_web_detection.py](./backend/app/services/serpapi_web_detection.py) does genuine reverse-image search via **SerpApi's `google_lens` engine**, wired to `POST /api/assets/{id}/web-scan` and a per-asset button on the Assets page. It takes the top 8 `visual_matches`, approximates a score from result rank (`95 - i*7`, floor 40 — Lens returns no native similarity), labels the platform by domain, and downloads each match locally so the existing `<img>` rendering works. Failed downloads are skipped, which is why the response also carries `raw_match_count`.

**This works today** — `db.json` already holds real incidents from commons.wikimedia.org, reddit.com, en.wikipedia.org, and others.

Requires **two** env vars, both in `backend/.env`:
- `SERPAPI_KEY` — SerpApi free-trial credit.
- `PUBLIC_BASE_URL` — Google Lens fetches the image **itself**, so it needs a URL, not bytes. Local uploads are unreachable from the internet, so this must point at an **ngrok tunnel** (`ngrok http 8000`, paste the printed https URL) or a real public deployment. It currently holds an ngrok URL that **will be dead** — ngrok free URLs change every restart. Re-tunnel and update it before demoing web scan.

### Why not Google Cloud Vision

An earlier implementation (`vision_web_detection.py`, now deleted, commit `99bc83c`) used Cloud Vision `WEB_DETECTION`, which accepts inline base64 and needs no tunnel. It was dropped because **Cloud Vision requires a billing account with a card even for its 1,000 free units/month** ($3.50/1k after). If a card is ever acceptable, that path is strictly simpler — no ngrok dependency. Note its key would be separate from `GOOGLE_API_KEY`; AI Studio keys 403 against Cloud Vision.

Other gotchas:
- Don't add a Google HTML scraper. ToS violation, and it CAPTCHAs mid-demo.
- Lens only finds **already-indexed** images. The synthetic Pillow seed assets will always return zero matches — demo with a genuinely published image.

---

## 8. Frontend map

React 19, react-router 7, Tailwind 4 (via `@tailwindcss/vite`), lucide-react icons, oxlint.

**Theme — "Ultraviolet Forensics", light.** Ice-blue canvas (`#EDF3FB`), white cards, UV blue accent (`#2563EB`), coral danger, mint for confirmed. All of it lives in the `@theme` block of [frontend/src/index.css](./frontend/src/index.css).

The semantic token names are inherited from the older dark theme and were deliberately **kept** across the flip — `ink` is the foreground (now dark navy) and `paper` the canvas (now ice blue), so read them as "foreground/background", not as colours. `iris-soft` is *darker* than `iris`, not lighter: on a light canvas the "soft" variant is the one that clears contrast on white. Restyling means changing values in `@theme`, not renaming tokens across 20 components.

Shared primitives in the same file: `.surface` / `.surface-hover` (the standard panel), `.gt-row` (tappable ledger row), `.eyebrow` (wide-tracked mono caption), `.display` (Arial Black poster headline / hero numeral), `.pill`, `.btn-*`, `.gt-scanline` (the UV band that sweeps a thumbnail mid-search).

| Route | Page |
|---|---|
| `/` | Dashboard — stat cards, recent activity, Run Scan |
| `/onboarding` | Creator profile form; App.tsx force-redirects here when profile is null |
| `/assets` | Upload grid + per-asset "web scan" button |
| `/incidents` | Incident list |
| `/incidents/:id` | **Incident Room** — side-by-side compare, score ring, DMCA tabs, NUKE button |
| `/activity` | Audit timeline + client-side JSON export |

**App shell is a 3-part admin layout**: `Sidebar` (left rail) + `Topbar` (sticky navbar over the content column) + `<main>`. Assembled in [App.tsx](./frontend/src/App.tsx); the old top-only `NavBar` is gone.

- `Sidebar` — grouped nav (Monitoring / Records) with live count chips off `DashboardStats`, and the `◉ BACKEND ONLINE` plate driven by the real health poll. Fixed drawer under `md`, sticky rail at `md+`; `App` owns the open/close state and closes it on every route change.
- `Topbar` — breadcrumb + page title, global search, backend health dot, case-count bell, claimant chip. **Its search box is not a second index**: it hands the term to `/assets?q=…` and the Assets page reads it from the URL, so there is one search implementation, not two.

Contexts: `AppStatusProvider` (dashboard stats + backend reachability), `ToastContext`.

Notable components: `NukeButton` (**hold-to-arm** — press and hold 1300ms to fire; a DMCA filing is irreversible so it is deliberately hard to hit by accident, with Enter/Space as the keyboard path), `PlatformFlipCard` (3D flip to the FILED face, staggered per platform), `ScoreRing`, `SourceBadge` → `GoogleVisionBadge` (real-vs-synthetic marker), `FilingTimeline`, `DmcaPreview`, `StatCard`.

App shell shows a non-blocking `ErrorBanner` with retry when the backend is unreachable — keep that behavior, it saves the demo.

⚠️ `/dashboard/stats` counts **incidents, not notices** — one nuke files 3–4 takedowns against a single incident. The stat-card captions on the Dashboard are worded to match; don't relabel `filed` as "notices sent".

---

## 9. Conventions

- Comments explain **why**, not what — and several encode decisions already litigated (model pin, key separation, urllib-over-httpx). Don't strip them.
- Backend deps are deliberately minimal: `fastapi, uvicorn[standard], python-multipart, pillow, google-genai, pydantic`. Avoid adding more.
- `from __future__ import annotations` at the top of every backend module.
- Never print `.env` contents in output.
- Explicitly out of scope (say it, don't build it): real auth, blockchain timestamping, perceptual hashing/CLIP, real platform API submission, push notifications, mobile polish.
