"""Convert web/public/icon.png (pixel-art pterodactyl carrying Earth) into:

  1. web/public/pterodactyl.svg
       Standalone layered SVG (body / wing frames / earth) with crisp pixel rects.
  2. web/components/features/pterodactyl/pterodactylSprite.data.ts
       Typed sprite data consumed by the <PterodactylSprite /> React component.

The source PNG is AI-upscaled pixel art on a slightly fractional grid
(~8.36 x 8.28 px per art-pixel), so we resample it back to its native
61x61 grid, quantize the palette, segment it into anatomical layers and
synthesise extra wing frames (mid-stroke / edge-on / down-stroke) by
re-pixelating the wing with a vertical squash around the shoulder pivot.

Run from repo root:
    uv run python scripts/generate_pterodactyl_sprite.py [--preview out.png]
"""

from __future__ import annotations

import argparse
import json
import math
from collections import Counter
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "web/public/icon.png"
OUT_SVG = ROOT / "web/public/pterodactyl.svg"
OUT_TS = ROOT / "web/components/features/pterodactyl/pterodactylSprite.data.ts"

# Detected art-pixel pitch / phase of the upscaled source (see docstring).
PITCH_X, OFF_X = 8.36, 1.2
PITCH_Y, OFF_Y = 8.28, 4.5

# Anatomy (in native grid coordinates, col = x, row = y).
EARTH_CENTER = (49.8, 39.6)
EARTH_RADIUS = 6.8
PIVOT_ROW = 30.5  # shoulder hinge line the wing folds around
PIVOT_COL = 28.0

# Wing frames: (vertical scale about the pivot, horizontal scale about pivot).
# Negative vertical scale = wing swept below the shoulder (down-stroke).
WING_FRAMES = [
    (1.00, 1.00),  # 0 - full up-stroke (the original artwork)
    (0.55, 0.97),  # 1 - upper mid
    (0.12, 0.93),  # 2 - edge-on
    (-0.42, 0.93),  # 3 - lower mid
    (-0.82, 0.95),  # 4 - full down-stroke
]

# Crop window for the final sprite (inclusive col/row range).
CROP_C0, CROP_C1 = 6, 57
CROP_R0, CROP_R1 = 12, 47


