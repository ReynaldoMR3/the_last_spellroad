#!/usr/bin/env python3
"""Deterministic Pillow pixel-art generator -- issue #126, "Deterministic Original" treatment.

Produces rune/glyph sprites and spell-VFX spritesheet atlases for the approved "Runes Awake" /
"Arcane Momentum" opening-magic direction (docs/agents/_reference/opening-experience-brief.md),
plus a provenance.json recording the toolchain and output hashes
(docs/research/2026-08-07-creative-commons-art-audio.md's "Proposed asset provenance manifest",
adapted for originated rather than sourced content -- no license/attribution fields, all the
reproducibility/toolchain fields).

Per docs/adr/0003-docker-only-rotating-creative-prototypes.md, this script only ever runs inside
the Docker image built from this directory's Dockerfile -- never directly on the host.

DETERMINISM CONTRACT
---------------------
Every glyph and VFX frame is built from hardcoded integer/float coordinates, a fixed palette,
and Pillow's non-anti-aliased 2D drawing primitives (ImageDraw.ellipse/line/polygon with no
supersampling). There is no randomness anywhere in this file -- no `random`, no seed needed --
so re-running this script through the *same* Docker image and the same PNG save parameters
reproduces byte-identical files. This is verified externally by diffing the sha256 of two
separate `docker run` invocations (see docs/agents/tilesmith/log.md's dated entry for this
ticket for the actual diff evidence).

USAGE (inside Docker; see tools/pixel-gen/Dockerfile)
------------------------------------------------------
    python generate_opening_magic.py \\
        --output /out \\
        --docker-image "last-spellroad/pixel-gen:opening-magic-126" \\
        --docker-image-id "sha256:<built image id>" \\
        --base-image "python:3.11-slim@sha256:<digest>" \\
        --command "<the exact docker run invocation used>"
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import platform
from pathlib import Path
from typing import Sequence

from PIL import Image, ImageDraw

SCRIPT_PATH = Path(__file__).resolve()

# ---------------------------------------------------------------------------------------------
# Palette -- straight from docs/agents/_reference/opening-experience-brief.md: "Saturated cyan,
# gold, violet, and ember-orange magic supplies the excitement." Each entry carries a base tone
# (the rune's ring/body), a bright core (inner highlight/hot spot), and a dark edge (outline, so
# the glyph reads as a silhouette against both light and dark terrain per the brief's "preserve
# clear silhouettes" rule).
# ---------------------------------------------------------------------------------------------
PALETTE: dict[str, dict[str, tuple[int, int, int]]] = {
    "cyan": {"base": (79, 216, 240), "core": (200, 246, 255), "edge": (24, 92, 110)},
    "gold": {"base": (245, 197, 66), "core": (255, 240, 190), "edge": (117, 82, 12)},
    "violet": {"base": (152, 94, 214), "core": (214, 178, 250), "edge": (63, 32, 96)},
    # Matches SpellroadScene.ts's existing ELEMENT_EFFECT_COLOR.fire (0xff6b3d) almost exactly --
    # deliberate, so the new deterministic VFX is continuous with the cast-flash/impact-burst
    # tint the game already renders for every fire spell, not a second competing fire color.
    "ember": {"base": (255, 107, 61), "core": (255, 200, 140), "edge": (120, 32, 12)},
}

# ---------------------------------------------------------------------------------------------
# Showcase spell selection. Neither docs/agents/_reference/opening-experience-brief.md nor
# docs/superpowers/specs/2026-08-07-opening-art-music-prototypes-design.md names a specific
# showcase spell/element for Prototype 1's "one identical showcase spell" -- both leave it to
# whichever agent needs to pick one first. Picked `flame_sweep` (src/data/spells/spells.json):
# element "fire", shape "cone", already in the default hotbar loadout (default_loadout_slot: 2,
# so it is a spell the player casts naturally rather than a hidden one), and fire is the one
# element whose existing in-engine tint already equals one of the brief's four named colors
# (ember-orange) with no reinterpretation needed -- see the PALETTE comment above.
# ---------------------------------------------------------------------------------------------
SHOWCASE_SPELL_ID = "flame_sweep"
SHOWCASE_ELEMENT = "fire"
SHOWCASE_PALETTE_KEY = "ember"

# Integer upscale factor applied (via nearest-neighbor) to every native-resolution canvas below,
# to produce a deliberately "chunky" pixel-art look consistent with this repo's 16x16 tile
# family (public/assets/third-party/kenney-roguelike-rpg-pack) and its existing 32x32
# hand-authored spell icons (public/assets/spell-icons/*.png, i.e. 2x the tile scale).
PIXEL_SCALE = 2

PNG_SAVE_KWARGS = {"format": "PNG", "optimize": False, "compress_level": 6}


def _rgba(rgb: tuple[int, int, int], alpha: int) -> tuple[int, int, int, int]:
    return (rgb[0], rgb[1], rgb[2], alpha)


def _new_canvas(size: tuple[int, int]) -> Image.Image:
    return Image.new("RGBA", size, (0, 0, 0, 0))


def _upscale(im: Image.Image, scale: int = PIXEL_SCALE) -> Image.Image:
    if scale == 1:
        return im
    return im.resize((im.width * scale, im.height * scale), Image.NEAREST)


def _draw_ring(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int, color, width: int = 1) -> None:
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=color, width=width)


# ---------------------------------------------------------------------------------------------
# Rune glyphs -- one per palette color, 16x16 native canvas (matches the tile grid exactly)
# upscaled 2x to a 32x32 final PNG (matches the existing hand-authored spell-icon size). Each is
# an outer ring (the "activated rune" body) plus a distinct inner mark so the four read apart at
# a glance even before color is considered, per the brief's silhouette-clarity rule.
# ---------------------------------------------------------------------------------------------

def glyph_cyan() -> Image.Image:
    """Frost rune: ring + snowflake cross (plus + diagonal ticks)."""
    size = 16
    im = _new_canvas((size, size))
    d = ImageDraw.Draw(im)
    cx, cy = size // 2, size // 2
    pal = PALETTE["cyan"]
    _draw_ring(d, cx, cy, 6, _rgba(pal["edge"], 255), width=1)
    _draw_ring(d, cx, cy, 5, _rgba(pal["base"], 255), width=2)
    d.line([(cx, cy - 5), (cx, cy + 5)], fill=_rgba(pal["core"], 255), width=1)
    d.line([(cx - 5, cy), (cx + 5, cy)], fill=_rgba(pal["core"], 255), width=1)
    d.line([(cx - 4, cy - 4), (cx + 4, cy + 4)], fill=_rgba(pal["base"], 255), width=1)
    d.line([(cx - 4, cy + 4), (cx + 4, cy - 4)], fill=_rgba(pal["base"], 255), width=1)
    d.point((cx, cy), fill=(255, 255, 255, 255))
    return im


def glyph_gold() -> Image.Image:
    """Storm rune: ring + lightning-bolt inner mark."""
    size = 16
    im = _new_canvas((size, size))
    d = ImageDraw.Draw(im)
    cx, cy = size // 2, size // 2
    pal = PALETTE["gold"]
    _draw_ring(d, cx, cy, 6, _rgba(pal["edge"], 255), width=1)
    _draw_ring(d, cx, cy, 5, _rgba(pal["base"], 255), width=2)
    bolt = [
        (cx + 1, cy - 6), (cx - 2, cy - 1), (cx, cy - 1),
        (cx - 2, cy + 6), (cx + 2, cy + 1), (cx - 1, cy + 1),
    ]
    d.polygon(bolt, fill=_rgba(pal["core"], 255), outline=_rgba(pal["edge"], 255))
    return im


def glyph_violet() -> Image.Image:
    """Arcane rune: ring + vesica "eye" inner mark with a dark pupil."""
    size = 16
    im = _new_canvas((size, size))
    d = ImageDraw.Draw(im)
    cx, cy = size // 2, size // 2
    pal = PALETTE["violet"]
    _draw_ring(d, cx, cy, 6, _rgba(pal["edge"], 255), width=1)
    _draw_ring(d, cx, cy, 5, _rgba(pal["base"], 255), width=2)
    eye = [(cx - 4, cy), (cx - 1, cy - 3), (cx + 4, cy), (cx - 1, cy + 3)]
    d.polygon(eye, fill=_rgba(pal["core"], 255), outline=_rgba(pal["edge"], 255))
    d.ellipse((cx - 1, cy - 1, cx + 1, cy + 1), fill=_rgba(pal["edge"], 255))
    return im


def glyph_ember() -> Image.Image:
    """Flame rune: ring + stylized flame silhouette inner mark."""
    size = 16
    im = _new_canvas((size, size))
    d = ImageDraw.Draw(im)
    cx, cy = size // 2, size // 2
    pal = PALETTE["ember"]
    _draw_ring(d, cx, cy, 6, _rgba(pal["edge"], 255), width=1)
    _draw_ring(d, cx, cy, 5, _rgba(pal["base"], 255), width=2)
    flame = [
        (cx, cy - 6), (cx + 3, cy - 1), (cx + 2, cy + 2),
        (cx, cy + 6), (cx - 2, cy + 2), (cx - 3, cy - 1),
    ]
    d.polygon(flame, fill=_rgba(pal["core"], 255), outline=_rgba(pal["edge"], 255))
    d.polygon(
        [(cx, cy - 3), (cx + 1, cy), (cx, cy + 3), (cx - 1, cy)],
        fill=_rgba(pal["base"], 255),
    )
    return im


GLYPHS = {
    "rune-cyan": glyph_cyan,
    "rune-gold": glyph_gold,
    "rune-violet": glyph_violet,
    "rune-ember": glyph_ember,
}


# ---------------------------------------------------------------------------------------------
# Spell VFX -- cast flash / impact burst / trail, matching the three existing conventions in
# src/scenes/SpellroadScene.ts (spawnCastEffect's one-shot AoE-shape flash, spawnImpactBurst's
# expanding-and-fading ring, spawnRangedProjectile's traveling dot-with-stroke), so the shipped
# silhouette language is reused rather than a fourth incompatible style invented from scratch.
# Each effect is emitted as a single horizontal spritesheet atlas (uniform frame size, frames
# left-to-right) -- directly loadable via Phaser's `this.load.spritesheet(key, url,
# { frameWidth, frameHeight })`, per the design spec's "atlases" note.
# ---------------------------------------------------------------------------------------------

def _wedge_points(
    apex: tuple[float, float], direction_deg: float, half_angle_deg: float, length: float
) -> list[tuple[float, float]]:
    ax, ay = apex
    rad_cw = math.radians(direction_deg - half_angle_deg)
    rad_ccw = math.radians(direction_deg + half_angle_deg)
    p1 = (ax + length * math.cos(rad_cw), ay + length * math.sin(rad_cw))
    p2 = (ax + length * math.cos(rad_ccw), ay + length * math.sin(rad_ccw))
    return [apex, p1, p2]


def _round_points(points: Sequence[tuple[float, float]]) -> list[tuple[int, int]]:
    return [(round(x), round(y)) for x, y in points]


def cast_flash_frames() -> list[Image.Image]:
    """`flame_sweep`'s cone-shaped cast flash, fading out -- matches spawnCastEffect's tween
    (fill+outline of the AoE shape, alpha 1 -> 0 over CAST_EFFECT_DURATION_MS)."""
    size = 32
    apex = (4.0, size - 4.0)
    direction_deg = -35.0
    half_angle_deg = 28.0
    length = 26.0
    alphas = [235, 170, 105, 50]
    pal = PALETTE[SHOWCASE_PALETTE_KEY]
    frames = []
    for alpha in alphas:
        im = _new_canvas((size, size))
        d = ImageDraw.Draw(im)
        outer = _round_points(_wedge_points(apex, direction_deg, half_angle_deg, length))
        d.polygon(outer, fill=_rgba(pal["base"], alpha), outline=_rgba(pal["edge"], min(255, alpha + 20)))
        inner = _round_points(
            _wedge_points(apex, direction_deg, half_angle_deg * 0.55, length * 0.7)
        )
        d.polygon(inner, fill=_rgba(pal["core"], min(255, alpha + 10)))
        frames.append(im)
    return frames


def impact_frames() -> list[Image.Image]:
    """Expanding, fading ring -- matches spawnImpactBurst's circle radius 4 -> 18, alpha 0.5 -> 0."""
    size = 24
    cx, cy = size // 2, size // 2
    radii = [3, 7, 11, 15]
    alphas = [235, 170, 100, 40]
    pal = PALETTE[SHOWCASE_PALETTE_KEY]
    frames = []
    for r, alpha in zip(radii, alphas):
        im = _new_canvas((size, size))
        d = ImageDraw.Draw(im)
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=_rgba(pal["base"], alpha), width=2)
        if r <= 7:
            core_alpha = max(0, alpha - 40)
            d.ellipse((cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1), fill=_rgba(pal["core"], core_alpha))
        frames.append(im)
    return frames


