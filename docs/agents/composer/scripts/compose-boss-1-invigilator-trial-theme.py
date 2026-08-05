"""
Composer agent — backlog 4.9, first Composer-authored track.

Target: the mini-boss/Director trial ("the Invigilator") combat loop.
Brief: docs/agents/lorena/log.md, 2026-08-04 entry "4.9: First music brief,
the mini-boss/Director trial (the Invigilator)".

Brief parameters this script composes against:
  - Mood: melancholic-tense, unhurried, clinical/precise rather than bombastic.
  - Tempo: 96 BPM, straight 4/4.
  - Key/harmony: D minor, sparse diatonic harmony (i - iv - v - VI cycle).
  - Instrumentation: solo cello melody, plucked ostinato (harp), sustained
    low pad/drone, one sparse deep bell/gong accent (rare, ~once per 8 bars).
  - Length/loop: an 8-bar harmonic cycle (i-i-iv-iv-v-v-VI-VI) repeated three
    times = 24 bars = 60 seconds at 96 BPM, structured to loop cleanly
    (ends on VI, cycling back to i at the top rather than a final cadence).

Generation method: deterministic, notation-based composition via music21
(per docs/adr/0002-unblock-audio-scope-add-composer-agent.md's requirement —
no raw-audio or notation-as-text generation). Renders to a standard MIDI file.
"""

from music21 import stream, note, chord, meter, tempo, key, instrument, duration

BPM = 96
BARS_PER_CYCLE = 8
CYCLES = 3
TOTAL_BARS = BARS_PER_CYCLE * CYCLES  # 24 bars = 60s at 96 BPM, 4/4

# One triad per bar-pair across the 8-bar cycle: i - i - iv - iv - v - v - VI - VI
CYCLE_CHORDS = [
    ("i", ["D4", "F4", "A4"]),
    ("i", ["D4", "F4", "A4"]),
    ("iv", ["G4", "Bb4", "D5"]),
    ("iv", ["G4", "Bb4", "D5"]),
    ("v", ["A4", "C5", "E5"]),
    ("v", ["A4", "C5", "E5"]),
    ("VI", ["Bb4", "D5", "F5"]),
    ("VI", ["Bb4", "D5", "F5"]),
]

# ---------------------------------------------------------------------------
# Part 1 — solo cello melody: weary, sorrowful, mostly stepwise, D natural
# minor, long sustained tones. One 8-bar phrase, lightly varied each repeat
# so the loop doesn't feel like a mechanical copy/paste while staying in
# the same melodic character throughout (brief: "could keep going
# indefinitely", not an escalating finale).
# ---------------------------------------------------------------------------

MELODY_PHRASE = [
    # (pitch or None for rest, quarterLength)
    ("D4", 2.0), ("F4", 1.0), ("E4", 1.0),
    ("D4", 1.5), ("C4", 0.5), ("D4", 2.0),
    ("F4", 2.0), ("G4", 1.0), ("F4", 1.0),
    ("E4", 3.0), (None, 1.0),
    ("G4", 2.0), ("A4", 1.0), ("G4", 1.0),
    ("F4", 1.5), ("E4", 0.5), ("D4", 2.0),
    ("Bb4", 2.0), ("A4", 1.0), ("G4", 1.0),
    ("F4", 3.0), (None, 1.0),
]

MELODY_VARIANT_2 = [
    ("D4", 2.0), ("F4", 1.0), ("G4", 1.0),
    ("A4", 1.5), ("G4", 0.5), ("F4", 2.0),
    ("F4", 2.0), ("E4", 1.0), ("D4", 1.0),
    ("C4", 3.0), (None, 1.0),
    ("G4", 2.0), ("Bb4", 1.0), ("A4", 1.0),
    ("G4", 1.5), ("F4", 0.5), ("E4", 2.0),
    ("D4", 2.0), ("C4", 1.0), ("D4", 1.0),
    ("D4", 3.0), (None, 1.0),
]

MELODY_VARIANT_3 = [
    ("D4", 3.0), ("C4", 1.0),
    ("D4", 1.5), ("F4", 0.5), ("G4", 2.0),
    ("A4", 2.0), ("G4", 1.0), ("F4", 1.0),
    ("E4", 4.0),
    ("F4", 2.0), ("G4", 1.0), ("A4", 1.0),
    ("Bb4", 1.5), ("A4", 0.5), ("G4", 2.0),
    ("F4", 2.0), ("E4", 1.0), ("D4", 1.0),
    ("D4", 4.0),
]

