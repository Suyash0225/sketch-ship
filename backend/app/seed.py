"""Generates synthetic demo data on first boot (IMPLEMENTATION.md §11).

We have no real "leaked" content for a hackathon demo, so we synthesize
it: a handful of solid-color canvases with bold text + shapes act as the
creator's "original assets," and for each we generate 1-2 visually-altered
"leaked" variants (crop / rotate / hue-shift) tagged with a random
platform. This gives Gemini real pixel differences to reason about during
/scan instead of faking the comparison result outright.
"""
from __future__ import annotations

import json
import random
from typing import Any

from PIL import Image, ImageDraw, ImageFont

from . import storage
from .utils import new_id, now_iso, sha256_of_file

PLATFORMS = ["YouTube", "X", "Instagram"]

FAKE_URL_BUILDERS = {
    "YouTube": lambda slug: f"https://youtube.com/watch?v=demo{slug}",
    "X": lambda slug: f"https://x.com/leakedmedia{slug}/status/1{slug}",
    "Instagram": lambda slug: f"https://instagram.com/p/leaked_{slug}/",
}

CANVAS_SIZE = (480, 360)

DEMO_SPECS = [
    {"label": "DEMO ASSET 1", "bg": (33, 82, 194), "shape": "ellipse", "shape_color": (255, 214, 10)},
    {"label": "DEMO ASSET 2", "bg": (194, 47, 74), "shape": "rectangle", "shape_color": (255, 255, 255)},
    {"label": "DEMO ASSET 3", "bg": (23, 156, 106), "shape": "triangle", "shape_color": (20, 20, 20)},
]

# how many leaked variants to generate per original (parallel list to DEMO_SPECS).
# Kept small on purpose: /scan does a full assets x leaks comparison sweep with
# real Gemini calls, and the free-tier API key is limited to 5 requests/minute
# (gemini-2.5-flash) -- 3 assets x 3 leaks = at most 9 comparisons per fresh
# scan, which keeps most of a demo run on the LIVE path instead of falling back.
LEAK_COUNTS = [1, 1, 1]


def _load_font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        # older Pillow without the `size` kwarg on load_default()
        return ImageFont.load_default()


def _draw_shape(draw: ImageDraw.ImageDraw, shape: str, color: tuple[int, int, int]) -> None:
    w, h = CANVAS_SIZE
    if shape == "ellipse":
        draw.ellipse([w * 0.62, h * 0.55, w * 0.92, h * 0.85], fill=color)
    elif shape == "rectangle":
        draw.rectangle([w * 0.60, h * 0.58, w * 0.90, h * 0.82], fill=color)
    elif shape == "triangle":
        draw.polygon(
            [(w * 0.75, h * 0.55), (w * 0.60, h * 0.85), (w * 0.90, h * 0.85)],
            fill=color,
        )
    # a couple of small accent dots on every canvas, purely cosmetic
    draw.ellipse([w * 0.06, h * 0.08, w * 0.14, h * 0.16], fill=color)


def _make_original_image(spec: dict) -> Image.Image:
    img = Image.new("RGB", CANVAS_SIZE, color=spec["bg"])
    draw = ImageDraw.Draw(img)
    _draw_shape(draw, spec["shape"], spec["shape_color"])
    font = _load_font(36)
    text = spec["label"]
    try:
        bbox = draw.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    except Exception:
        tw, th = (len(text) * 18, 36)
    draw.text(
        ((CANVAS_SIZE[0] - tw) / 2, CANVAS_SIZE[1] * 0.15),
        text,
        fill=(255, 255, 255),
        font=font,
    )
    return img


def _crop_variant(img: Image.Image) -> Image.Image:
    w, h = img.size
    left = int(w * random.uniform(0.05, 0.15))
    top = int(h * random.uniform(0.05, 0.15))
    right = int(w * random.uniform(0.85, 0.95))
    bottom = int(h * random.uniform(0.85, 0.95))
    return img.crop((left, top, right, bottom))


def _rotate_variant(img: Image.Image) -> Image.Image:
    angle = random.uniform(4, 12) * random.choice([-1, 1])
    return img.rotate(angle, expand=True, fillcolor=(255, 255, 255))


