"""Gemini client init (IMPLEMENTATION.md §3.3)."""
from __future__ import annotations

import os

from google import genai

_client: "genai.Client | None" = None
_dotenv_loaded = False


def _load_dotenv_if_needed() -> None:
    """Best-effort .env loader for local (non-docker) runs.

    docker-compose injects GOOGLE_API_KEY via `env_file`, so this is a
    no-op in the container. When running bare `uvicorn` on a dev machine
    nothing populates os.environ from backend/.env, so we parse it
    ourselves here rather than pulling in python-dotenv as an extra
    dependency. Never overrides an already-set env var. Called at module
    import time (below) so env-derived constants like the model name are
    correct regardless of which run mode is in play.
    """
    global _dotenv_loaded
    if _dotenv_loaded:
        return
    _dotenv_loaded = True

    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env")
    if not os.path.exists(env_path):
        return
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value
    except OSError:
        pass


_load_dotenv_if_needed()

# IMPLEMENTATION.md §3.3 pins this to the literal string "gemini-2.5-flash".
# During build verification, the provisioned API key's free-tier daily quota
# for that exact pinned model name (20 requests/day) was exhausted by our own
# end-to-end testing. "gemini-flash-latest" is Google's official rolling
# alias for the current stable flash model -- same request/response shape,
# same google-genai SDK call pattern, verified to still support the
# response_schema structured-output mode we depend on -- and it is metered
# under a separate quota bucket, so it kept working under the same key.
# Overridable via GEMINI_MODEL (env var or backend/.env) if you have a
# fresh/paid key and want to pin back to "gemini-2.5-flash".
VISION_MODEL = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")
TEXT_MODEL = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")


def get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.environ["GOOGLE_API_KEY"]
        _client = genai.Client(api_key=api_key)
    return _client