MELODY_CYCLES = [MELODY_PHRASE, MELODY_VARIANT_2, MELODY_VARIANT_3]


def build_melody_part():
    p = stream.Part(id="Cello")
    p.insert(0, instrument.Violoncello())
    for cyc in MELODY_CYCLES:
        total = 0.0
        for pitch_name, ql in cyc:
            if pitch_name is None:
                n = note.Rest()
            else:
                n = note.Note(pitch_name)
            n.duration = duration.Duration(ql)
            if pitch_name is not None:
                n.volume.velocity = 58
            p.append(n)
            total += ql
        assert abs(total - BARS_PER_CYCLE * 4.0) < 1e-6, total
    return p


# ---------------------------------------------------------------------------
# Part 2 — plucked ostinato (harp): steady eighth-note pulse on the current
# chord's tones, low-to-mid register. "Hex-lines brightening... like a spell
# being read aloud" — mechanical, precise, ticking.
# ---------------------------------------------------------------------------

def build_ostinato_part():
    p = stream.Part(id="Harp")
    p.insert(0, instrument.Harp())
    pattern_degrees = [0, 1, 2, 1]  # within-chord index pattern per beat pair
    for _cycle in range(CYCLES):
        for _label, tones in CYCLE_CHORDS:
            # drop the chord an octave for the ostinato register
            low_tones = [note.Note(t).transpose(-12).nameWithOctave for t in tones]
            for beat in range(4):
                for eighth in range(2):
                    deg = pattern_degrees[(beat * 2 + eighth) % len(pattern_degrees)]
                    n = note.Note(low_tones[deg % len(low_tones)])
                    n.duration = duration.Duration(0.5)
                    n.volume.velocity = 42
                    p.append(n)
    return p


# ---------------------------------------------------------------------------
# Part 3 — sustained low pad/drone: a constant D-A pedal (tonic/fifth) held
# under the whole piece regardless of the moving harmony above, for dread
# and ritual scale without adding bombast.
# ---------------------------------------------------------------------------

def build_drone_part():
    p = stream.Part(id="Pad")
    pad = instrument.Instrument()
    pad.instrumentName = "Warm Pad"
    pad.midiProgram = 88  # GM program 89 "Pad 2 (warm)", 0-indexed
    p.insert(0, pad)
    for _bar in range(TOTAL_BARS):
        c = chord.Chord(["D3", "A3"])
        c.duration = duration.Duration(4.0)
        c.volume.velocity = 34
        p.append(c)
    return p


# ---------------------------------------------------------------------------
# Part 4 — sparse deep bell/gong accent: once every 8 bars (3 times total),
# marking ritual/ledger-closing rather than a driving rhythmic hit.
# ---------------------------------------------------------------------------

def build_bell_part():
    p = stream.Part(id="Bell")
    bell = instrument.TubularBells()
    p.insert(0, bell)
    for cycle_idx in range(CYCLES):
        bar_offset = cycle_idx * BARS_PER_CYCLE * 4.0
        n = note.Note("D2")
        n.duration = duration.Duration(4.0)
        n.volume.velocity = 50
        p.insert(bar_offset, n)
        rest = note.Rest()
        rest.duration = duration.Duration(BARS_PER_CYCLE * 4.0 - 4.0)
        p.insert(bar_offset + 4.0, rest)
    return p


def build_score():
    sc = stream.Score()
    sc.insert(0, tempo.MetronomeMark(number=BPM))
    sc.insert(0, meter.TimeSignature("4/4"))
    sc.insert(0, key.Key("d", "minor"))

    for part in (build_melody_part(), build_ostinato_part(), build_drone_part(), build_bell_part()):
        part.insert(0, tempo.MetronomeMark(number=BPM))
        part.insert(0, meter.TimeSignature("4/4"))
        sc.insert(0, part)
    return sc


if __name__ == "__main__":
    import sys

    out_path = sys.argv[1] if len(sys.argv) > 1 else "boss-1-invigilator-trial-theme.mid"
    score = build_score()
    score.write("midi", fp=out_path)
    print(f"Wrote {out_path}")

    # Sanity totals for the composer log.
    total_quarters = TOTAL_BARS * 4.0
    seconds = total_quarters * (60.0 / BPM)
    print(f"Total bars: {TOTAL_BARS}, total quarter-notes: {total_quarters}, "
          f"expected duration at {BPM} BPM: {seconds:.1f}s")
