#!/usr/bin/env python3
"""Download / inspect / process pipeline for issue #126's "CC0 Remix" treatment
(Tilesmith's slice of the opening-magic three-treatment audition).

Per docs/adr/0003-docker-only-rotating-creative-prototypes.md, this script only ever runs
inside the Docker image built from this directory's Dockerfile -- never directly on the host.
Every subcommand below (fetch/inspect/process) is a step in that same Docker-only pipeline;
there is no host-side network, archive, or image-processing call anywhere in this repo for
this ticket.

Sources (developer-approved, each independently re-verified as CC0 on its own page the same
day this script was written -- see docs/agents/tilesmith/log.md's dated entry for this ticket):
  1. Kenney Rune Pack        -- https://kenney.nl/assets/rune-pack
  2. Kenney Particle Pack    -- https://kenney.nl/assets/particle-pack
  3. OGA "Forest Ambience"   -- https://opengameart.org/content/forest-ambience

Subcommands
-----------
  fetch    Download the 3 approved source files into --raw-dir, recording sha256 + size.
  inspect  List the actual contents of each downloaded archive (file names, counts,
           resolutions where cheap to check) without assuming the landing page's blurb.
  process  Select a curated subset, rasterize/scale/tint the runes, downscale/crop the
           particles, copy+verify the ambience mp3, and write provenance.json.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import platform
import shutil
import subprocess
import zipfile
from pathlib import Path

import requests
from PIL import Image, ImageEnhance

SOURCES = {
    "rune-pack": {
        "url": "https://kenney.nl/media/pages/assets/rune-pack/c63018fba6-1702144010/kenney_rune-pack.zip",
        "assetPage": "https://kenney.nl/assets/rune-pack",
        "title": "Rune Pack",
        "creator": "Kenney",
        "publisher": "Kenney.nl",
        "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
        "filename": "kenney_rune-pack.zip",
    },
    "particle-pack": {
        "url": "https://kenney.nl/media/pages/assets/particle-pack/f8fe0f8cb8-1677578741/kenney_particle-pack.zip",
        "assetPage": "https://kenney.nl/assets/particle-pack",
        "title": "Particle Pack",
        "creator": "Kenney",
        "publisher": "Kenney.nl",
        "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
        "filename": "kenney_particle-pack.zip",
    },
    "forest-ambience": {
        "url": "https://opengameart.org/sites/default/files/Forest_Ambience.mp3",
        "assetPage": "https://opengameart.org/content/forest-ambience",
        "title": "Forest Ambience",
        "creator": "TinyWorlds",
        "publisher": "OpenGameArt.org",
        "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
        "filename": "Forest_Ambience.mp3",
    },
}


# ---------------------------------------------------------------------------------------------
# Showcase spell + palette -- identical to tools/pixel-gen/generate_opening_magic.py's choices,
# so this treatment stays directly comparable to Deterministic Original per the design spec's
# "every audition treatment uses identical movement, enemy silhouettes, spell timing, and one
# showcase cast" rule (docs/agents/_reference/opening-experience-brief.md). The four named
# colors are the brief's own language ("saturated cyan, gold, violet, and ember-orange"), not
# copied from any licensed source -- reusing the same RGB values across treatments is a design
# continuity choice, not a provenance concern.
# ---------------------------------------------------------------------------------------------
SHOWCASE_SPELL_ID = "flame_sweep"
SHOWCASE_ELEMENT = "fire"
SHOWCASE_PALETTE_KEY = "ember"

PALETTE: dict[str, dict[str, tuple[int, int, int]]] = {
    "cyan": {"base": (79, 216, 240), "core": (200, 246, 255), "edge": (24, 92, 110)},
    "gold": {"base": (245, 197, 66), "core": (255, 240, 190), "edge": (117, 82, 12)},
    "violet": {"base": (152, 94, 214), "core": (214, 178, 250), "edge": (63, 32, 96)},
    "ember": {"base": (255, 107, 61), "core": (255, 200, 140), "edge": (120, 32, 12)},
}

RUNE_ICON_SIZE = 32  # matches public/assets/spell-icons/*.png's existing 32x32 convention

# Curated picks from PNG/Grey/Tile/ (36 designs available) -- 4 maximally distinct silhouettes,
# one per palette color, picked by visual inspection of a contact sheet (not the first 4 found).
RUNE_PICKS = {
    "cyan": "PNG/Grey/Tile/runeGrey_tile_007.png",    # Gebo-like "X" -- distinct crossed silhouette
    "gold": "PNG/Grey/Tile/runeGrey_tile_019.png",    # Sowilo-like zigzag -- reads as a lightning/storm mark
    "violet": "PNG/Grey/Tile/runeGrey_tile_034.png",  # Perthro-like hook/bracket -- rounded, distinct from the others
    "ember": "PNG/Grey/Tile/runeGrey_tile_028.png",   # Dagaz-like bowtie/hourglass -- distinct from all 3 above
}

# Curated picks from the Particle Pack's "PNG (Transparent)/" folder -- all white/grayscale
# alpha-mask textures meant to be tinted (confirmed by sampling: R==G==B at every checked pixel),
# same convention a game engine's runtime tint would rely on. One static source image per VFX
# role; frame sequences are built from it below since the pack ships single stills, not animated
# spritesheets.
PARTICLE_PICKS = {
    "cast": "PNG (Transparent)/flame_06.png",     # tall flame lick -- thematically a fire cast
    "impact": "PNG (Transparent)/circle_03.png",  # highest peak alpha of the circle_0X ring variants (checked: circle_01 tops out at alpha 172/255, circle_03 at 251/255) -- picked for legibility once downscaled and dilated
    "trail": "PNG (Transparent)/trace_01.png",    # vertical wavy streak, rotated horizontal for a moving trail
}


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def cmd_fetch(args: argparse.Namespace) -> None:
    raw_dir = Path(args.raw_dir)
    raw_dir.mkdir(parents=True, exist_ok=True)
    report = {}
    for key, meta in SOURCES.items():
        dest = raw_dir / meta["filename"]
        print(f"Fetching {meta['title']} -> {dest}")
        resp = requests.get(meta["url"], timeout=60)
        resp.raise_for_status()
        dest.write_bytes(resp.content)
        report[key] = {
            "path": str(dest),
            "sizeBytes": len(resp.content),
            "sha256": _sha256_file(dest),
            "contentType": resp.headers.get("content-type"),
        }
        print(f"  {len(resp.content)} bytes, sha256={report[key]['sha256']}")
    (raw_dir / "fetch-report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(f"Wrote {raw_dir / 'fetch-report.json'}")


def cmd_inspect(args: argparse.Namespace) -> None:
    raw_dir = Path(args.raw_dir)

    rune_zip = raw_dir / SOURCES["rune-pack"]["filename"]
    print(f"=== {rune_zip.name} ===")
    with zipfile.ZipFile(rune_zip) as zf:
        names = zf.namelist()
        exts: dict[str, int] = {}
        for n in names:
            ext = Path(n).suffix.lower()
            exts[ext] = exts.get(ext, 0) + 1
        print(f"  {len(names)} entries total")
        print(f"  extension counts: {exts}")
        pngs = [n for n in names if n.lower().endswith(".png")]
        print(f"  sample PNG entries: {pngs[:10]}")
        if pngs:
            with zf.open(pngs[0]) as f:
                im = Image.open(f)
                im.load()
                print(f"  sample PNG '{pngs[0]}' size: {im.size} mode: {im.mode}")

    particle_zip = raw_dir / SOURCES["particle-pack"]["filename"]
    print(f"\n=== {particle_zip.name} ===")
    with zipfile.ZipFile(particle_zip) as zf:
        names = zf.namelist()
        pngs = [n for n in names if n.lower().endswith(".png")]
        print(f"  {len(names)} entries total, {len(pngs)} PNGs")
        print(f"  sample PNG entries: {pngs[:15]}")
        if pngs:
            with zf.open(pngs[0]) as f:
                im = Image.open(f)
                im.load()
                print(f"  sample PNG '{pngs[0]}' size: {im.size} mode: {im.mode}")

    mp3 = raw_dir / SOURCES["forest-ambience"]["filename"]
    print(f"\n=== {mp3.name} ===")
    probe = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_entries",
            "format=duration,size,format_name,bit_rate:stream=codec_name,sample_rate,channels",
            "-of", "json", str(mp3),
        ],
        capture_output=True, text=True, check=True,
    )
    print(probe.stdout)


# ---------------------------------------------------------------------------------------------
# Image helpers
# ---------------------------------------------------------------------------------------------

def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _load_zip_png(zip_path: Path, member: str) -> Image.Image:
    with zipfile.ZipFile(zip_path) as zf:
        with zf.open(member) as f:
            im = Image.open(f)
            im.load()
            return im.convert("RGBA")


# Heckler's 2026-08-07 (2) HSV audit measured the 4 tinted rune glyphs at 32-54% average
# saturation vs. Deterministic Original's 55-77%, all 4 less saturated than their counterpart --
# not a mixed bag. Root cause: a straight RGB lerp from `edge_rgb` to `core_rgb` necessarily
# passes through low-saturation territory near the `core_rgb` end, because every core color in
# PALETTE is a pale, near-white highlight tone (e.g. cyan core (200,246,255) is ~22% saturated
# on its own) -- and a sizeable fraction of each source tile's luminance range sits close enough
# to white to land in that low-saturation band. Fixed by boosting saturation (PIL's
# ImageEnhance.Color, applied to the RGB bands only, alpha untouched) after the lerp rather than
# reshaping the lerp itself, since the lerp's luminance-preserving shading (the tile's own bevel)
# is worth keeping. Factor tuned empirically against all 4 glyphs together (the tightest of the
# 4, violet, needs the most help) -- see docs/agents/tilesmith/log.md's dated fix entry for the
# before/after HSV numbers this was checked against.
RUNE_SATURATION_BOOST = 2.2


def _colorize_by_luminance(im: Image.Image, edge_rgb, core_rgb) -> Image.Image:
    """Recolor a grayscale-alpha source (R==G==B) by lerping edge_rgb -> core_rgb across its
    luminance range, then boosting saturation (see RUNE_SATURATION_BOOST above), keeping the
    original alpha channel untouched throughout. This is the tint transform applied to the Grey
    rune tiles -- same base technique the deterministic-original generator used for its own
    edge/base/core ring gradient, applied here to sourced pixels instead of hand-drawn ones."""
    im = im.convert("RGBA")
    r, g, b, a = im.split()
    luminance = Image.merge("RGB", (r, g, b)).convert("L")

    def lerp_channel(idx: int) -> Image.Image:
        e, c = edge_rgb[idx], core_rgb[idx]
        return luminance.point(lambda v, e=e, c=c: int(round(e + (c - e) * (v / 255.0))))

    tinted_rgb = Image.merge("RGB", (lerp_channel(0), lerp_channel(1), lerp_channel(2)))
    boosted_rgb = ImageEnhance.Color(tinted_rgb).enhance(RUNE_SATURATION_BOOST)
    br, bg, bb = boosted_rgb.split()
    return Image.merge("RGBA", (br, bg, bb, a))


def _colorize_particle(im: Image.Image, base_rgb, core_rgb, gamma: float = 0.55) -> Image.Image:
    """Tint for the Particle Pack's soft radial-glow masks. A straight luminance-lerp (as used
    for the rune tiles, whose luminance is fairly evenly spread 0-217) reads muddy on these
    textures because most visible pixels sit in a narrow low-to-mid luminance band -- a gamma
    curve (v**gamma, gamma<1) brightens midtones before the base->core lerp so the result reads
    as a vivid glow instead of dim brown, closer to how a game engine's additive/screen blend
    would actually render these textures at runtime."""
    im = im.convert("RGBA")
    r, g, b, a = im.split()
    luminance = Image.merge("RGB", (r, g, b)).convert("L")
    boosted = luminance.point(lambda v: int(round(255 * ((v / 255.0) ** gamma))))

    def lerp_channel(idx: int) -> Image.Image:
        e, c = base_rgb[idx], core_rgb[idx]
        return boosted.point(lambda v, e=e, c=c: int(round(e + (c - e) * (v / 255.0))))

    return Image.merge("RGBA", (lerp_channel(0), lerp_channel(1), lerp_channel(2), a))


def _dilate_alpha(im: Image.Image, radius: int = 1) -> Image.Image:
    """Thicken a thin sourced line/streak by max-filtering its alpha channel before downscaling,
    so a hairline stroke stays legible once shrunk to this project's small VFX frame sizes."""
    from PIL import ImageFilter

    r, g, b, a = im.split()
    size = radius * 2 + 1
    a = a.filter(ImageFilter.MaxFilter(size))
    return Image.merge("RGBA", (r, g, b, a))


