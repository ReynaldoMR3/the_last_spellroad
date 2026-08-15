"""Issue #251 -- trim earth's cast SFX further past #111's 1.20s cohesion target, down to
something in the same sub-1-second range #184 already brought fire (0.83s) and ice (0.71s) to.
Per docs/adr/0003-docker-only-rotating-creative-prototypes.md, this only ever runs inside
Docker (see this directory's Dockerfile) -- never directly on the host.

Why earth wasn't touched by #184: that ticket's own developer complaint ("the audio of the
fire and ice spells are still too long") never named earth, so #184 explicitly left it alone
(see sfx.ts's ELEMENT_CAST_URL doc comment, 2026-08-12 entry). A later playtest (issue #251)
reopened it specifically for earth ("earth SFX too long and too strong (loud)") -- this script
is that same #184 treatment, applied to the one element it was withheld from.

Envelope check first (fine_envelope_earth_251.py, read-only, same method #184's own
fine_envelope.py used for fire/ice): earth's #111 '-normalized' output (1.20s) is a sustained
rumbling-rock texture with no single deep silence gap the way fire/ice had -- the clearest local
energy dip in the back half sits at t=0.84-0.85s (rmsDB dips from -18.51 to -20.12 before jumping
back up to -14.14 at t=0.86s, i.e. dipping-then-rising, the same "don't chop mid-swell, cut in the
dip" rule #151/#184 used). Cutting at 0.85s lands right after that trough and keeps the clip in
the same sub-1s range as fire (0.83s)/ice (0.71s) for cross-element cohesion, addressing both the
"too long" half of #251's complaint directly.

Reads earth's current '-normalized' file (#111's output: 1.20s, -16 dBFS RMS target), cuts it at
the 0.85s dip above, same 60ms linear fade-out-not-hard-cut convention as #151/#111/#184. Per
#184's own precedent, a truncation nudges whole-clip RMS since it removes some of the quietest
tail content -- re-checks the cut against the -16 dBFS target and re-applies the same tanh
soft-limited gain if it drifted more than 0.5dB, addressing the "too strong (loud)" half of
#251's complaint by measurement rather than assumption (a longer clip with the same RMS target
can still read as "louder" perceptually since there's simply more sound hitting the ear per cast
-- trimming duration is itself part of the loudness fix here, not just the length fix).

Writes the result as a new '-normalized-trimmed' sibling (Art Sourcing Contract step 3 -- a
derivative of the already-approved, already-derived '-normalized' file, no new download), same
naming convention #184 used for fire/ice.

Run (from the repo root, after building the image once):
    docker build -t cast-sfx-tools tools/cast-sfx-normalize
    docker run --rm -v "$(pwd)/tools/cast-sfx-normalize:/app" \
        -v "$(pwd)/public/assets/third-party:/audio" \
        --entrypoint python cast-sfx-tools trim_earth_251.py
"""
import numpy as np
import soundfile as sf

TARGET_RMS_DB = -16.0   # same target #111 normalized to -- must still hold after this trim
CEILING_DB = -1.0       # same soft-limiter ceiling as #111/#184
RMS_TOLERANCE_DB = 0.5  # re-normalize only if the plain truncation drifted past this
FADE_MS = 60.0          # same fade convention as #151/#111/#184

SRC = "/audio/opengameart-earth-element-magic-spell/earth-element-magic-spell-normalized.ogg"
DST = "/audio/opengameart-earth-element-magic-spell/earth-element-magic-spell-normalized-trimmed.ogg"
CUT_S = 0.85


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

    data, sr = sf.read(SRC, always_2d=True)
    info = sf.info(SRC)

    print(f"{'stage':16s} {'dur':>7s} {'peak':>9s} {'peakDB':>8s} {'rms':>9s} {'rmsDB':>8s}")
    dur, peak, peak_db, rms, rms_db = measure(data, sr)
    print(f"{'before (1.20s)':16s} {dur:6.3f}s {peak:9.4f} {peak_db:8.2f} {rms:9.4f} {rms_db:8.2f}")

    cut = cut_with_fade(data, sr, CUT_S, FADE_MS)
    dur_c, peak_c, peak_db_c, rms_c, rms_db_c = measure(cut, sr)
    print(f"{'after cut':16s} {dur_c:6.3f}s {peak_c:9.4f} {peak_db_c:8.2f} {rms_c:9.4f} {rms_db_c:8.2f}")

    if abs(rms_db_c - TARGET_RMS_DB) > RMS_TOLERANCE_DB:
        gain = target_rms_lin / rms_c if rms_c > 0 else 1.0
        gained = cut.astype(np.float64) * gain
        final = soft_limit(gained, ceiling_lin)
        final = np.clip(final, -1.0, 1.0).astype(np.float32)
        renormalized = True
    else:
        final = np.clip(cut, -1.0, 1.0).astype(np.float32)
        renormalized = False

    sf.write(DST, final, sr, subtype=info.subtype)

    data2, sr2 = sf.read(DST, always_2d=True)
    dur2, peak2, peak_db2, rms2, rms_db2 = measure(data2, sr2)
    tag = "after (re-norm)" if renormalized else "after (as-is)"
    print(f"{tag:16s} {dur2:6.3f}s {peak2:9.4f} {peak_db2:8.2f} {rms2:9.4f} {rms_db2:8.2f}")


if __name__ == "__main__":
    main()
