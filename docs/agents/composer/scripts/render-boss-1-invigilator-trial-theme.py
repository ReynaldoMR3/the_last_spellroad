"""
Composer agent -- fix for boss-1-invigilator-trial-theme.mid ->
boss-1-invigilator-trial-theme.ogg, closing the pre-existing render defect
issue #142's own render script (render-combat-encounter-loop.py) found in
this file and explicitly deferred as out-of-scope for that ticket.

Render method: pretty_midi.PrettyMIDI(...).synthesize() (naive additive
sine-wave synthesis, no system fluidsynth/ffmpeg/soundfont dependency) +
soundfile.write(..., format="OGG", subtype="VORBIS") -- the same toolchain
originally used to produce this file (docs/agents/loomwright/log.md,
2026-08-05 entry), run here in a scratch `python3 -m venv` per the same
"no host audio tooling" constraint.

Two real defects, both in the renderer, not the composition, verified
against the *actual rendered file* rather than the source MIDI's notated
length (independently re-confirmed before this fix, not just taken from
the issue #142 script's report):

1. **Dead-air tail.** pretty_midi.Instrument.synthesize() pre-allocates its
   output buffer to `int(fs * (get_end_time() + 1))` samples -- a full
   extra second of true digital silence past the last note, appended after
   each note's own (real) release envelope has already finished. Measured
   on the shipped file: reports 61.0000s (not the "confirmed 60s" the
   original log entry claimed), musical content plus its natural release
   ends by ~60.0s, then flat -inf/exact-zero RMS from 60.0s to 61.0s -- an
   audible gap every time `loop: true` playback repeats it.
2. **Peak overshoot / mild clipping.** pretty_midi.synthesize(normalize=True)
   hard-normalizes to a peak of exactly 1.0 with zero headroom before the
   lossy Vorbis encode overshoots it. Measured on the shipped file: peak
   1.024573 (0.21 dBFS), 36 samples truly over full scale, 40 near-clip.

Fix applied here (identical technique to render-combat-encounter-loop.py's
fix for the same renderer defect on a different track): trim to
`get_end_time() + 0.35s` (musical end-point plus decay-room margin,
discarding the dead-air padding) and apply a 200ms linear fade to true
zero ending at the trim point, so the loop seam has no click regardless of
how much genuine release tail lands inside that margin. Note this fix does
NOT disable pretty_midi's own `normalize=True` step (still hard-normalizes
internally to a raw peak of 1.0) -- it applies one more rescale on top, to
-1dBFS, after the trim/fade, so the *final* pre-encode peak has headroom
the original render never gave the lossy Vorbis step.

Correction (Heckler review, 2026-08-09): an earlier draft of this docstring
claimed pretty_midi's synthesize() produces flat, decay-free note cutoffs
with "no natural decay to preserve." That is false -- reading
`pretty_midi.Instrument.synthesize`'s actual source shows every note gets
a real ADSR-style decay plus an explicit ~100ms fade-out already, before
the render's own trailing 1s of pure padding. DECAY_ROOM_S = 0.35 happens
to comfortably cover that real ~100ms release tail, which is why the
output still sounds correct -- but treat that margin as covering a real,
audible release, not "nothing," if this script is reused as a template and
someone considers shrinking it.
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
