"""Issue #184 -- trim fire and ice's cast SFX further past #111's 1.20s cohesion target,
down to something concretely sub-1-second (matching #151's original "<1 second... feels
sluggish" framing). Per docs/adr/0003-docker-only-rotating-creative-prototypes.md, this only
ever runs inside Docker (see this directory's Dockerfile) -- never directly on the host.

Reads each element's current '-normalized' file (#111's output: 1.20s, -16 dBFS RMS target),
cuts it at a natural low-energy point in its envelope (found via
tools/cast-sfx-normalize/fine_envelope.py -- see docs/agents/tilesmith/log.md's 2026-08-12
entry for the actual envelope values and reasoning per element), same 60ms linear fade-out-not-
hard-cut convention #151/#111 established. Truncating removes some of the file's quietest
content, which nudges the whole-clip RMS up slightly -- so after the cut, if the result drifts
outside a small tolerance of the original -16 dBFS target, it re-applies the same tanh
soft-limited RMS-normalization #111's normalize_cast_sfx.py used, so the "loudness preserved"
acceptance criterion holds by measurement, not by assumption.

Writes each result as a new '-normalized-trimmed' sibling (Art Sourcing Contract step 3 -- a
derivative of the already-approved, already-derived '-normalized' file, no new download).
Earth and lightning are untouched by this script.

Run (from the repo root, after building the image once):
    docker build -t cast-sfx-tools tools/cast-sfx-normalize
    docker run --rm -v "$(pwd)/tools/cast-sfx-normalize:/app" \
        -v "$(pwd)/public/assets/third-party:/audio" \
        --entrypoint python cast-sfx-tools trim_fire_ice_184.py
"""
import numpy as np
import soundfile as sf

TARGET_RMS_DB = -16.0   # same target #111 normalized to -- must still hold after this trim
CEILING_DB = -1.0       # same soft-limiter ceiling as #111
RMS_TOLERANCE_DB = 0.5  # re-normalize only if the plain truncation drifted past this
FADE_MS = 60.0          # same fade convention as #151/#111

FILES = {
    "fire": (
        "/audio/opengameart-fireball/105016__julien-matthey__jm-fx-fireball-01-normalized.wav",
        "/audio/opengameart-fireball/105016__julien-matthey__jm-fx-fireball-01-normalized-trimmed.wav",
        0.83,
    ),
    "ice": (
        "/audio/opengameart-freeze-spell/freeze-normalized.wav",
        "/audio/opengameart-freeze-spell/freeze-normalized-trimmed.wav",
        0.71,
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
    sign = np.sign(data)
    mag = np.abs(data)
    over = mag > ceiling_lin
    if np.any(over):
        excess = mag[over] - ceiling_lin
        headroom = 1.0 - ceiling_lin
        mag[over] = ceiling_lin + headroom * np.tanh(excess / headroom)
    return sign * mag


def cut_with_fade(data, sr, target_s, fade_ms):
    target_n = int(round(target_s * sr))
    fade_n = int(round(fade_ms / 1000.0 * sr))
    out = data[:target_n].copy()
    f = min(fade_n, target_n)
    ramp = np.linspace(1.0, 0.0, f)[:, None]
    out[target_n - f:] *= ramp
    return out


def main():
    ceiling_lin = db_to_lin(CEILING_DB)
    target_rms_lin = db_to_lin(TARGET_RMS_DB)

    print(f"{'element':10s} {'stage':16s} {'dur':>7s} {'peak':>9s} {'peakDB':>8s} {'rms':>9s} {'rmsDB':>8s}")
    for name, (src, dst, cut_s) in FILES.items():
        data, sr = sf.read(src, always_2d=True)
        info = sf.info(src)

        dur, peak, peak_db, rms, rms_db = measure(data, sr)
        print(f"{name:10s} {'before (1.20s)':16s} {dur:6.3f}s {peak:9.4f} {peak_db:8.2f} {rms:9.4f} {rms_db:8.2f}")

        cut = cut_with_fade(data, sr, cut_s, FADE_MS)
        dur_c, peak_c, peak_db_c, rms_c, rms_db_c = measure(cut, sr)
        print(f"{name:10s} {'after cut':16s} {dur_c:6.3f}s {peak_c:9.4f} {peak_db_c:8.2f} {rms_c:9.4f} {rms_db_c:8.2f}")

        if abs(rms_db_c - TARGET_RMS_DB) > RMS_TOLERANCE_DB:
            gain = target_rms_lin / rms_c if rms_c > 0 else 1.0
            gained = cut.astype(np.float64) * gain
            final = soft_limit(gained, ceiling_lin)
            final = np.clip(final, -1.0, 1.0).astype(np.float32)
            renormalized = True
        else:
            final = np.clip(cut, -1.0, 1.0).astype(np.float32)
            renormalized = False

        sf.write(dst, final, sr, subtype=info.subtype)

        data2, sr2 = sf.read(dst, always_2d=True)
        dur2, peak2, peak_db2, rms2, rms_db2 = measure(data2, sr2)
        tag = "after (re-norm)" if renormalized else "after (as-is)"
        print(f"{name:10s} {tag:16s} {dur2:6.3f}s {peak2:9.4f} {peak_db2:8.2f} {rms2:9.4f} {rms_db2:8.2f}")


if __name__ == "__main__":
    main()
