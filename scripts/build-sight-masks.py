"""Builds public/maps/<map>-sight.png from Valve's radar overviews.

White pixels block sight: walls (transparent parts of the radar) and crates/objects
(grey patches clearly lighter than the floor around them). 512x512, one cell is
about 2 board units. Run: python3 scripts/build-sight-masks.py
"""
import numpy as np
from PIL import Image

N = 512
MAPS = ["mirage", "dust2", "inferno", "nuke", "nukelower", "ancient", "anubis", "overpass", "train", "cache"]


def blur(x, r):
    c = np.pad(x, ((r + 1, r), (r + 1, r))).cumsum(0).cumsum(1)
    k = 2 * r + 1
    return c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]


def opening(m):
    """Drops specks smaller than 2x2 cells (erode, then dilate)."""
    e = m[:-1, :-1] & m[1:, :-1] & m[:-1, 1:] & m[1:, 1:]
    e = np.pad(e, ((0, 1), (0, 1)))
    d = e.copy()
    d[1:, :] |= e[:-1, :]
    d[:, 1:] |= e[:, :-1]
    d[1:, 1:] |= e[:-1, :-1]
    return d


for m in MAPS:
    im = Image.open(f"public/maps/{m}-radar.webp").convert("RGBA").resize((N, N), Image.BILINEAR)
    a = np.asarray(im).astype(float)
    rgb, alpha = a[..., :3], a[..., 3]
    lum = rgb.mean(-1)
    sat = rgb.max(-1) - rgb.min(-1)
    floor = alpha >= 128
    mean = blur(lum * floor, 14) / np.maximum(blur(floor.astype(float), 14), 1)
    box = floor & (sat < 26) & (lum - mean > 18) & (lum > 95)
    blocked = opening(~floor) | opening(box)
    Image.fromarray((blocked * 255).astype("uint8"), "L").convert("1").save(f"public/maps/{m}-sight.png", optimize=True)
    print(m, f"{blocked.mean():.2f}")
