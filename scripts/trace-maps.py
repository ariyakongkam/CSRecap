"""
Traces our own vector map layouts from CS2 radar overviews.

    python3 scripts/trace-maps.py <folder with de_<map>_radar.png files>

Only the *shape* of the playable area is kept: the walkable floor (from the
radar's transparency) and the outlines of cover (boxes, cars). The output is
plain polygon geometry on our 1000x1000 board, written to
src/lib/maps/traced/<map>.json and drawn in the app's own style. No pixels,
textures or colours from the radar images are stored, and the radar images
themselves are never committed.

Needs numpy and opencv-python-headless (dev-only).
"""

import json
import sys
from pathlib import Path

import cv2
import numpy as np

MAPS = ["mirage", "dust2", "inferno", "nuke", "ancient", "anubis", "train", "overpass"]
SCALE = 1000 / 1024
OUT = Path(__file__).resolve().parent.parent / "src" / "lib" / "maps" / "traced"


def to_path(contours, eps):
    parts = []
    for c in contours:
        approx = cv2.approxPolyDP(c, eps, True)
        if len(approx) < 3:
            continue
        pts = [f"{p[0][0] * SCALE:.0f} {p[0][1] * SCALE:.0f}" for p in approx]
        parts.append("M" + "L".join(pts) + "Z")
    return "".join(parts)


def trace(radar: Path) -> dict:
    img = cv2.imread(str(radar), cv2.IMREAD_UNCHANGED)
    alpha = img[:, :, 3]
    floor = (alpha > 40).astype(np.uint8) * 255
    k = np.ones((3, 3), np.uint8)
    floor = cv2.morphologyEx(floor, cv2.MORPH_CLOSE, k, iterations=2)
    floor = cv2.morphologyEx(floor, cv2.MORPH_OPEN, k, iterations=1)

    # Floor outline with holes (pillars, walls inside rooms). Drop specks.
    contours, _ = cv2.findContours(floor, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    contours = [c for c in contours if cv2.contourArea(c) > 60]
    floor_path = to_path(contours, eps=1.6)

    # Cover: small grey blobs clearly brighter than this map's floor, and box-shaped.
    bgr = img[:, :, :3].astype(np.int16)
    lum = bgr.mean(axis=2)
    spread = bgr.max(axis=2) - bgr.min(axis=2)
    on_floor = alpha > 200
    base = float(np.median(lum[on_floor]))
    cover = (on_floor & (spread < 12) & (lum > base + 30)).astype(np.uint8) * 255
    cover = cv2.morphologyEx(cover, cv2.MORPH_OPEN, k, iterations=1)
    blobs, _ = cv2.findContours(cover, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    props = []
    for b in blobs:
        area = cv2.contourArea(b)
        if area < 30 or area > 1400:
            continue
        (cx, cy), (w, h), angle = cv2.minAreaRect(b)
        if min(w, h) < 5 or max(w, h) / max(min(w, h), 1) > 6:
            continue
        if area / max(w * h, 1) < 0.7:  # not box-shaped: stairs, decals
            continue
        box = cv2.boxPoints(((cx, cy), (w, h), angle))
        props.append([[round(float(x) * SCALE), round(float(y) * SCALE)] for x, y in box])

    return {"floor": floor_path, "props": props}


def main():
    src = Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    for m in MAPS:
        radar = src / f"de_{m}_radar.png"
        if not radar.exists():
            print(f"skip {m}: no {radar.name}")
            continue
        data = trace(radar)
        (OUT / f"{m}.json").write_text(json.dumps(data, separators=(",", ":")) + "\n")
        print(f"{m}: floor {len(data['floor'])} chars, {len(data['props'])} props")


if __name__ == "__main__":
    main()