def trail_frames() -> list[Image.Image]:
    """Traveling comet-with-tail -- matches spawnRangedProjectile's dot-with-stroke convention,
    generalized into a short trail so it is reusable for this element's line-shaped spells
    (e.g. `magma_lance`) in the Hybrid treatment, not only the cone-shaped showcase spell."""
    width, height = 32, 12
    cy = height // 2
    positions = [6, 14, 22, 28]
    pal = PALETTE[SHOWCASE_PALETTE_KEY]
    frames = []
    for px in positions:
        im = _new_canvas((width, height))
        d = ImageDraw.Draw(im)
        tail_len = 8
        for t in range(tail_len):
            tx = px - t * 2
            if tx < 0:
                break
            alpha = max(0, 200 - t * 28)
            r = max(1, 3 - t // 3)
            d.ellipse((tx - r, cy - r, tx + r, cy + r), fill=_rgba(pal["base"], alpha))
        d.ellipse((px - 3, cy - 3, px + 3, cy + 3), fill=_rgba(pal["core"], 255))
        d.ellipse((px - 3, cy - 3, px + 3, cy + 3), outline=_rgba(pal["edge"], 255), width=1)
        frames.append(im)
    return frames


VFX_SEQUENCES = {
    f"cast-{SHOWCASE_SPELL_ID}": cast_flash_frames,
    f"impact-{SHOWCASE_SPELL_ID}": impact_frames,
    f"trail-{SHOWCASE_ELEMENT}": trail_frames,
}


def _assemble_atlas(frames: list[Image.Image], scale: int = PIXEL_SCALE):
    frame_w, frame_h = frames[0].size
    atlas = Image.new("RGBA", (frame_w * len(frames), frame_h), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        # No mask arg: the destination region is fully transparent already and each frame
        # occupies its own non-overlapping slot, so a plain paste copies raw RGBA as-is.
        # Passing `frame` as its own mask (the previous code here) makes Pillow use the
        # source's own alpha band as the blend mask *and* as the alpha of the result,
        # squaring it (alpha 100 -> 100*100/255 ~= 39) and premultiplying the RGB channels
        # by the un-squared alpha fraction on top of that -- silently darkening every
        # partially-transparent frame toward black instead of fading it toward transparent.
        # Confirmed empirically (not just from Pillow's docs) with an isolated repro, and
        # confirmed this is the exact same anti-pattern the parallel CC0-Remix pipeline
        # (tools/cc0-remix/cc0_remix.py) found and fixed the same way at 3 call sites
        # (_pad_to_square, _build_impact_frames, _assemble_atlas) during its own 2026-08-07
        # session -- see that file's `_pad_to_square` docstring for the same empirical note.
        atlas.paste(frame, (i * frame_w, 0))
    atlas = _upscale(atlas, scale)
    return atlas, frame_w * scale, frame_h * scale, len(frames)


# ---------------------------------------------------------------------------------------------
# Provenance
# ---------------------------------------------------------------------------------------------

def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build_provenance(
    output_root: Path,
    generated: list[dict],
    args: argparse.Namespace,
) -> dict:
    import PIL

    return {
        "schemaVersion": 1,
        "kind": "originated",
        "ticket": "https://github.com/ReynaldoMR3/the_last_spellroad/issues/126",
        "treatment": "deterministic-original",
        "showcaseSpell": {
            "id": SHOWCASE_SPELL_ID,
            "element": SHOWCASE_ELEMENT,
            "paletteKey": SHOWCASE_PALETTE_KEY,
        },
        "generator": {
            "scriptPath": "tools/pixel-gen/generate_opening_magic.py",
            "scriptSha256": _sha256_file(SCRIPT_PATH),
            "pixelScale": PIXEL_SCALE,
        },
        "toolchain": {
            "runtime": "docker",
            "dockerBaseImage": args.base_image,
            "dockerImage": args.docker_image,
            "dockerImageId": args.docker_image_id,
            "pythonVersion": platform.python_version(),
            "pillowVersion": PIL.__version__,
            "command": args.command,
        },
        "generatedFiles": generated,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        default="output",
        help="Directory to write glyphs/, vfx/, and provenance.json into.",
    )
    parser.add_argument(
        "--base-image",
        default="python:3.11-slim@sha256:db3ff2e1800a8581e2c48a27c3995339d47bdf046da21c7627accd3d51053a93",
        help="Pinned upstream base image reference (tag@digest).",
    )
    parser.add_argument(
        "--docker-image",
        default="last-spellroad/pixel-gen:opening-magic-126",
        help="Tag of the image built from tools/pixel-gen/Dockerfile that ran this script.",
    )
    parser.add_argument(
        "--docker-image-id",
        default="unknown",
        help="`docker image inspect` Id of the built image that ran this script.",
    )
    parser.add_argument(
        "--command",
        default=(
            'docker run --rm -v "$PWD/public/assets/prototypes/opening-magic/'
            'deterministic-original":/out last-spellroad/pixel-gen:opening-magic-126 --output /out'
        ),
        help="Exact command used to invoke this run, recorded verbatim in provenance.json.",
    )
    args = parser.parse_args()

    output_root = Path(args.output)
    glyphs_dir = output_root / "glyphs"
    vfx_dir = output_root / "vfx"
    glyphs_dir.mkdir(parents=True, exist_ok=True)
    vfx_dir.mkdir(parents=True, exist_ok=True)

    generated: list[dict] = []

    for name, builder in GLYPHS.items():
        im = builder()
        im = _upscale(im, PIXEL_SCALE)
        path = glyphs_dir / f"{name}.png"
        im.save(path, **PNG_SAVE_KWARGS)
        generated.append(
            {
                "projectPath": f"public/assets/prototypes/opening-magic/deterministic-original/glyphs/{name}.png",
                "sha256": _sha256_file(path),
                "widthPx": im.width,
                "heightPx": im.height,
                "kind": "glyph",
            }
        )

    for name, builder in VFX_SEQUENCES.items():
        frames = builder()
        atlas, frame_w, frame_h, frame_count = _assemble_atlas(frames, PIXEL_SCALE)
        path = vfx_dir / f"{name}.png"
        atlas.save(path, **PNG_SAVE_KWARGS)
        generated.append(
            {
                "projectPath": f"public/assets/prototypes/opening-magic/deterministic-original/vfx/{name}.png",
                "sha256": _sha256_file(path),
                "widthPx": atlas.width,
                "heightPx": atlas.height,
                "kind": "vfx-spritesheet",
                "frameWidthPx": frame_w,
                "frameHeightPx": frame_h,
                "frameCount": frame_count,
            }
        )

    provenance = build_provenance(output_root, generated, args)
    provenance_path = output_root / "provenance.json"
    provenance_json = json.dumps(provenance, indent=2, sort_keys=False) + "\n"
    provenance_path.write_text(provenance_json)

    print(f"Wrote {len(generated)} asset files + provenance.json to {output_root}")


if __name__ == "__main__":
    main()