# --------------------------------------------------------------------------- #
# 1. Resample onto native grid
# --------------------------------------------------------------------------- #
def resample(path: Path):
    img = Image.open(path).convert("RGBA")
    W, H = img.size
    px = img.load()
    cols = int((W - OFF_X) // PITCH_X)
    rows = int((H - OFF_Y) // PITCH_Y)
    grid: list[list[tuple[int, int, int] | None]] = []
    for r in range(rows):
        row = []
        for c in range(cols):
            x0, y0 = OFF_X + c * PITCH_X, OFF_Y + r * PITCH_Y
            samples = [
                px[xx, yy]
                for yy in range(int(y0 + PITCH_Y * 0.25), int(y0 + PITCH_Y * 0.75) + 1)
                for xx in range(int(x0 + PITCH_X * 0.25), int(x0 + PITCH_X * 0.75) + 1)
                if 0 <= xx < W and 0 <= yy < H
            ]
            opaque = [s for s in samples if s[3] > 128]
            if len(opaque) < len(samples) / 2:
                row.append(None)
                continue
            q = Counter((s[0] >> 3, s[1] >> 3, s[2] >> 3) for s in opaque)
            k = q.most_common(1)[0][0]
            members = [s for s in opaque if (s[0] >> 3, s[1] >> 3, s[2] >> 3) == k]
            row.append(tuple(sum(m[i] for m in members) // len(members) for i in range(3)))
        grid.append(row)
    return cols, rows, grid


def quantize(grid, threshold=34.0):
    counts = Counter(c for row in grid for c in row if c)
    palette: list[tuple[int, int, int]] = []
    for col, _ in counts.most_common():
        if all(math.dist(col, p) >= threshold for p in palette):
            palette.append(col)

    def nearest(c):
        return min(range(len(palette)), key=lambda i: math.dist(c, palette[i]))

    idx = [[nearest(c) if c else -1 for c in row] for row in grid]
    return ["#%02x%02x%02x" % p for p in palette], idx


# --------------------------------------------------------------------------- #
# 2. Segmentation
# --------------------------------------------------------------------------- #
def is_earth(c: int, r: int) -> bool:
    return math.dist((c, r), EARTH_CENTER) <= EARTH_RADIUS and r >= 34


def is_wing(c: int, r: int) -> bool:
    if r < 30 and c <= 32:
        return True
    return 30 <= r <= 33 and c <= 27


def is_stray(c: int, r: int) -> bool:
    """Speed-trail specks left of the body - re-created as live particles."""
    return c < 15 and r > 37


# --------------------------------------------------------------------------- #
# 3. Wing frame synthesis
# --------------------------------------------------------------------------- #
def synth_wing(wing: dict, body: dict, sy: float, sx: float, outline: int, shade: dict):
    if sy == 1.0 and sx == 1.0:
        return dict(wing)
    out: dict[tuple[int, int], int] = {}
    # Inverse-map every destination cell inside a generous window.
    for r in range(0, 61):
        for c in range(0, 61):
            src_r = PIVOT_ROW + (r + 0.5 - PIVOT_ROW) / sy - 0.5
            src_c = PIVOT_COL + (c + 0.5 - PIVOT_COL) / sx - 0.5
            key = (round(src_c), round(src_r))
            if key in wing:
                col = wing[key]
                if sy < 0:
                    col = shade.get(col, col)  # underside is in shadow
                out[(c, r)] = col
    # Re-draw a 1px outline where the wing borders empty space (never where
    # it overlaps / meets the body, so the shoulder joint stays seamless).
    final = dict(out)
    for (c, r), _ in out.items():
        for dc, dr in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (c + dc, r + dr)
            if n not in out and n not in body:
                final[(c, r)] = outline
                break
    return final


# --------------------------------------------------------------------------- #
# 4. Emit SVG paths (one merged path per colour, horizontal run-length rects)
# --------------------------------------------------------------------------- #
def to_paths(cells: dict, palette: list[str]):
    by_color: dict[int, list[tuple[int, int]]] = {}
    for (c, r), ci in cells.items():
        if CROP_C0 <= c <= CROP_C1 and CROP_R0 <= r <= CROP_R1:
            by_color.setdefault(ci, []).append((c - CROP_C0, r - CROP_R0))
    paths = []
    for ci in sorted(by_color):
        pts = sorted(by_color[ci], key=lambda p: (p[1], p[0]))
        d = []
        i = 0
        while i < len(pts):
            x, y = pts[i]
            w = 1
            while i + w < len(pts) and pts[i + w] == (x + w, y):
                w += 1
            d.append(f"M{x} {y}h{w}v1h-{w}z")
            i += w
        paths.append({"fill": palette[ci], "d": "".join(d)})
    return paths


def paths_svg(paths, indent="    "):
    return "\n".join(f'{indent}<path fill="{p["fill"]}" d="{p["d"]}"/>' for p in paths)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", type=Path, help="write a contact-sheet PNG of all frames")
    args = ap.parse_args()

    cols, rows, grid = resample(SRC)
    palette, idx = quantize(grid)
    hex_to_i = {h: i for i, h in enumerate(palette)}

    def pal(hexcol: str) -> int:
        """Index of the palette colour closest to hexcol."""
        rgb = tuple(int(hexcol[i : i + 2], 16) for i in (1, 3, 5))
        return min(
            range(len(palette)),
            key=lambda i: math.dist(rgb, tuple(int(palette[i][j : j + 2], 16) for j in (1, 3, 5))),
        )

    outline = pal("#203615")
    mid, light, highlight = pal("#85b12b"), pal("#b5d35a"), pal("#d1e67d")
    dark_mid, shadow = pal("#6b992a"), pal("#558021")
    shade = {highlight: mid, light: mid, mid: dark_mid, dark_mid: shadow}

    body, wing, earth = {}, {}, {}
    for r in range(rows):
        for c in range(cols):
            ci = idx[r][c]
            if ci < 0 or is_stray(c, r):
                continue
            if is_earth(c, r):
                earth[(c, r)] = ci
            elif is_wing(c, r):
                wing[(c, r)] = ci
            else:
                body[(c, r)] = ci

    frames = [synth_wing(wing, body, sy, sx, outline, shade) for sy, sx in WING_FRAMES]

    w = CROP_C1 - CROP_C0 + 1
    h = CROP_R1 - CROP_R0 + 1
    body_paths = to_paths(body, palette)
    earth_paths = to_paths(earth, palette)
    frame_paths = [to_paths(f, palette) for f in frames]
    # Earth pivot (for spin while falling) in sprite coordinates.
    earth_origin = (EARTH_CENTER[0] - CROP_C0 + 0.5, EARTH_CENTER[1] - CROP_R0 + 0.5)

    # ---- Standalone SVG -------------------------------------------------- #
    hidden = ' visibility="hidden"'
    frame_groups = "\n".join(
        f'  <g id="wing-frame-{i}"{"" if i == 0 else hidden}>\n'
        f"{paths_svg(fp)}\n  </g>"
        for i, fp in enumerate(frame_paths)
    )
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w * 8}" height="{h * 8}" shape-rendering="crispEdges">
  <title>SETU-DRR pterodactyl carrying Earth</title>
  <!-- Generated by scripts/generate_pterodactyl_sprite.py - do not hand-edit. -->
  <g id="body">
{paths_svg(body_paths)}
  </g>
{frame_groups}
  <g id="earth">
{paths_svg(earth_paths)}
  </g>
</svg>
"""
    OUT_SVG.write_text(svg)

    # ---- TypeScript data -------------------------------------------------- #
    OUT_TS.parent.mkdir(parents=True, exist_ok=True)
    ts = f"""/**
 * Pixel-art pterodactyl sprite data.
 *
 * AUTO-GENERATED by `scripts/generate_pterodactyl_sprite.py` from
 * `web/public/icon.png` - do not hand-edit. Re-run the script instead.
 */

export interface SpritePath {{
  /** Fill colour of every art-pixel in this path */
  fill: string;
  /** Merged run-length rectangles in sprite grid units */
  d: string;
}}

/** Sprite width / height in art-pixels */
export const PTERODACTYL_SPRITE_SIZE = {{ width: {w}, height: {h} }} as const;

/** Quantized source palette */
export const PTERODACTYL_PALETTE: readonly string[] = {json.dumps(palette)};

/** Head, neck, legs, lower body (static layer) */
export const PTERODACTYL_BODY: readonly SpritePath[] = {json.dumps(body_paths, indent=2)};

/**
 * Wing animation frames - drawn over the body.
 * 0 = full up-stroke (original art) ... 4 = full down-stroke.
 */
export const PTERODACTYL_WING_FRAMES: readonly (readonly SpritePath[])[] = {json.dumps(frame_paths, indent=2)};

/** The Earth being carried (separate layer so it can be dropped) */
export const PTERODACTYL_EARTH: readonly SpritePath[] = {json.dumps(earth_paths, indent=2)};

/** Centre of the Earth in sprite units (rotation origin when falling) */
export const PTERODACTYL_EARTH_ORIGIN = {{ x: {earth_origin[0]:.1f}, y: {earth_origin[1]:.1f} }} as const;

/** Ping-pong flap cycle through the wing frames */
export const PTERODACTYL_FLAP_SEQUENCE: readonly number[] = [0, 1, 2, 3, 4, 3, 2, 1];
"""
    OUT_TS.write_text(ts)
    print(f"wrote {OUT_SVG.relative_to(ROOT)} and {OUT_TS.relative_to(ROOT)} ({w}x{h}, {len(palette)} colours)")

    # ---- Optional preview ------------------------------------------------- #
    if args.preview:
        S = 8
        sheet = Image.new("RGB", ((w + 2) * S * len(frames), (h + 2) * S), (255, 255, 255))
        sp = sheet.load()
        rgb = [tuple(int(p[j : j + 2], 16) for j in (1, 3, 5)) for p in palette]
        for fi, f in enumerate(frames):
            layers = [body, f, earth]
            for layer in layers:
                for (c, r), ci in layer.items():
                    if not (CROP_C0 <= c <= CROP_C1 and CROP_R0 <= r <= CROP_R1):
                        continue
                    x0 = (fi * (w + 2) + 1 + c - CROP_C0) * S
                    y0 = (1 + r - CROP_R0) * S
                    for yy in range(S):
                        for xx in range(S):
                            sp[x0 + xx, y0 + yy] = rgb[ci]
        sheet.save(args.preview)
        print("preview ->", args.preview)


if __name__ == "__main__":
    main()
