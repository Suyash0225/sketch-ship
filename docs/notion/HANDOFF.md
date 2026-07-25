# GhostTrace documentation rewrite — handoff

Companion to [`GhostTrace-Submission-Notes.md`](./GhostTrace-Submission-Notes.md). Contains the delivery instructions, the improvement log, the asset manifest, the gap analysis, and the recommendations.

---

## 0. How to get this into Notion

No Notion MCP server is connected to this session, and the target page (`app.notion.com/p/Gen-AI-GhostTrace-Submission-Notes-3a8caf28d33181f887baf10f01234c2f`) is login-gated — it could be neither read nor written programmatically.

**Fastest path (2 minutes):**

1. Open the Notion page.
2. Select all existing content and delete it (or duplicate the page first as a backup).
3. `⌘/Ctrl + V` the contents of `GhostTrace-Submission-Notes.md`. Notion's markdown paste handler converts headings, tables, code blocks, and lists natively.

**Alternative:** `Import → Markdown` from the Notion sidebar, then move the imported page under the original parent.

**After pasting — manual passes Notion's importer can't do:**

| # | Action |
|---|---|
| 1 | **Mermaid diagrams** — 8 code blocks are fenced as ` ```mermaid `. Notion renders these natively; click each block and confirm the language dropdown says *Mermaid*, then toggle **Preview**. |
| 2 | **Callouts** — every line starting `> ⚠️`, `> 🔒`, `> ⓘ`, or a bare `>` imports as a quote block. Select each and use `Turn into → Callout`, then set the icon and a background tint (amber for ⚠️, red for 🔒, blue for ⓘ). There are ~14. |
| 3 | **Toggles** — convert the long reference sections to toggle headings so the page scans: §7 endpoint detail blocks, §9 colour token tables, §12 known-risks table, §13 failures table. |
| 4 | **Table of contents** — replace the manual §Contents list with a `/toc` block, which auto-updates. |
| 5 | **Cover + icon** — set the page icon to 👻 and add a cover (see asset A1). |
| 6 | **Columns** — put the *What is real / what is simulated* table beside the *Core value proposition* callout in §1 as a two-column block. |
| 7 | **Dividers** — the `---` lines import correctly; verify none were swallowed. |
| 8 | **Databases** — see §3 of this doc for the four tables worth converting to real Notion databases. |
| 9 | **Screenshots** — 13 placeholders are listed in §2 below. The Demo section is currently empty and is the single biggest remaining gap. |

---

## 1. Every improvement made

### Structure and information architecture

| # | Improvement |
|---|---|
| 1 | Replaced an ad-hoc notes page with a **16-section IA** ordered by audience: pitch → demo → features → journey → architecture → reference → submission. Judges, investors, engineers, and designers each have an entry point. |
| 2 | Added a **table of contents** with anchor links. |
| 3 | Split **feature documentation** into a consistent seven-part template — purpose, how it works, technical implementation, files, edge cases, limitations — applied to all seven features. |
| 4 | Separated **product narrative** (§1–4) from **technical reference** (§5–13) from **submission material** (§14–15), so no reader has to skim past content aimed at someone else. |
| 5 | Promoted the **real-vs-simulated table** to the top of the document. It was previously scattered across three files as prose. |
| 6 | Added a **dedicated Questions for the Team** section — 20 items, all genuinely unanswerable from code. |

### Accuracy corrections (code beat the docs)

| # | Correction |
|---|---|
| 7 | **Platform set:** spec said YouTube / X / **Telegram**. Shipped code is YouTube / X / **Instagram**. |
| 8 | **Model:** spec pinned `gemini-2.5-flash`. Shipped code uses `gemini-flash-latest`, with the quota-bucket reasoning documented. |
| 9 | **Nuke output:** spec said "all 3 platforms / 3 Takedown records". Code files **3 or 4**, depending on whether the incident's own platform is outside the template set. |
| 10 | **`source` enum drift:** `CLAUDE.md §2` documents this as a **live bug** in three files. It is **fixed** — `SourceBadge` now branches on `!== "SYNTHETIC"` and `IncidentRoom` switches the reasoning heading on the same test. `GOOGLE_VISION` survives only as a type-union member in `api.ts`, for historic rows. Documented as resolved. |
| 11 | **Database counts:** `CLAUDE.md §6` states "10 assets, 11 incidents, 1 filed". Live `db.json` holds **310 assets, 161 incidents, 3 takedowns, 35 activity entries**. Corrected with a full snapshot table. |
| 12 | **Health check:** both `CLAUDE.md §8` and `IMPLEMENTATION.md §7` describe a real health poll driving the status indicator. `GET /health` exists and is **never called by the frontend** — the signal is derived from the 8-second `/api/dashboard/stats` poll. Corrected and flagged. |
| 13 | **Search behaviour:** documented that `q` on `/assets` searches the Gemini **fingerprint text**, not just filename and hash. |
| 14 | **`ActivityLogEntry.incident_id`** and **`Incident.source`** documented as post-spec additions with their deserialisation behaviour for pre-field rows. |

### Undocumented features surfaced

None of the following appear in `README.md`, `IMPLEMENTATION.md`, or `CLAUDE.md`:

| # | Feature | Location |
|---|---|---|
| 15 | **Server-side pagination** — `limit` / `offset` on `/assets`, `/incidents`, `/activity` with documented bounds | `routes/*.py` |
| 16 | **`X-Total-Count` header** and its CORS exposure | `main.py:21` |
| 17 | **Full-text search** on assets (filename + hash + fingerprint) and incidents (platform + URL + reasoning + status) | `routes/assets.py:16`, `routes/incidents.py:187` |
| 18 | **Sorting** — `newest`/`oldest`/`name` on assets, `newest`/`oldest`/`score` on incidents | Regex-validated query params |
| 19 | **Status and source filters** on `/incidents` | `routes/incidents.py:205` |
| 20 | **25 MB upload cap** with a `413` and a human-readable detail | `routes/assets.py:67` |
| 21 | **Client-side image downscaling** — 2048px, JPEG 0.85, skip-below-1.5MB, safe fallback | `lib/upload.ts` |
| 22 | **XHR byte-progress uploads** with an indeterminate "analyzing" handoff | `api.ts:postAssetWithProgress` |
| 23 | **Bounded upload concurrency pool** | `lib/upload.ts:runPool` |
| 24 | **Infinite scroll** via IntersectionObserver with a 300px prefetch margin | `Assets.tsx` |
| 25 | **300ms search debounce** and the URL-mediated topbar→Assets search handoff | `Assets.tsx`, `Topbar.tsx` |
| 26 | **`bulk_seed.py`** — scale-test dataset generator with a marker-based `--purge` | `backend/scripts/` |
| 27 | **`generate_leak_for_asset()`** — every upload synthesises its own leak variant | `seed.py:124` |
| 28 | **`GEMINI_MODEL`** env var (missing from `.env.example`) | `gemini_client.py:58` |
| 29 | **Hold-to-arm** NUKE interaction, 1300 ms, with the safety rationale | `NukeButton.tsx` |
| 30 | **Atomic, lock-guarded writes** (`.tmp` + `os.replace`) | `storage.py` |
| 31 | **Best-match, not first-match** scan attribution | `routes/incidents.py:61` |
| 32 | **`raw_match_count`** and why it exists (hotlink-blocked downloads) | `routes/incidents.py:184` |
| 33 | **Client-side JSON export** of the audit trail | `Activity.tsx:exportJson` |
| 34 | **`caseNo()`** — deterministic docket-style case numbering | `lib/format.ts` |
| 35 | **Self-hosted fonts**, no network dependency at demo time | `index.css` |
| 36 | **`prefers-reduced-motion`** global override | `index.css` |
| 37 | **Global focus-visible ring** as a single definition | `index.css` |

### New analysis produced

| # | Analysis |
|---|---|
| 38 | **Complete design system spec** — 30 colour tokens with hex values and roles, computed contrast ratios, type scale, radii, grid, 12 primitives, 11 named animations, per-component state matrices. Did not exist in any form. |
| 39 | **Accessibility audit** — 11 passes, 10 failures, each with a specific fix. Contrast ratios computed, not guessed. |
| 40 | **Security posture and threat model** — 10 ranked risks with severity in context, plus 7 things done right. Did not exist. |
| 41 | **Performance audit** — 11 optimisations documented, 9 gaps identified. |
| 42 | **Complete API reference** — every endpoint with parameters, bounds, response shapes, example payloads, error codes, side effects, and latency. Previously an incomplete table missing four endpoints and every query parameter. |
| 43 | **AI pipeline documentation** — verbatim prompts, structured-output mechanism, per-job fallback behaviour, cost/latency table, guardrail inventory, and explicit statements of what does *not* exist (embeddings, RAG, streaming, tools, memory). |
| 44 | **8 Mermaid diagrams** — system architecture, upload sequence, web-scan flow, user journey, component hierarchy, AI pipeline, ER diagram, threat model. None existed. |
| 45 | **Live database snapshot** with per-field distributions, replacing stale counts. |
| 46 | **Scalability analysis** — each blocker paired with its known fix and effort. |
| 47 | **Prioritised roadmap** — P0 to P3, with effort estimates. |
| 48 | **Pre-demo checklist** — including the "a run of 87s means you're on the fallback path" tell. |
| 49 | **Troubleshooting table** — 8 symptoms with causes and fixes. |
| 50 | **Judging-criteria mapping** and a rewritten, delivery-ready demo script. |

### Bugs and defects found during the audit

| # | Finding | Severity | Location |
|---|---|---|---|
| B1 | **`ink-faint` (`#8CA0BC`) is 2.7:1 on white** — fails WCAG AA and AA-large. Used for timestamps, hashes, and captions at 9.5–10.5px throughout the app | High (a11y) | `index.css` `@theme` |
| B2 | **Pill contrast fails** — `verdant`/`verdant-wash` ≈ 3.0:1, `brass`/`brass-wash` ≈ 2.7:1, at 10px. Affects every status chip and source badge | High (a11y) | `index.css` `@theme` |
| B3 | **NUKE keyboard path bypasses the safeguard** — `Enter`/`Space` fires the irreversible filing immediately, while pointer users must hold 1300ms | High (a11y + safety) | `NukeButton.tsx:98` |
| B4 | **Dead font preload** — `index.html` preloads `/fonts/fraunces.woff2`, which no `@font-face` rule references. `InterVariable.woff2`, the actual body font, is not preloaded | Medium (perf) | `index.html:7` |
| B5 | **Paginated client is unused** — `getIncidentsPage()` exists and has no caller. Incidents and Dashboard load all 161 rows unpaginated | Medium (perf) | `Incidents.tsx:21`, `Dashboard.tsx:72` |
| B6 | **Unbounded scan cost** — `O(unmatched_leaks × assets)` synchronous Gemini calls, no batch, cap, or timeout. 310 assets × 8 leaks ≈ 2,480 calls on a clean sweep | Medium | `routes/incidents.py:52` |
| B7 | **No server-side upload content-type check** — the `image/*` filter is client-side only; an uploaded SVG/HTML is served from the backend origin | Medium (security) | `routes/assets.py:71` |
| B8 | **Extension-derived path traversal** — stored name is `{uuid}{splitext(client_filename)[1]}`; a crafted `ext` can contain separators | Medium (security) | `routes/assets.py:82` |
| B9 | **`/nuke` is not idempotent** — re-nuking appends a second full set of takedowns. Only the UI prevents it | Low | `routes/incidents.py:273` |
| B10 | **`/web-scan` applies no score threshold** while `/scan` requires ≥60 — the demo DB has a case at 46 | Low (consistency) | `routes/incidents.py:139` |
| B11 | **`IN_REVIEW` and `RESOLVED` are unreachable** — defined, styled, rendered, and never written by any code path. 50 rows carry `IN_REVIEW` purely from `bulk_seed.py` | Low | `models.py:43` |
| B12 | **`@app.on_event("startup")` is deprecated** in current FastAPI — should be a lifespan handler | Low | `main.py:25` |
| B13 | **`storage.ensure_dirs()` runs twice at import** — once at module level, once in the startup hook | Trivial | `main.py:27,39` |
| B14 | **`allow_credentials=True`** with no authentication anywhere | Informational | `main.py:17` |
| B15 | **No delete path** for any entity, via API or UI | Informational | — |

---

## 2. Assets to generate or embed

### Screenshots — highest priority

Capture at **1440×900**, light theme, with a realistic dataset (restore `db.json.prebulk` first so the grid shows real assets, not 300 `bulk-seed` tiles).

| ID | Screen | State | Notes / annotations |
|---|---|---|---|
| S1 | Dashboard | Populated | Full stat row, detections ledger, activity strip. **Hero shot** |
| S2 | Dashboard | Scanning | Mid-`Run Scan`, button showing `SCANNING THE INDEX…` |
| S3 | Onboarding | Empty form | Form GT-1, with the *Use demo profile* button visible |
| S4 | Assets | Grid populated | Show the colour chips and SHA-256 lines |
| S5 | Assets | Drag active | Dropzone in its UV glow state with *Release to upload* |
| S6 | Assets | Upload queue mid-flight | Determinate bar + barber-pole *analyzing* stage together |
| S7 | Assets | Web scan running | The UV scanline sweeping a tile |
| S8 | Incidents | Case list | Score rings, source badges, amber open-case borders |
| S9 | **Incident Room** | Pre-nuke | **The money shot.** Side-by-side evidence, score ring, reasoning panel, NUKE armed. Annotate: *original*, *suspect (coral wash + scanline)*, *Gemini reasoning*, *hold-to-arm* |
| S10 | Incident Room | Mid-hold | Arming ring partially filled, glow expanded |
| S11 | Incident Room | Post-nuke | All platform cards flipped to FILED, success rings visible |
| S12 | Incident Room | DMCA preview | A generated notice in the `<pre>` block with the Copy button |
| S13 | Activity | Timeline | Day headers, action icons, line numbering |
| S14 | — | Empty states | Composite of the four empty states |
| S15 | — | Error states | Backend-offline banner + offline sidebar plate + 404 case page |
| S16 | Mobile 390×844 | Dashboard + drawer open | Two-up |
| S17 | Tablet 820×1180 | Assets grid | — |
| S18 | Backend console | `LIVE ok` log lines | **Proof the AI is real.** Shows `describe_asset LIVE ok`, `compare_images LIVE ok -> score=`, `serpapi LIVE ok -> N match(es)` |

### Video

| ID | Asset | Spec |
|---|---|---|
| V1 | **Demo GIF** | 15–20 s loop of the click-path climax: open case → hold NUKE → cards flip. Silent, autoplay, at the top of §2 |
| V2 | **Full walkthrough** | 90 s Loom or YouTube following the demo script in §14. Embed in §2 |
| V3 | **Web-scan proof clip** | 20 s: click *Scan the web*, scanline, real case opens on a real domain. This is the credibility clip |

### Diagrams — already authored as Mermaid, render natively in Notion

| ID | Diagram | Section |
|---|---|---|
| D1 | System architecture | §5 |
| D2 | Upload sequence | §3.1 |
| D3 | Web-scan flowchart | §3.3 |
| D4 | User journey | §4 |
| D5 | Component hierarchy | §5 |
| D6 | Entity relationship | §6 |
| D7 | AI pipeline (3 jobs) | §8 |
| D8 | Threat model | §12 |

### Still to author

| ID | Asset | Purpose |
|---|---|---|
| A1 | **Page cover** | 1500×600. Suggested: the UV radial-bloom gradient from `index.css` (`#EDF3FB` base, `rgba(37,99,235,0.10)` bloom top-left, `rgba(14,159,126,0.06)` top-right) with the wordmark in Arial Black |
| A2 | **Logo lockup** | None exists — the mark is a lucide `Ghost` glyph in a `#3B82F6 → #1D4ED8` gradient tile. Needs a proper wordmark |
| A3 | **Colour swatch board** | Visual rendering of the 30 tokens, grouped by role, with contrast ratios |
| A4 | **Component gallery** | Every state of StatusChip, SourceBadge, PlatformBadge, ScoreRing, NukeButton, PlatformFlipCard on one board |
| A5 | **Score-threshold chart** | Distribution of the 161 incident scores with the 60/75/90 bands overlaid |
| A6 | **Before/after time chart** | Manual DMCA workflow (hours) vs GhostTrace (seconds), per platform |
| A7 | **Annotated Incident Room** | S9 with callout arrows — the single best static explainer of the product |
| A8 | **Folder-structure graphic** | Visual version of the §5 module maps |

---

## 3. Notion databases worth creating

Four tables in the document earn conversion from static tables to real linked databases:

| Database | Source | Properties | Views |
|---|---|---|---|
| **API Endpoints** | §7 | Method (select), Path (title), Auth (checkbox), Purpose, Params (multi-select), Errors, Latency | Table grouped by resource; Board by method |
| **Features** | §3 | Name (title), Status (Real/Simulated/Not built), AI-backed (checkbox), Files (text), Limitations | Gallery; Board by status |
| **Roadmap** | §15 | Item (title), Priority (P0–P3), Effort, Category, Owner (person), Status | Board by priority; Timeline by effort |
| **Known Issues** | §12 + B1–B15 above | ID (title), Severity (select), Category (a11y/security/perf/correctness), Location, Fix, Status | Board by severity; Table filtered to open |

Relate **Known Issues → Roadmap** so a P0 fix links to the defect it closes, and roll up open-issue counts onto the roadmap items.

---

## 4. Gap analysis — original documentation vs implementation

The repo carries three documents. Scored against the shipped code:

| Document | Purpose | Accuracy | Verdict |
|---|---|---|---|
| `README.md` | 15-line quickstart | Partly wrong | Prescribes `docker compose up --build` as the only run path; Docker isn't available on the dev machine and no native instructions are given |
| `IMPLEMENTATION.md` | Pre-build spec, 419 lines | ~70% accurate | A plan, not a description. Drifted in six material places |
| `CLAUDE.md` | Post-build handoff, 235 lines | ~90% accurate | Genuinely excellent engineering handoff. Stale in three places. Written for an AI agent, not for judges, investors, or designers |

### Material divergences

| # | Documented | Actual | Impact |
|---|---|---|---|
| G1 | Telegram as the third platform | **Instagram** | Spec-level; visible in the UI |
| G2 | `gemini-2.5-flash` pinned | `gemini-flash-latest` | Would mislead anyone diagnosing quota errors |
| G3 | Nuke files 3 platforms, creates 3 takedowns | **3 or 4** | Response-shape assumption |
| G4 | `Incident` has no `source` field | It does, and it drives a UI badge | Data-model omission |
| G5 | `ActivityLogEntry` has no `incident_id` | It does, and it drives deep links | Data-model omission |
| G6 | Reverse-image search is Cloud Vision | It is **SerpApi Google Lens** with a tunnel requirement | Only `CLAUDE.md §7` gets this right |
| G7 | `source` enum drift is a *live bug* in 3 files | **Fixed** — only a type-union remnant survives | `CLAUDE.md §2` is stale; a reader would hunt a bug that isn't there |
| G8 | DB holds 10 assets / 11 incidents | **310 / 161** | `CLAUDE.md §6` is stale |
| G9 | Status indicator is a real health poll | Derived from the `/dashboard/stats` poll; `/health` is never called | Both spec docs and a code comment are wrong |
| G10 | `/assets` and `/incidents` are simple list endpoints | Paginated, searchable, sortable, filterable, with `X-Total-Count` | Entire feature undocumented |
| G11 | `/incidents/{id}/takedowns` | Not in any API table | Endpoint missing from the contract |
| G12 | `/assets/{id}/web-scan` | Only in `CLAUDE.md` | Missing from the formal contract |
| G13 | Uploads are unconstrained | 25 MB cap, `413`, client-side downscale | Undocumented |
| G14 | `GEMINI_MODEL` | Exists, absent from `.env.example` | Config drift |
| G15 | `bulk_seed.py` | Exists, in no document | Tooling undocumented |

### Categories entirely absent from all three documents

| Missing | Now covered in |
|---|---|
| Design system (tokens, type, spacing, states, motion) | §9 |
| Accessibility (audit, contrast, keyboard, ARIA, responsive) | §13 |
| Security (auth, validation, threat model, risks) | §12 |
| Performance (optimisations and gaps) | §11 |
| User journey (states, errors, empties, successes) | §4 |
| Any visual diagram | 8 Mermaid diagrams |
| Prompt engineering detail | §8 |
| Cost and latency | §8 |
| Troubleshooting | §10 |
| Roadmap with priority | §15 |
| Hackathon submission narrative | §14 |
| Any screenshot or recorded demo | **Still missing** — §2 is a placeholder |

### What the original docs got right and this rewrite preserves

`CLAUDE.md` is a strong piece of engineering writing and several of its decisions were carried forward verbatim in substance:

- The gitignore trap, with the reproduction command.
- The model-pin rationale, including the quota-bucket detail.
- The Cloud Vision vs SerpApi trade-off, including the billing-card blocker.
- The "no real crawling — be honest about this" principle, which became a structural theme of the rewrite.
- The token-naming warning (`ink` is foreground, `iris-soft` is darker).
- The `/dashboard/stats` counts-incidents-not-notices caveat.
- The explicit out-of-scope list.

---

## 5. Recommendations to reach award-winning standard

Ordered by return on effort.

### Tier 1 — do these before submitting

| # | Recommendation | Why | Effort |
|---|---|---|---|
| R1 | **Record the demo (V1 + V2 + V3)** | This is the single largest gap. A hackathon page without a video loses to one with a video, regardless of code quality. The GIF at the top of §2 does more work than any paragraph in the document | 1 h |
| R2 | **Capture S1, S9, S18** at minimum | S9 (annotated Incident Room) is the best static explainer of the whole product. S18 (backend console showing `LIVE ok`) is *proof the AI is real* — no other artefact establishes that as cheaply | 45 min |
| R3 | **Reset the demo database** | 300 obvious `bulk-seed` tiles undercut every screenshot, and the profile currently holds a real personal name and phone number. Restore `db.json.prebulk`, re-run one real web scan, leave one incident un-nuked | 15 min |
| R4 | **Fix B1, B2, B4** | Three token/markup changes. Removes a genuine accessibility failure and a live console warning, and lets the doc claim WCAG AA honestly instead of listing it as a defect | 30 min |
| R5 | **Set a cover image and page icon** | Notion pages without a cover read as drafts. Two minutes of perceived-quality gain | 15 min |
| R6 | **Convert the ~14 quote blocks to callouts** and add toggles to the reference sections | The document is long. Callouts and toggles turn it from a wall into something scannable in 90 seconds | 20 min |

### Tier 2 — meaningful quality gains

| # | Recommendation | Why | Effort |
|---|---|---|---|
| R7 | **Stream the DMCA generation** | Watching a legal notice write itself is the most demonstrable AI moment in the product, and it is currently hidden behind a spinner. Highest perceived-innovation gain per line of code | 2 h |
| R8 | **Fix B3** (NUKE keyboard safeguard) | The hold-to-arm gesture is a headline design decision in the submission. A keyboard path that bypasses it undermines the story as well as the accessibility | 30 min |
| R9 | **Point Incidents + Dashboard at `getIncidentsPage`** | The endpoint, the client, and the header all exist. Only the callers are wrong, and fixing them makes the pagination story real rather than half-built | 30 min |
| R10 | **Build the four Notion databases** (§3) | Linked databases with board and timeline views are what separate a Notion page from a pasted README. Roadmap-as-board and Known-Issues-as-board are the two that read as a real team's workspace | 1 h |
| R11 | **Add A5 and A6** (score distribution, before/after time) | Two charts turn quantitative claims into visual evidence. A6 in particular makes the value proposition legible in one glance | 1 h |
| R12 | **Add a one-paragraph "Read this first" callout** at the very top with the three-sentence pitch and links to Demo / Architecture / Hackathon | Judges skim. Give them a routing table | 10 min |

### Tier 3 — depth for engineering and investor audiences

| # | Recommendation | Why |
|---|---|---|
| R13 | **Add a Decisions log** — a short table of the six litigated choices (model pin, SerpApi over Cloud Vision, urllib over httpx, JSON over Postgres, token-name inheritance, hold-to-arm) with the reasoning and what would change the decision. Engineers read this section first, and it's the clearest signal of judgement |
| R14 | **Add a Metrics section** with measured numbers — cold start, first contentful paint, upload round-trip, scan latency per pair, nuke latency, bundle size. Everything in §11 is currently qualitative |
| R15 | **Add a Comparison table** vs the alternatives creators actually use (manual filing, Content ID, Pixsy, DMCA.com) across coverage, cost, per-incident time, and audit trail. Positions the product in a market instead of a vacuum |
| R16 | **Add named contributors** with what each person built. No team is currently identified anywhere in the repo |
| R17 | **Write a minimal test suite** — even 10 tests across `storage`, the scan threshold, the nuke platform-dedup, and the fallback paths. Going from 0% to *any* coverage is the largest credibility jump available for the effort |
| R18 | **Add a "How we'd productionise this" section** with the eight-item scalability table as a phased plan with rough timelines. This is the section investors read |

### Anti-recommendations

Things that look like improvements and are not:

- **Do not remove the fail-soft fallbacks.** They read as unfinished error handling; they are the reason the demo survives a dead network. The document explains this — leave it.
- **Do not replace the JSON store before the hackathon.** It's a documented, defensible scope decision. Swapping it in mid-week buys nothing a judge will see and risks the demo.
- **Do not hide the simulated parts.** The honesty is a differentiator, and it is what makes the real parts credible.
- **Do not add a dark mode.** The light theme is a deliberate positioning choice — forensic laboratory, not hacker terminal — and it is more distinctive than the fourth dark dashboard a judge sees that day.
- **Do not strip the code comments.** Several encode decisions already litigated.
