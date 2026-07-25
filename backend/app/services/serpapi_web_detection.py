"""Real reverse-image search via SerpApi's Google Lens engine -- a free-trial
replacement for Google Cloud Vision's Web Detection (which needs a billed GCP
project). SERPAPI_KEY comes from a SerpApi account's free trial credit.

Unlike Vision (which accepts raw image bytes), Google Lens needs a URL it can
fetch itself, so the asset must be reachable at PUBLIC_BASE_URL + /uploads/...
-- either an ngrok tunnel (`ngrok http 8000`, then set PUBLIC_BASE_URL to the
printed https URL) or a real public deployment of this backend. Defaults to
http://localhost:8000, which only works if SerpApi's servers can reach that
address (i.e. never, unless it's tunneled or actually public).

Uses stdlib urllib instead of adding an HTTP client dependency -- this is a
single REST call, not worth a new requirements.txt entry under a time box.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from urllib.parse import urlparse

SERPAPI_SEARCH_URL = "https://serpapi.com/search.json"

PLATFORM_DOMAIN_HINTS = {
    "youtube.com": "YouTube",
    "youtu.be": "YouTube",
    "ytimg.com": "YouTube",
    "instagram.com": "Instagram",
    "cdninstagram.com": "Instagram",
    "x.com": "X",
    "twitter.com": "X",
    "twimg.com": "X",
}


class WebMatch:
    def __init__(self, image_url: str, page_url: str | None, match_type: str, score: float):
        self.image_url = image_url
        self.page_url = page_url
        self.match_type = match_type  # "full" | "partial"
        self.score = score  # 0-100

    def platform_label(self) -> str:
        host = urlparse(self.page_url or self.image_url).netloc.lower()
        for domain, label in PLATFORM_DOMAIN_HINTS.items():
            if domain in host:
                return label
        return host or "Web"


def _serpapi_key() -> str | None:
    return os.environ.get("SERPAPI_KEY")


def _public_base_url() -> str:
    return os.environ.get("PUBLIC_BASE_URL", "http://localhost:8000").rstrip("/")


def web_detect(image_path: str, max_results: int = 8) -> list[WebMatch]:
    """Calls SerpApi's Google Lens engine on a local image file, by first
    turning it into a publicly-fetchable URL (see module docstring).

    Returns [] (never raises) if no API key is configured, PUBLIC_BASE_URL
    isn't actually reachable from the internet, or the call otherwise fails --
    callers should treat that as "no real matches found," matching the
    fail-soft convention used elsewhere in this codebase.
    """
    api_key = _serpapi_key()
    if not api_key:
        print("[serpapi_web_detection] no SERPAPI_KEY set -- skipping real web search")
        return []

    image_filename = os.path.basename(image_path)
    image_url = f"{_public_base_url()}/uploads/{image_filename}"

    try:
        params = {
            "engine": "google_lens",
            "url": image_url,
            "api_key": api_key,
        }
        req = urllib.request.Request(
            f"{SERPAPI_SEARCH_URL}?{urllib.parse.urlencode(params)}",
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            payload = json.loads(resp.read())

        if "error" in payload:
            print(f"[serpapi_web_detection] API error: {payload['error']!r}")
            return []

        visual_matches = payload.get("visual_matches", [])[:max_results]

        # No native similarity score from this engine (unlike Vision's
        # full/partial split) -- approximate one from result rank instead,
        # since SerpApi already returns matches in relevance order.
        matches: list[WebMatch] = []
        for i, entry in enumerate(visual_matches):
            match_image_url = entry.get("image") or entry.get("thumbnail")
            page_url = entry.get("link")
            if not match_image_url:
                continue
            score = max(95 - i * 7, 40)
            matches.append(WebMatch(match_image_url, page_url, "partial", score=float(score)))

        print(f"[serpapi_web_detection] LIVE ok for {image_path!r} -> {len(matches)} match(es)")
        return matches

    except Exception as exc:  # noqa: BLE001 - must never crash the demo
        print(f"[serpapi_web_detection] FALLBACK/error (reason: {exc!r}) for {image_path!r}")
        return []


def download_image(url: str, dest_path: str) -> bool:
    """Best-effort download of a matched image so the frontend's existing
    seedLeakUrl() rendering (which expects a locally-served file) works
    unchanged for real matches too. Returns False on any failure -- many
    sites block hotlinking/scraping, so callers must treat this as optional.
    """
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (GhostTrace demo)"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
        with open(dest_path, "wb") as f:
            f.write(data)
        return True
    except (urllib.error.URLError, urllib.error.HTTPError, OSError, TimeoutError) as exc:
        print(f"[serpapi_web_detection] download_image failed for {url!r}: {exc!r}")
        return False
