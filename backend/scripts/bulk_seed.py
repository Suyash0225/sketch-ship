"""Generate a large synthetic dataset to exercise the paginated UI.

The demo DB only ever holds a handful of rows, which proves nothing about
how the Exhibits/Cases pages behave at scale. This writes N assets (with
real, tiny PNGs on disk so thumbnails render) plus matching incidents
straight into db.json -- no Gemini calls, so it runs in a second or two.

Every generated row is tagged with BULK_MARKER, so --purge can take the
database back to exactly what it was before.

    python scripts/bulk_seed.py --assets 300
    python scripts/bulk_seed.py --purge

Run from backend/. Safe to run against a live server -- the next request
re-reads db.json from disk -- but don't run it mid-upload.
"""
from __future__ import annotations

import argparse
import os
import random
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from PIL import Image, ImageDraw  # noqa: E402

from app import storage  # noqa: E402
from app.utils import new_id, sha256_of_file  # noqa: E402

BULK_MARKER = "bulk-seed"

PALETTE = [
    (178, 58, 48), (47, 110, 75), (53, 86, 140), (150, 118, 42),
    (107, 99, 83), (33, 29, 20), (196, 132, 60), (88, 60, 120),
]
SUBJECTS = [
    "concert poster", "product render", "album artwork", "travel photograph",
    "logo lockup", "character sketch", "landscape painting", "UI mockup",
    "food photograph", "typography study",
]
PLATFORMS = ["YouTube", "X", "Instagram", "commons.wikimedia.org", "www.reddit.com"]
STATUSES = ["DETECTED", "DETECTED", "DETECTED", "FILED", "IN_REVIEW", "RESOLVED"]


def make_image(path: str, label: str, seed: int) -> None:
    rng = random.Random(seed)
    bg = PALETTE[seed % len(PALETTE)]
    img = Image.new("RGB", (320, 320), bg)
    draw = ImageDraw.Draw(img)
    for _ in range(6):
        x0, y0 = rng.randint(0, 260), rng.randint(0, 260)
        shade = tuple(min(255, c + rng.randint(-60, 60)) for c in bg)
        draw.ellipse([x0, y0, x0 + rng.randint(30, 90), y0 + rng.randint(30, 90)], fill=shade)
    draw.rectangle([10, 10, 310, 310], outline=(250, 248, 240), width=3)
    draw.text((22, 26), label, fill=(250, 248, 240))
    img.save(path, "PNG")


def bulk_seed(count: int) -> None:
    storage.ensure_dirs()
    db = storage.read_db()
    now = datetime.now(timezone.utc)
    rng = random.Random(count)

    assets, incidents = [], []
    for i in range(count):
        asset_id = new_id()
        filename = f"{BULK_MARKER}_{i:04d}.png"
        fs_path = os.path.join(storage.UPLOADS_DIR, filename)
        make_image(fs_path, f"EX {i:04d}", i)

        subject = SUBJECTS[i % len(SUBJECTS)]
        assets.append(
            {
                "id": asset_id,
                "filename": filename,
                "sha256": sha256_of_file(fs_path),
                "uploaded_at": (now - timedelta(minutes=i * 7)).isoformat(),
                "path": f"/uploads/{filename}",
                "fingerprint": {
                    "subject": f"{subject} #{i:04d}",
                    "dominant_colors": rng.sample(
                        ["crimson", "verdant", "azure", "brass", "ink", "paper"], 3
                    ),
                    "distinguishing_features": [
                        f"{BULK_MARKER} synthetic exhibit",
                        f"palette index {i % len(PALETTE)}",
                    ],
                },
            }
        )

        # Roughly every other asset gets a case, so the Incidents page is
        # populated too but the numbers don't line up suspiciously.
        if i % 2 == 0:
            leak_filename = f"{BULK_MARKER}_{i:04d}_leak.png"
            leak_fs_path = os.path.join(storage.SEED_LEAKS_DIR, leak_filename)
            make_image(leak_fs_path, f"LEAK {i:04d}", i + 977)
            platform = PLATFORMS[i % len(PLATFORMS)]
            incidents.append(
                {
                    "id": new_id(),
                    "asset_id": asset_id,
                    "platform": platform,
                    "leak_image_path": f"/seed_leaks/{leak_filename}",
                    "leak_url": f"https://{platform.lower().replace(' ', '')}/{BULK_MARKER}/{i:04d}",
                    "similarity_score": rng.randint(61, 99),
                    "reasoning": f"{BULK_MARKER}: synthetic match generated for scale testing.",
                    "status": STATUSES[i % len(STATUSES)],
                    "detected_at": (now - timedelta(minutes=i * 5)).isoformat(),
                    "source": "SYNTHETIC",
                }
            )

    db.setdefault("assets", []).extend(assets)
    db.setdefault("incidents", []).extend(incidents)
    storage.write_db(db)
    print(f"seeded {len(assets)} assets and {len(incidents)} incidents (marker: {BULK_MARKER})")


def purge() -> None:
    db = storage.read_db()

    bulk_asset_ids = {
        a["id"] for a in db.get("assets", []) if BULK_MARKER in (a.get("filename") or "")
    }
    kept_assets = [a for a in db.get("assets", []) if a["id"] not in bulk_asset_ids]
    kept_incidents = [
        i
        for i in db.get("incidents", [])
        if i.get("asset_id") not in bulk_asset_ids
        and BULK_MARKER not in (i.get("reasoning") or "")
    ]

    removed_assets = len(db.get("assets", [])) - len(kept_assets)
    removed_incidents = len(db.get("incidents", [])) - len(kept_incidents)

    db["assets"] = kept_assets
    db["incidents"] = kept_incidents
    storage.write_db(db)

    for directory in (storage.UPLOADS_DIR, storage.SEED_LEAKS_DIR):
        for name in os.listdir(directory):
            if name.startswith(BULK_MARKER):
                os.remove(os.path.join(directory, name))

    print(f"purged {removed_assets} assets and {removed_incidents} incidents")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assets", type=int, default=300, help="how many assets to generate")
    parser.add_argument("--purge", action="store_true", help="remove everything this script made")
    args = parser.parse_args()

    if args.purge:
        purge()
    else:
        bulk_seed(args.assets)
