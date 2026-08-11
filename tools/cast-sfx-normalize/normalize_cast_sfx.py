"""
Issue #111 — normalize loudness + duration across the 4 per-element cast SFX.

Per docs/adr/0003-docker-only-rotating-creative-prototypes.md, this script only ever runs
inside Docker (see this directory's Dockerfile) -- never directly on the host. It only reads
and derives from files already in the repo (already-approved CC0 assets), no network access,
no new sourcing.

Reads each element's current "-trimmed" (or original, for lightning) file, applies:
  1. RMS-based gain to a common target loudness, with a smooth (tanh) soft-limiter
     ceiling so no file clips even after a large gain boost (avoids the "just clamp
     to peak ceiling" trap, which would leave low-crest-factor files still quiet).
  2. Duration normalization to a single common target length: trim-with-fade (60ms
     linear fade over the cut, same convention as issue #151's trims) for files
     longer than target, or trailing-silence pad for files shorter than target.

Writes each result as a new "-normalized" sibling file, same format/subtype/
samplerate/channel-count as its input (no lossy re-encode surprises), leaving the
"-trimmed"/original files untouched as provenance -- same convention as #151's
"-trimmed" siblings sitting alongside their untouched originals.

Run (from the repo root):
    docker build -t cast-sfx-normalize tools/cast-sfx-normalize
    docker run --rm -v "$(pwd)/public/assets/third-party:/audio" cast-sfx-normalize

See docs/agents/tilesmith/log.md's 2026-08-11 entry for the resulting before/after
measurements and the target values' reasoning.
"""
import numpy as np
import soundfile as sf

TARGET_RMS_DB = -16.0       # common target loudness (dBFS), between the 4 files' spread
CEILING_DB = -1.0           # soft-limiter ceiling so post-gain peaks never clip
TARGET_DURATION_S = 1.20    # common target clip length (matches ice's already-trimmed length,
                            # inside the fire/earth #151 trim range)
FADE_MS = 60.0              # tail fade length, same convention as #151's trims

FILES = {
    "fire": (
        "/audio/opengameart-fireball/105016__julien-matthey__jm-fx-fireball-01-trimmed.wav",
        "/audio/opengameart-fireball/105016__julien-matthey__jm-fx-fireball-01-normalized.wav",
        False,
    ),
    "ice": (
        "/audio/opengameart-freeze-spell/freeze-trimmed.wav",
        "/audio/opengameart-freeze-spell/freeze-normalized.wav",
        False,
    ),
    "earth": (
        "/audio/opengameart-earth-element-magic-spell/earth-element-magic-spell-trimmed.ogg",
        "/audio/opengameart-earth-element-magic-spell/earth-element-magic-spell-normalized.ogg",
        False,
    ),
    "lightning": (
        "/audio/opengameart-electricity-game-sound-pack/groundhit.wav",
        "/audio/opengameart-electricity-game-sound-pack/groundhit-normalized.wav",
        True,  # gets padded with trailing silence -- report content-only loudness too
    ),
}


def db_to_lin(db):
    return 10.0 ** (db / 20.0)


def measure(data, sr):
    flat = data.reshape(-1)
    peak = float(np.max(np.abs(flat))) if flat.size else 0.0
    rms = float(np.sqrt(np.mean(flat.astype(np.float64) ** 2))) if flat.size else 0.0
    peak_db = 20 * np.log10(peak) if peak > 0 else float("-inf")
    rms_db = 20 * np.log10(rms) if rms > 0 else float("-inf")
    dur = data.shape[0] / sr
    return dur, peak, peak_db, rms, rms_db


def soft_limit(data, ceiling_lin):
    """Smoothly compress any excursion above `ceiling_lin` towards it (tanh knee),
    leaving everything below the ceiling untouched -- avoids hard clipping while
    still allowing a real RMS gain boost for quiet, spiky-transient files."""
    sign = np.sign(data)
    mag = np.abs(data)
    over = mag > ceiling_lin
    if np.any(over):
        excess = mag[over] - ceiling_lin
        headroom = 1.0 - ceiling_lin
        # tanh knee: asymptotically approaches ceiling + headroom (i.e. ~1.0) as excess -> inf
        mag[over] = ceiling_lin + headroom * np.tanh(excess / headroom)
    return sign * mag


def fit_duration(data, sr, target_s, fade_ms):
    target_n = int(round(target_s * sr))
    fade_n = int(round(fade_ms / 1000.0 * sr))
    n = data.shape[0]
    if n > target_n:
        out = data[:target_n].copy()
        f = min(fade_n, target_n)
        ramp = np.linspace(1.0, 0.0, f)[:, None]
        out[target_n - f:] *= ramp
        return out
    elif n < target_n:
        pad_n = target_n - n
        out = data.copy()
        # tiny safety fade on the real tail before silence starts, in case the
        # source doesn't already decay to ~0 (lightning's groundhit.wav case)
        f = min(fade_n, n)
        if f > 0:
            ramp = np.linspace(1.0, 0.0, f)[:, None]
            out[n - f:] *= ramp
        pad = np.zeros((pad_n, data.shape[1]), dtype=data.dtype)
        return np.concatenate([out, pad], axis=0)
    return data


def main():
    ceiling_lin = db_to_lin(CEILING_DB)
    target_rms_lin = db_to_lin(TARGET_RMS_DB)

    print(f"{'element':10s} {'stage':10s} {'dur':>7s} {'peak':>9s} {'peakDB':>8s} {'rms':>9s} {'rmsDB':>8s}")
    for name, (src, dst, is_padded) in FILES.items():
        data, sr = sf.read(src, always_2d=True)
        info = sf.info(src)
        orig_n = data.shape[0]

        dur, peak, peak_db, rms, rms_db = measure(data, sr)
        print(f"{name:10s} {'before':10s} {dur:6.3f}s {peak:9.4f} {peak_db:8.2f} {rms:9.4f} {rms_db:8.2f}")

        gain = target_rms_lin / rms if rms > 0 else 1.0
        gained = data.astype(np.float64) * gain
        limited = soft_limit(gained, ceiling_lin)

        fitted = fit_duration(limited, sr, TARGET_DURATION_S, FADE_MS)

        # clip any last-bit float overshoot before writing back at source bit depth
        fitted = np.clip(fitted, -1.0, 1.0).astype(np.float32)

        sf.write(dst, fitted, sr, subtype=info.subtype)

        data2, sr2 = sf.read(dst, always_2d=True)
        dur2, peak2, peak_db2, rms2, rms_db2 = measure(data2, sr2)
        print(f"{name:10s} {'after':10s} {dur2:6.3f}s {peak2:9.4f} {peak_db2:8.2f} {rms2:9.4f} {rms_db2:8.2f}")

        if is_padded:
            # whole-clip RMS is diluted by the trailing silence pad -- report the
            # audible-portion-only loudness too, since that's what a player actually
            # hears at cast time regardless of how long the silent tail runs.
            content_only = data2[:orig_n]
            cdur, cpeak, cpeak_db, crms, crms_db = measure(content_only, sr2)
            print(f"{name:10s} {'after*':10s} {cdur:6.3f}s {cpeak:9.4f} {cpeak_db:8.2f} {crms:9.4f} {crms_db:8.2f}"
                  f"   (*audible portion only, excl. {TARGET_DURATION_S - cdur:.3f}s silence pad)")


if __name__ == "__main__":
    main()