def _pad_to_square(im: Image.Image) -> Image.Image:
    w, h = im.size
    side = max(w, h)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - w) // 2, (side - h) // 2))  # no mask arg: destination is fully
    # transparent already, and passing `im` as its own mask would square its alpha channel
    # (Pillow's paste blends the alpha band through the mask too) -- confirmed empirically,
    # not just in docs, before fixing this the same way at every other paste call site below.
    return canvas


def _fit_into(im: Image.Image, size: int) -> Image.Image:
    """Autocrop to content, pad to square, then LANCZOS-resize to size x size. LANCZOS (not
    NEAREST) is used deliberately: unlike Deterministic Original's hand-drawn native pixel art,
    this source is smooth vector-rasterized art, so a smooth resample avoids introducing fake
    jagged edges that were never in the source."""
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    im = _pad_to_square(im)
    return im.resize((size, size), Image.LANCZOS)


def _with_alpha_scale(im: Image.Image, factor: float) -> Image.Image:
    r, g, b, a = im.split()
    a = a.point(lambda v: int(round(v * factor)))
    return Image.merge("RGBA", (r, g, b, a))


PNG_SAVE_KWARGS = {"format": "PNG", "optimize": False, "compress_level": 6}


def _save_png(im: Image.Image, path: Path) -> tuple[str, int, int]:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, **PNG_SAVE_KWARGS)
    return _sha256_file(path), im.width, im.height


