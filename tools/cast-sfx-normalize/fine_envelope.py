"""Issue #184 -- 10ms-window RMS envelope inspection used to pick fire/ice's further-trim cut
points (see trim_fire_ice_184.py and docs/agents/tilesmith/log.md's 2026-08-12 entry for the
resulting values and reasoning). Read-only: prints an envelope table, writes nothing. Not part
of the shipped asset pipeline -- a diagnostic companion to trim_fire_ice_184.py, same role
mute_lightning_181.py's `measure()` printout plays for #181's file, kept for future re-runs if
either file's source content ever changes.

Run (from the repo root, after building the image once):
    docker build -t cast-sfx-tools tools/cast-sfx-normalize
    docker run --rm -v "$(pwd)/tools/cast-sfx-normalize:/app" \
        -v "$(pwd)/public/assets/third-party:/audio" \
        --entrypoint python cast-sfx-tools fine_envelope.py
"""
import numpy as np
import soundfile as sf

FILES = {
    "fire": "/audio/opengameart-fireball/105016__julien-matthey__jm-fx-fireball-01-normalized.wav",
    "ice": "/audio/opengameart-freeze-spell/freeze-normalized.wav",
}
WINDOW_MS = 10.0
WINDOW_RANGE_S = (0.55, 0.95)  # the region both #111 outputs' envelopes were inspected over

for name, path in FILES.items():
    data, sr = sf.read(path, always_2d=True)
    flat = data.mean(axis=1)
    win = int(round(WINDOW_MS / 1000.0 * sr))
    n = len(flat) // win
    print(f"\n{name} sr={sr}")
    for i in range(n):
        t0 = i * win / sr
        if not (WINDOW_RANGE_S[0] <= t0 <= WINDOW_RANGE_S[1]):
            continue
        seg = flat[i * win:(i + 1) * win]
        rms = float(np.sqrt(np.mean(seg.astype(np.float64) ** 2))) if seg.size else 0.0
        rms_db = 20 * np.log10(rms) if rms > 0 else float("-inf")
        print(f"  t={t0:5.3f}s rmsDB={rms_db:7.2f}")
