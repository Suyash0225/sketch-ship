"""Real reverse-image search via Google Cloud Vision API's Web Detection feature.

Separate credential from Gemini: GOOGLE_VISION_API_KEY must be a Cloud Vision
API key (Cloud project with Vision API enabled), NOT the Google AI Studio
GOOGLE_API_KEY used by gemini_client.py -- the two products are unrelated
despite both being "Google" keys.

Uses stdlib urllib instead of adding an HTTP client dependency -- this is a
single REST call, not worth a new requirements.txt entry under a time box.
"""
from __future__ import annotations

import base64
import json
import os
import urllib.error
import urllib.request
from urllib.parse import urlparse

VISION_ANNOTATE_URL = "https://vision.googleapis.com/v1/images:annotate"

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


def _vision_api_key() -> str | None:
    return os.environ.get("GOOGLE_VISION_API_KEY")


def web_detect(image_path: str, max_results: int = 8) -> list[WebMatch]:
    """Calls Cloud Vision Web Detection on a local image file.

    Returns [] (never raises) if no API key is configured or the call fails --
    callers should treat that as "no real matches found," matching the
    fail-soft convention used by gemini_vision.py.
    """
    api_key = _vision_api_key()
    if not api_key:
        print("[vision_web_detection] no GOOGLE_VISION_API_KEY set -- skipping real web search")
        return []

    try:
        with open(image_path, "rb") as f:
            content_b64 = base64.b64encode(f.read()).decode("ascii")

        body = {
            "requests": [
                {
                    "image": {"content": content_b64},
                    "features": [{"type": "WEB_DETECTION", "maxResults": max_results}],
                }
            ]
        }
        req = urllib.request.Request(
            f"{VISION_ANNOTATE_URL}?key={api_key}",
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            payload = json.loads(resp.read())

        web_detection = payload["responses"][0].get("webDetection", {})

        # pagesWithMatchingImages gives us the human-facing page URL (what we
        # actually want to link to / file a DMCA against); full/partial
        # matching images give the direct image URL. Zip them best-effort --
        # Vision doesn't guarantee 1:1 alignment, so pages without a same-index
        # image entry just fall back to using their own URL as the image URL.
        matches: list[WebMatch] = []

        for entry in web_detection.get("fullMatchingImages", []):
            matches.append(WebMatch(entry["url"], None, "full", score=95.0))
        for entry in web_detection.get("partialMatchingImages", []):
            matches.append(WebMatch(entry["url"], None, "partial", score=70.0))

        pages = web_detection.get("pagesWithMatchingImages", [])
        for i, page in enumerate(pages):
            if i < len(matches):
                matches[i].page_url = page["url"]
            else:
                matches.append(WebMatch(page["url"], page["url"], "partial", score=60.0))

        print(f"[vision_web_detection] LIVE ok for {image_path!r} -> {len(matches)} match(es)")
        return matches

    except Exception as exc:  # noqa: BLE001 - must never crash the demo
        print(f"[vision_web_detection] FALLBACK/error (reason: {exc!r}) for {image_path!r}")
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
        print(f"[vision_web_detection] download_image failed for {url!r}: {exc!r}")
        return False