def _hue_shift_variant(img: Image.Image) -> Image.Image:
    hsv = img.convert("HSV")
    h_band, s_band, v_band = hsv.split()
    shift = random.randint(40, 120)
    h_band = h_band.point(lambda p: (p + shift) % 256)
    shifted = Image.merge("HSV", (h_band, s_band, v_band)).convert("RGB")
    return shifted


VARIANT_FNS = [_crop_variant, _rotate_variant, _hue_shift_variant]


def _make_leak_variant(original: Image.Image) -> Image.Image:
    # apply 1-2 distortions so it's a plausible "re-upload" rather than
    # a pixel-identical copy, while still being recognizably derived
    fns = random.sample(VARIANT_FNS, k=random.choice([1, 2]))
    out = original.copy()
    for fn in fns:
        out = fn(out)
    return out


def generate_leak_for_asset(asset_fs_path: str, asset_id: str) -> dict[str, Any]:
    """Synthesizes one 'leaked' variant of a just-uploaded asset and registers
    it in seed_leaks_meta.json, so the next /scan has a real (if synthetic)
    leak to find for content the user themselves uploaded -- not just the
    3 built-in demo assets from run_seed_if_needed().
    """
    storage.ensure_dirs()
    original = Image.open(asset_fs_path).convert("RGB")

    leak_id = new_id()
    leak_filename = f"{leak_id}_leak.png"
    leak_fs_path = f"{storage.SEED_LEAKS_DIR}/{leak_filename}"
    leak_img = _make_leak_variant(original)
    leak_img.save(leak_fs_path)

    platform = random.choice(PLATFORMS)
    slug = leak_id[:8]
    leak_url = FAKE_URL_BUILDERS[platform](slug)

    entry = {
        "leak_filename": leak_filename,
        "leak_path": f"/seed_leaks/{leak_filename}",
        "source_asset_id": asset_id,
        "platform": platform,
        "leak_url": leak_url,
    }
    storage.append_seed_leak(entry)
    return entry


def run_seed_if_needed() -> None:
    storage.ensure_dirs()

    if storage.db_exists():
        print("[seed] db.json already present — skipping demo data generation")
        return

    print("[seed] no db.json found — generating synthetic demo assets + seed leaks")

    db: dict[str, Any] = dict(storage.EMPTY_DB)
    db["assets"] = []
    db["activity"] = []

    seed_leaks_meta: list[dict] = []

    for idx, spec in enumerate(DEMO_SPECS):
        asset_id = new_id()
        filename = f"{asset_id}_original.png"
        path = f"{storage.UPLOADS_DIR}/{filename}"

        img = _make_original_image(spec)
        img.save(path)

        asset = {
            "id": asset_id,
            "filename": filename,
            "sha256": sha256_of_file(path),
            "uploaded_at": now_iso(),
            "path": f"/uploads/{filename}",
            "fingerprint": None,
        }
        db["assets"].append(asset)

        n_leaks = LEAK_COUNTS[idx] if idx < len(LEAK_COUNTS) else 1
        for _ in range(n_leaks):
            leak_id = new_id()
            leak_filename = f"{leak_id}_leak.png"
            leak_path = f"{storage.SEED_LEAKS_DIR}/{leak_filename}"
            leak_img = _make_leak_variant(img)
            leak_img.save(leak_path)

            platform = random.choice(PLATFORMS)
            slug = leak_id[:8]
            leak_url = FAKE_URL_BUILDERS[platform](slug)

            seed_leaks_meta.append(
                {
                    "leak_filename": leak_filename,
                    "leak_path": f"/seed_leaks/{leak_filename}",
                    "source_asset_id": asset_id,
                    "platform": platform,
                    "leak_url": leak_url,
                }
            )

    storage.write_db(db)

    with open(storage.SEED_LEAKS_META_PATH, "w", encoding="utf-8") as f:
        json.dump(seed_leaks_meta, f, indent=2)

    print(
        f"[seed] generated {len(db['assets'])} original assets and "
        f"{len(seed_leaks_meta)} seed leak images"
    )