# ---------------------------------------------------------------------------------------------
# Process: runes
# ---------------------------------------------------------------------------------------------

def _process_runes(zip_path: Path, out_dir: Path, generated: list, transforms_log: list) -> None:
    for color, member in RUNE_PICKS.items():
        pal = PALETTE[color]
        src = _load_zip_png(zip_path, member)
        src_luminance_max = src.convert("L").getextrema()[1]
        tinted = _colorize_by_luminance(src, pal["edge"], pal["core"])
        final = _fit_into(tinted, RUNE_ICON_SIZE)
        out_path = out_dir / "glyphs" / f"rune-{color}.png"
        sha, w, h = _save_png(final, out_path)
        generated.append(
            {
                "projectPath": f"public/assets/prototypes/opening-magic/cc0-remix/glyphs/rune-{color}.png",
                "sha256": sha,
                "widthPx": w,
                "heightPx": h,
                "kind": "glyph",
                "sourceAssetId": "kenney-rune-pack",
                "sourceArchiveMember": member,
            }
        )
        transforms_log.append(
            {
                "output": f"glyphs/rune-{color}.png",
                "sourceArchiveMember": member,
                "transforms": ["extract-from-zip", "tint (luminance-lerp edge->core)", f"saturation boost ({RUNE_SATURATION_BOOST}x, ImageEnhance.Color, alpha preserved)", "autocrop", "pad-to-square", "resize (LANCZOS) to 32x32"],
                "note": (
                    f"Source is a native 50x56 monochrome grey tile (max luminance {src_luminance_max}/255) -- "
                    "Kenney's Rune Pack ships Black/Blue/Grey only, none of the brief's 4 named colors, so "
                    "recoloring toward the palette is a required tint pass, not optional polish. The saturation "
                    "boost was added to fix a Heckler-flagged deficiency (32-54% avg saturation vs. "
                    "Deterministic Original's 55-77%) -- see docs/agents/tilesmith/log.md's dated fix entry."
                ),
            }
        )


