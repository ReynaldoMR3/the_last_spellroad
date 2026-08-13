"""Issue #191 -- mute the shared `impact` and `enemyDeath` SFX cues as an explicit,
developer-requested stopgap for playtesting. Per docs/adr/0003-docker-only-rotating-creative-
prototypes.md, this only ever runs inside Docker (see this directory's Dockerfile) -- never
directly on the host.

Developer feedback (2026-08-12, issue #191): "it happens when an enemy dies, also i dont like
the sound of the enemy getting hitted, so i think we should mute those 2 so i can playtest and
share more feedback." Read as: mute `enemyDeath` (the "enemy dies" cue) and `impact` (the
"enemy getting hit" cue) -- both shared, non-element-specific `sfx.ts` cues, not the per-element
cast recordings. Explicitly a stopgap for the next playtest pass, not a permanent removal --
the developer is muting to isolate feedback, not declaring these sounds wrong forever.

Writes all-silence siblings of identical format/samplerate/subtype/channel-count/duration for
both files -- same derivative-of-the-already-approved-CC0-source convention #181's
mute_lightning_181.py used, no new sourcing.

Run (from the repo root, after building the image once):
    docker build -t cast-sfx-tools tools/cast-sfx-normalize
    docker run --rm -v "$(pwd)/tools/cast-sfx-normalize:/app" \
        -v "$(pwd)/public/assets/third-party:/audio" \
        --entrypoint python cast-sfx-tools mute_impact_enemydeath_191.py
"""
import numpy as np
import soundfile as sf

FILES = [
    ("impact", "/audio/kenney-impact-sounds/Audio/impactGeneric_light_001.ogg",
     "/audio/kenney-impact-sounds/Audio/impactGeneric_light_001-muted.ogg"),
    ("enemyDeath", "/audio/kenney-digital-audio/Audio/phaserDown1.ogg",
     "/audio/kenney-digital-audio/Audio/phaserDown1-muted.ogg"),
]


def measure(data, sr):
    flat = data.reshape(-1)
    peak = float(np.max(np.abs(flat))) if flat.size else 0.0
    rms = float(np.sqrt(np.mean(flat.astype(np.float64) ** 2))) if flat.size else 0.0
    peak_db = 20 * np.log10(peak) if peak > 0 else float("-inf")
    rms_db = 20 * np.log10(rms) if rms > 0 else float("-inf")
    dur = data.shape[0] / sr
    return dur, peak, peak_db, rms, rms_db


def main():
    for cue, src, dst in FILES:
        data, sr = sf.read(src, always_2d=True)
        info = sf.info(src)

        dur, peak, peak_db, rms, rms_db = measure(data, sr)
        print(f"{cue} before: dur={dur:.3f}s peak={peak:.4f} peakDB={peak_db:.2f} rms={rms:.4f} rmsDB={rms_db:.2f}")

        silence = np.zeros_like(data)
        sf.write(dst, silence, sr, subtype=info.subtype)

        data2, sr2 = sf.read(dst, always_2d=True)
        dur2, peak2, peak_db2, rms2, rms_db2 = measure(data2, sr2)
        print(f"{cue} after:  dur={dur2:.3f}s peak={peak2:.4f} peakDB={peak_db2:.2f} rms={rms2:.4f} rmsDB={rms_db2:.2f}")


if __name__ == "__main__":
    main()
