"""
Composer agent -- issue #142 (epic #124), render step for
combat-encounter-loop.mid -> combat-encounter-loop.ogg.

Render method: pretty_midi.PrettyMIDI(...).synthesize() (naive additive
sine-wave synthesis, no system fluidsynth/ffmpeg/soundfont dependency) +
soundfile.write(..., format="OGG", subtype="VORBIS") -- same toolchain
already used for boss-1-invigilator-trial-theme.ogg
(docs/agents/loomwright/log.md, 2026-08-05 entry), run here in a scratch
`python3 -m venv` per the same "no host audio tooling" constraint.

Two real defects were found and fixed while verifying the *actual rendered
file* rather than trusting the source MIDI's notated length -- the exact
verification gap the task briefing for issue #142 called out by name:

1. **Dead-air tail.** pretty_midi.Instrument.synthesize() pre-allocates its
   output buffer to `int(fs * (get_end_time() + 1))` samples -- a full extra
   second of true digital silence past the last note, on every instrument,
   every render. Confirmed by a windowed-RMS scan of the raw synthesize()
   output: notated end 28.235264s, raw render 29.235s, audio content (plus
   natural decay) ends by ~28.25s, then flat -inf (exact zeros) for the
   remaining ~1.0s. Re-running the same scan against the *already-shipped*
   `public/assets/audio/music/boss-1-invigilator-trial-theme.ogg` found the
   identical defect there too: it reports 61.0s, not the "confirmed 60s"
   its own log entry claimed, with a genuine 1.0s true-silence tail from
   60.0s to 61.0s -- the exact same renderer bug, never caught because
   duration was checked against the source `.mid`'s notated length rather
   than the rendered `.ogg` file itself. Flagged separately as an
   out-of-scope pre-existing issue; not fixed here (out of this ticket's
   target).

2. **Peak overshoot / mild clipping.** pretty_midi.synthesize(normalize=True)
   hard-normalizes the raw waveform to a peak of exactly 1.0 with zero
   headroom. Lossy Vorbis re-quantization then overshoots that ceiling
   slightly on encode. Confirmed on the pre-fix render of this track (peak
   1.0072 post-encode, 25 near-clip samples) and, again, on the already-
   shipped boss-1 file (peak 1.0246, 40 near-clip samples) -- same renderer,
   same defect, undetected there for the same reason as #1.

Fix applied here: trim to `get_end_time() + 0.35s` (musical end-point plus
natural decay room, discarding the dead-air padding), apply a 200ms linear
fade to true zero ending at the trim point (no click at the loop seam), and
target -1dBFS peak headroom before the Vorbis encode (instead of pretty_midi's
default hard 0dBFS) so the lossy round-trip has room to overshoot without
exceeding full scale.
"""
import sys

import numpy as np
import pretty_midi
import soundfile as sf

DECAY_ROOM_S = 0.35
FADE_S = 0.20
HEADROOM_DB = -1.0


def render(in_path: str, out_path: str, fs: int = 44100) -> None:
    pm = pretty_midi.PrettyMIDI(in_path)
    end_time = pm.get_end_time()

    audio = pm.synthesize(fs=fs)

    trim_sample = min(int((end_time + DECAY_ROOM_S) * fs), len(audio))
    audio = audio[:trim_sample].copy()

    fade_len = min(int(FADE_S * fs), len(audio))
    audio[-fade_len:] *= np.linspace(1.0, 0.0, fade_len)

    raw_peak = np.max(np.abs(audio))
    target_peak = 10 ** (HEADROOM_DB / 20.0)
    if raw_peak > 0:
        audio = audio * (target_peak / raw_peak)

    sf.write(out_path, audio, fs, format="OGG", subtype="VORBIS")

    print(f"notated get_end_time(): {end_time:.4f}s")
    print(f"trimmed render length: {len(audio) / fs:.4f}s")
    print(f"peak after headroom target: {np.max(np.abs(audio)):.4f}")
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    render(sys.argv[1], sys.argv[2])