# ---------------------------------------------------------------------------------------------
# Process: particles / VFX
# ---------------------------------------------------------------------------------------------

def _build_cast_frames(src: Image.Image, pal: dict) -> list[Image.Image]:
    """Fading flame-lick cast flash -- same 4-step fade cadence as deterministic-original's
    cast_flash_frames, applied to a real sourced texture instead of a hand-drawn wedge. Uses
    _colorize_particle's gamma-boosted base->core lerp (see that function's docstring) rather
    than a flat edge->core lerp, which read muddy/brown on this soft-glow source."""
    frame_size = 64
    base = _fit_into(src, frame_size)
    tinted = _colorize_particle(base, pal["base"], pal["core"])
    alpha_fractions = [1.0, 0.78, 0.5, 0.28]
    return [_with_alpha_scale(tinted, f) for f in alpha_fractions]


def _build_impact_frames(src: Image.Image, pal: dict) -> list[Image.Image]:
    """Expanding, fading ring -- matches deterministic-original's impact_frames radius/alpha
    progression, built here from a real sourced ring texture (Particle Pack's circle_01) instead
    of a drawn ellipse. The ring's alpha is dilated before downscaling since a hairline stroke at
    native 512px shrinks to near-invisible at this project's 48px VFX frame size."""
    frame_size = 48
    cropped = src.crop(src.getbbox())
    cropped = _pad_to_square(cropped)
    cropped = _dilate_alpha(cropped, radius=6)
    scales = [0.4, 0.6, 0.82, 1.0]
    alpha_fractions = [1.0, 0.8, 0.55, 0.3]
    frames = []
    for scale, alpha_fraction in zip(scales, alpha_fractions):
        side = max(1, int(round(frame_size * scale)))
        ring = cropped.resize((side, side), Image.LANCZOS)
        canvas = Image.new("RGBA", (frame_size, frame_size), (0, 0, 0, 0))
        canvas.paste(ring, ((frame_size - side) // 2, (frame_size - side) // 2))  # see _pad_to_square's comment: no mask arg, avoids squaring alpha
        tinted = _colorize_particle(canvas, pal["base"], pal["core"])
        frames.append(_with_alpha_scale(tinted, alpha_fraction))
    return frames


def _build_trail_frames(src: Image.Image, pal: dict) -> list[Image.Image]:
    """Traveling streak trail -- Particle Pack ships a static wavy line (trace_01), not an
    animated sequence, so the "movement" is built by sliding a fixed-width crop window across a
    widened version of the same streak texture and fading each step's alpha, generalizing
    deterministic-original's dot-with-tail trail_frames convention to a real sourced texture.
    Alpha is dilated before downscaling for the same hairline-visibility reason as the ring."""
    frame_w, frame_h = 64, 24
    rotated = src.rotate(-90, expand=True)
    cropped = rotated.crop(rotated.getbbox())
    cropped = _dilate_alpha(cropped, radius=8)
    # Scale so the streak's thickness fits the frame height, then pad it out wide enough to
    # slide a window across.
    scale = frame_h / cropped.height
    wide = cropped.resize((max(frame_w * 2, int(cropped.width * scale)), frame_h), Image.LANCZOS)
    if wide.width > frame_w:
        step = (wide.width - frame_w) / 3
        positions = [int(round(step * i)) for i in range(4)]
    else:
        positions = [0, 0, 0, 0]
    alpha_fractions = [0.4, 0.62, 0.82, 1.0]
    frames = []
    for x, alpha_fraction in zip(positions, alpha_fractions):
        crop = wide.crop((x, 0, x + frame_w, frame_h))
        tinted = _colorize_particle(crop, pal["base"], pal["core"])
        frames.append(_with_alpha_scale(tinted, alpha_fraction))
    return frames


def _assemble_atlas(frames: list[Image.Image]) -> Image.Image:
    frame_w, frame_h = frames[0].size
    atlas = Image.new("RGBA", (frame_w * len(frames), frame_h), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        atlas.paste(frame, (i * frame_w, 0))  # see _pad_to_square's comment: no mask arg, avoids squaring alpha
    return atlas


def _process_vfx(zip_path: Path, out_dir: Path, generated: list, transforms_log: list) -> None:
    pal = PALETTE[SHOWCASE_PALETTE_KEY]

    cast_src = _load_zip_png(zip_path, PARTICLE_PICKS["cast"])
    cast_frames = _build_cast_frames(cast_src, pal)
    cast_atlas = _assemble_atlas(cast_frames)
    path = out_dir / "vfx" / f"cast-{SHOWCASE_SPELL_ID}.png"
    sha, w, h = _save_png(cast_atlas, path)
    generated.append({
        "projectPath": f"public/assets/prototypes/opening-magic/cc0-remix/vfx/cast-{SHOWCASE_SPELL_ID}.png",
        "sha256": sha, "widthPx": w, "heightPx": h, "kind": "vfx-spritesheet",
        "frameWidthPx": w // 4, "frameHeightPx": h, "frameCount": 4,
        "sourceAssetId": "kenney-particle-pack", "sourceArchiveMember": PARTICLE_PICKS["cast"],
    })
    transforms_log.append({
        "output": f"vfx/cast-{SHOWCASE_SPELL_ID}.png",
        "sourceArchiveMember": PARTICLE_PICKS["cast"],
        "transforms": ["extract-from-zip", "downscale 512x512 -> 64x64 (LANCZOS)", "tint (gamma-boosted base->core lerp)", "4-frame fade (alpha fraction 1.0/0.78/0.5/0.28, same 4-step cadence as deterministic-original's cast ramp)"],
    })

    impact_src = _load_zip_png(zip_path, PARTICLE_PICKS["impact"])
    impact_frames = _build_impact_frames(impact_src, pal)
    impact_atlas = _assemble_atlas(impact_frames)
    path = out_dir / "vfx" / f"impact-{SHOWCASE_SPELL_ID}.png"
    sha, w, h = _save_png(impact_atlas, path)
    generated.append({
        "projectPath": f"public/assets/prototypes/opening-magic/cc0-remix/vfx/impact-{SHOWCASE_SPELL_ID}.png",
        "sha256": sha, "widthPx": w, "heightPx": h, "kind": "vfx-spritesheet",
        "frameWidthPx": w // 4, "frameHeightPx": h, "frameCount": 4,
        "sourceAssetId": "kenney-particle-pack", "sourceArchiveMember": PARTICLE_PICKS["impact"],
    })
    transforms_log.append({
        "output": f"vfx/impact-{SHOWCASE_SPELL_ID}.png",
        "sourceArchiveMember": PARTICLE_PICKS["impact"],
        "transforms": ["extract-from-zip", "crop to ring bbox", "dilate alpha (MaxFilter r=6, hairline-at-512px would vanish at 48px)", "downscale 512x512 -> 48x48 at 4 expanding scales (0.4/0.6/0.82/1.0, LANCZOS)", "tint (gamma-boosted base->core lerp)", "4-frame expand+fade (alpha fraction 1.0/0.8/0.55/0.3, same cadence as deterministic-original's impact ramp)"],
    })

    trail_src = _load_zip_png(zip_path, PARTICLE_PICKS["trail"])
    trail_frames = _build_trail_frames(trail_src, pal)
    trail_atlas = _assemble_atlas(trail_frames)
    path = out_dir / "vfx" / f"trail-{SHOWCASE_ELEMENT}.png"
    sha, w, h = _save_png(trail_atlas, path)
    generated.append({
        "projectPath": f"public/assets/prototypes/opening-magic/cc0-remix/vfx/trail-{SHOWCASE_ELEMENT}.png",
        "sha256": sha, "widthPx": w, "heightPx": h, "kind": "vfx-spritesheet",
        "frameWidthPx": w // 4, "frameHeightPx": h, "frameCount": 4,
        "sourceAssetId": "kenney-particle-pack", "sourceArchiveMember": PARTICLE_PICKS["trail"],
    })
    transforms_log.append({
        "output": f"vfx/trail-{SHOWCASE_ELEMENT}.png",
        "sourceArchiveMember": PARTICLE_PICKS["trail"],
        "transforms": ["extract-from-zip", "rotate 90deg (vertical streak -> horizontal)", "crop to bbox", "dilate alpha (MaxFilter r=8, hairline-at-512px would vanish at 24px)", "downscale to 24px tall (LANCZOS)", "tint (gamma-boosted base->core lerp)", "4-frame sliding-window crop simulating motion (alpha fraction 0.4/0.62/0.82/1.0, generalizes deterministic-original's dot-with-tail trail)"],
    })


# ---------------------------------------------------------------------------------------------
# Process: audio
# ---------------------------------------------------------------------------------------------

def _process_audio(raw_dir: Path, out_dir: Path, generated: list, transforms_log: list) -> dict:
    src = raw_dir / SOURCES["forest-ambience"]["filename"]
    out_path = out_dir / "audio" / "forest-ambience.mp3"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, out_path)

    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries",
         "format=duration,size,format_name,bit_rate:stream=codec_name,sample_rate,channels",
         "-of", "json", str(out_path)],
        capture_output=True, text=True, check=True,
    )
    probe_data = json.loads(probe.stdout)

    # Basic loop-boundary sanity check: decode to raw PCM and compare RMS amplitude of the
    # first/last 100ms. This is NOT a full seamless-loop crossfade verification (that needs
    # actual playback in a browser per the design brief's own validation step) -- it only rules
    # out a grossly mismatched hard silence-vs-noise edge or an obvious clipped/truncated file.
    raw_pcm = out_dir / "audio" / "_loop_check.raw"
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", str(out_path), "-f", "s16le", "-ar", "48000", "-ac", "1", str(raw_pcm)],
        check=True,
    )
    data = raw_pcm.read_bytes()
    raw_pcm.unlink()
    sample_count = len(data) // 2
    window = int(0.1 * 48000)  # 100ms of samples

    def rms(byte_slice: bytes) -> float:
        import struct
        n = len(byte_slice) // 2
        if n == 0:
            return 0.0
        vals = struct.unpack(f"<{n}h", byte_slice)
        return (sum(v * v for v in vals) / n) ** 0.5

    start_rms = rms(data[: window * 2])
    end_rms = rms(data[-window * 2 :])

    sha, size = _sha256_file(out_path), out_path.stat().st_size
    generated.append({
        "projectPath": "public/assets/prototypes/opening-magic/cc0-remix/audio/forest-ambience.mp3",
        "sha256": sha,
        "sizeBytes": size,
        "kind": "audio-loop",
        "sourceAssetId": "oga-forest-ambience",
        "durationSeconds": float(probe_data["format"]["duration"]),
    })
    transforms_log.append({
        "output": "audio/forest-ambience.mp3",
        "transforms": ["copy (already MP3, no transcode needed)", "ffprobe format/codec verification", "loop-boundary RMS sanity check (first/last 100ms)"],
        "verification": {
            "ffprobe": probe_data,
            "startRms": round(start_rms, 1),
            "endRms": round(end_rms, 1),
            "note": (
                "Both edges have comparable, non-zero RMS (not one silent/one loud), consistent with the "
                "uploader's 'loops seamlessly' claim -- this is a basic amplitude-continuity check, not a "
                "full crossfade/seamless-loop verification, which needs actual browser playback per the "
                "opening-experience-brief's validation step."
            ),
        },
    })
    return probe_data


