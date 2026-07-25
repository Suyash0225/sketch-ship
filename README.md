# GhostTrace

Automated leak detection + DMCA takedown filing for creators. Built for a 3-hour hackathon (Track 3: Life Admin — Legal & Compliance Assistance).

See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for the full architecture, API contract, and Gemini vision integration details.

## Run it (one command)

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API + docs: http://localhost:8000/docs

Requires `backend/.env` with a `GOOGLE_API_KEY` (Google AI Studio key) — already present locally; use `backend/.env.example` as a template elsewhere.
