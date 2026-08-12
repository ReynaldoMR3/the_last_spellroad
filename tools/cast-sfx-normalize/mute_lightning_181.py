"""Issue #181 -- mute the lightning cast SFX as an explicit stopgap, pending #137's real
re-source (see docs/agents/tilesmith/log.md's 2026-08-09 entry for the researched-but-not-
downloaded candidate shortlist). Per docs/adr/0003-docker-only-rotating-creative-prototypes.md,
this only ever runs inside Docker (see this directory's Dockerfile) -- never directly on the
host.

Reads the current groundhit-normalized.wav (#111's output: 1.20s file, -16 dBFS RMS over its
real 0.285s of audible content, the rest trailing-silence padding) and writes an all-silence
sibling of identical format/samplerate/subtype/channel-count/duration -- a derivative of the
already-approved CC0 source (Art Sourcing Contract step 3, no new download, no new sourcing),
not a replacement recording. Duration is kept at 1.20s so nothing in the engine's preload/
scheduling code has to special-case a differently-shaped asset for this one element while the
mute is in effect.

Run (from the repo root, after building the image once):
    docker build -t cast-sfx-tools tools/cast-sfx-normalize
    docker run --rm -v "$(pwd)/tools/cast-sfx-normalize:/app" \
        -v "$(pwd)/public/assets/third-party:/audio" \
        --entrypoint python cast-sfx-tools mute_lightning_181.py
"""
import numpy as np
import soundfile as sf

SRC = "/audio/opengameart-electricity-game-sound-pack/groundhit-normalized.wav"
DST = "/audio/opengameart-electricity-game-sound-pack/groundhit-muted.wav"


def measure(data, sr):
    flat = data.reshape(-1)
    peak = float(np.max(np.abs(flat))) if flat.size else 0.0
    rms = float(np.sqrt(np.mean(flat.astype(np.float64) ** 2))) if flat.size else 0.0
    peak_db = 20 * np.log10(peak) if peak > 0 else float("-inf")
    rms_db = 20 * np.log10(rms) if rms > 0 else float("-inf")
    dur = data.shape[0] / sr
    return dur, peak, peak_db, rms, rms_db


def main():
    data, sr = sf.read(SRC, always_2d=True)
    info = sf.info(SRC)

    dur, peak, peak_db, rms, rms_db = measure(data, sr)
    print(f"before: dur={dur:.3f}s peak={peak:.4f} peakDB={peak_db:.2f} rms={rms:.4f} rmsDB={rms_db:.2f}")

    silence = np.zeros_like(data)
    sf.write(DST, silence, sr, subtype=info.subtype)

    data2, sr2 = sf.read(DST, always_2d=True)
    dur2, peak2, peak_db2, rms2, rms_db2 = measure(data2, sr2)
    print(f"after:  dur={dur2:.3f}s peak={peak2:.4f} peakDB={peak_db2:.2f} rms={rms2:.4f} rmsDB={rms_db2:.2f}")


if __name__ == "__main__":
    main()