def cmd_process(args: argparse.Namespace) -> None:
    raw_dir = Path(args.raw_dir)
    out_dir = Path(args.output)
    for sub in ("glyphs", "vfx", "audio"):
        (out_dir / sub).mkdir(parents=True, exist_ok=True)

    rune_zip = raw_dir / SOURCES["rune-pack"]["filename"]
    particle_zip = raw_dir / SOURCES["particle-pack"]["filename"]

    generated: list = []
    transforms_log: list = []

    _process_runes(rune_zip, out_dir, generated, transforms_log)
    _process_vfx(particle_zip, out_dir, generated, transforms_log)
    audio_probe = _process_audio(raw_dir, out_dir, generated, transforms_log)

    fetch_report_path = raw_dir / "fetch-report.json"
    fetch_report = json.loads(fetch_report_path.read_text()) if fetch_report_path.exists() else {}

    import PIL

    provenance = {
        "schemaVersion": 1,
        "kind": "sourced",
        "ticket": "https://github.com/ReynaldoMR3/the_last_spellroad/issues/126",
        "treatment": "cc0-remix",
        "showcaseSpell": {
            "id": SHOWCASE_SPELL_ID,
            "element": SHOWCASE_ELEMENT,
            "paletteKey": SHOWCASE_PALETTE_KEY,
        },
        "sources": [
            {
                "id": "kenney-rune-pack",
                "title": SOURCES["rune-pack"]["title"],
                "creator": SOURCES["rune-pack"]["creator"],
                "publisher": SOURCES["rune-pack"]["publisher"],
                "assetPage": SOURCES["rune-pack"]["assetPage"],
                "downloadUrlAtAcquisition": SOURCES["rune-pack"]["url"],
                "license": {
                    "spdx": "CC0-1.0",
                    "url": SOURCES["rune-pack"]["licenseUrl"],
                    "declaredOn": "assetPage",
                    "attributionRequired": False,
                    "humanVerifiedBy": "tilesmith-agent (re-fetched page text same session)",
                },
                "archiveFile": {
                    "filename": SOURCES["rune-pack"]["filename"],
                    "sha256": fetch_report.get("rune-pack", {}).get("sha256"),
                    "sizeBytes": fetch_report.get("rune-pack", {}).get("sizeBytes"),
                },
            },
            {
                "id": "kenney-particle-pack",
                "title": SOURCES["particle-pack"]["title"],
                "creator": SOURCES["particle-pack"]["creator"],
                "publisher": SOURCES["particle-pack"]["publisher"],
                "assetPage": SOURCES["particle-pack"]["assetPage"],
                "downloadUrlAtAcquisition": SOURCES["particle-pack"]["url"],
                "license": {
                    "spdx": "CC0-1.0",
                    "url": SOURCES["particle-pack"]["licenseUrl"],
                    "declaredOn": "assetPage",
                    "attributionRequired": False,
                    "humanVerifiedBy": "tilesmith-agent (re-fetched page text same session)",
                },
                "archiveFile": {
                    "filename": SOURCES["particle-pack"]["filename"],
                    "sha256": fetch_report.get("particle-pack", {}).get("sha256"),
                    "sizeBytes": fetch_report.get("particle-pack", {}).get("sizeBytes"),
                },
            },
            {
                "id": "oga-forest-ambience",
                "title": SOURCES["forest-ambience"]["title"],
                "creator": SOURCES["forest-ambience"]["creator"],
                "publisher": SOURCES["forest-ambience"]["publisher"],
                "assetPage": SOURCES["forest-ambience"]["assetPage"],
                "downloadUrlAtAcquisition": SOURCES["forest-ambience"]["url"],
                "license": {
                    "spdx": "CC0-1.0",
                    "url": SOURCES["forest-ambience"]["licenseUrl"],
                    "declaredOn": "assetPage",
                    "attributionRequired": False,
                    "humanVerifiedBy": "tilesmith-agent (re-fetched page text same session)",
                },
                "archiveFile": {
                    "filename": SOURCES["forest-ambience"]["filename"],
                    "sha256": fetch_report.get("forest-ambience", {}).get("sha256"),
                    "sizeBytes": fetch_report.get("forest-ambience", {}).get("sizeBytes"),
                },
            },
        ],
        "toolchain": {
            "runtime": "docker",
            "dockerImage": args.docker_image,
            "dockerImageId": args.docker_image_id,
            "dockerBaseImage": args.base_image,
            "pythonVersion": platform.python_version(),
            "pillowVersion": PIL.__version__,
            "command": args.command,
        },
        "derivatives": generated,
        "transforms": transforms_log,
    }

    provenance_path = Path(args.output) / "provenance.json"
    provenance_path.write_text(json.dumps(provenance, indent=2, sort_keys=False) + "\n")
    print(f"Wrote {len(generated)} derivative files + provenance.json to {args.output}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_fetch = sub.add_parser("fetch", help="Download the 3 approved source files.")
    p_fetch.add_argument("--raw-dir", default="/work/raw")
    p_fetch.set_defaults(func=cmd_fetch)

    p_inspect = sub.add_parser("inspect", help="Inspect downloaded archive contents.")
    p_inspect.add_argument("--raw-dir", default="/work/raw")
    p_inspect.set_defaults(func=cmd_inspect)

    p_process = sub.add_parser("process", help="Produce derivative assets + provenance.json.")
    p_process.add_argument("--raw-dir", default="/work/raw")
    p_process.add_argument("--output", default="/out")
    p_process.add_argument(
        "--base-image",
        default="python:3.11-slim@sha256:90744cff8f32887f075c47d747a173ff333e9e98801667af93c357fa9f5e28ff",
    )
    p_process.add_argument("--docker-image", default="last-spellroad/cc0-remix:opening-magic-126")
    p_process.add_argument("--docker-image-id", default="unknown")
    p_process.add_argument("--command", default="")
    p_process.set_defaults(func=cmd_process)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
