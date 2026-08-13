"""
Composer agent -- issue #188, exploration-loop variation "Sibling B".

Target: the Level 1-4 non-combat interlude (the quiet window between waves
inside a level, where issue #157's Side-Pocket Explore/Continue prompt sits).
One of three tracks that rotate in that slot -- the existing original
(compose-opening-magic-deterministic-original.py) plus Sibling A
(compose-exploration-loop-variation-a.py) and this Sibling B.

Brief: docs/agents/lorena/log.md, 2026-08-12 entry "Issue #188: variation
brief for the Level 1 exploration loop (2 sibling tracks)" -- an amendment
scoped to two siblings, written against the already-approved
docs/agents/_reference/opening-experience-brief.md, not a replacement for it.

Same derivative-by-construction approach as Sibling A: identical module
layout and identical four build_*_part() functions to
compose-opening-magic-deterministic-original.py, with only the brief's five
open axes changed. LOCKED = brief says do not vary (identical to the
original); VARIED = one of the brief's five open axes.

  - Tempo: 128 BPM, straight 4/4.                                    [LOCKED]
  - Key: D major.                                                    [LOCKED]
  - Length: 24 bars (3 x 8-bar phrase) = 96 quarter notes = 45.0s.   [LOCKED]
  - Instrumentation: Celesta / "Pizzicato Strings" (GM 46) / Woodblock
    patch (GM 116) / Glockenspiel -- same four voices, same roles, same
    GM programs, same channel-10-avoidance technique.                [LOCKED]
  - Phrase ends on V, never resolving to I.                          [LOCKED]
  - Chord path: I-IV-I-V-vi-IV-ii-V (original: I-V-vi-IV-I-V-IV-V;
    Sibling A: I-vi-IV-V-I-vi-ii-V). Distinct from *both* -- a rotation
    of three where two members are near-identical is a rotation of two,
    per the brief's own warning.                                     [VARIED]
  - Melodic ornament: the ascending motif is unchanged; the variation is
    that it is stated in fewer, longer notes (5-6 per bar vs the
    original's 6-7 and Sibling A's 7-8), and the octave-brightening
    cycle is moved to last (transpose order 12-12-24 vs the original's
    12-24-12) so the climb "takes its time and arrives" rather than
    peaking in the middle.                                           [VARIED]
  - Percussion accent: beats 2 and 4 -- a backbeat lean (original: 1
    and 3; Sibling A: 1 and 4).                                      [VARIED]
  - Bell flourish: a longer four-note D6-F#6-A6-B6 figure in even
    eighths (original: three notes, ascending, uneven).              [VARIED]
  - Ostinato figure: 0-0-2-1-0-0-1-2 -- same instrument, same density,
    but dwelling on the root, which is what makes it read as more
    settled than either sibling.                                     [VARIED]

Sibling character, per the brief: "more spacious than the original ... the
'stop and look at something off the road' face of the same theme," which the
brief notes is the sibling most likely to be playing under the Side-Pocket
Explore/Continue prompt. Realized as fewer melodic events per bar at slightly
softer dynamics (velocity 62 vs the original's 66) -- again a deliberately
small delta against the brief's "this bit sounds different, not the music
changed" test.

Generation method: deterministic, notation-based composition via music21
(per docs/adr/0002-unblock-audio-scope-add-composer-agent.md). Renders a
standard MIDI file; a separate FluidSynth + ffmpeg pass in the pinned
spellroad/composer:opening-magic-1 image renders the browser-ready OGG.
"""

from music21 import stream, note, meter, tempo, key, instrument, duration

BPM = 128
BARS_PER_PHRASE = 8
CYCLES = 3
TOTAL_BARS = BARS_PER_PHRASE * CYCLES  # 24 bars = 45.0s at 128 BPM, 4/4

# [VARIED, axis 1] I-IV-I-V-vi-IV-ii-V. Ends on V, same anti-"conquered
# cadence" rule the original and Sibling A both keep.
PHRASE_CHORDS = [
    ("I", ["D4", "F#4", "A4"]),
    ("IV", ["G4", "B4", "D5"]),
    ("I", ["D4", "F#4", "A4"]),
    ("V", ["A4", "C#5", "E5"]),
    ("vi", ["B4", "D5", "F#5"]),
    ("IV", ["G4", "B4", "D5"]),
    ("ii", ["E4", "G4", "B4"]),
    ("V", ["A4", "C#5", "E5"]),
]

# [VARIED, axis 2] The original brightens in cycle 2 of 3 and settles back;
# this sibling holds its home register for two cycles and only lifts an
# octave for the last one -- the same "one cycle sits higher" device, moved.
CYCLE_ARPEGGIO_TRANSPOSE = [12, 12, 24]


# ---------------------------------------------------------------------------
# Part 1 -- Celesta melody. Same ascending chord-tone climb as the original
# and Sibling A, stated in longer values: a held root, a quick fifth-third
# pair, the octave arrival, then a held fifth. Every bar still sums to 4.0.
# ---------------------------------------------------------------------------

def _bar_melody_notes(chord_tones, cycle_idx):
    root, third, fifth = chord_tones
    t = CYCLE_ARPEGGIO_TRANSPOSE[cycle_idx]

    def up(pitch_name, semitones):
        return note.Note(pitch_name).transpose(semitones).nameWithOctave

    events = [
        (up(root, t), 1.0),
        (up(fifth, t), 0.5),
        (up(third, t), 0.5),
        (up(root, t + 12), 1.0),  # the arrival
    ]
    if cycle_idx == 2:
        # Last cycle's tail steps down instead of holding -- the same
        # "final cycle carries one extra passing tone" device the original
        # uses, kept in the same cycle position it uses it.
        events.append((up(fifth, t), 0.5))
        events.append((up(third, t), 0.5))
    else:
        events.append((up(fifth, t), 1.0))
    return events


def build_melody_part():
    p = stream.Part(id="Celesta")
    p.insert(0, instrument.Celesta())
    for cycle_idx in range(CYCLES):
        for _label, tones in PHRASE_CHORDS:
            total = 0.0
            for pitch_name, ql in _bar_melody_notes(tones, cycle_idx):
                n = note.Note(pitch_name)
                n.duration = duration.Duration(ql)
                n.volume.velocity = 62
                p.append(n)
                total += ql
            assert abs(total - 4.0) < 1e-6, total
    return p


# ---------------------------------------------------------------------------
# Part 2 -- "Pizzicato Strings" ostinato (GM program 46). Same instrument,
# density and register as the original; the figure dwells on the chord root
# rather than rocking between the upper tones. [VARIED, axis 5]
# ---------------------------------------------------------------------------

def build_ostinato_part():
    p = stream.Part(id="Pizzicato Strings")
    pizz = instrument.Instrument()
    pizz.instrumentName = "Pizzicato Strings"
    pizz.midiProgram = 45  # GM program 46 "Pizzicato Strings", 0-indexed
    p.insert(0, pizz)
    pattern_degrees = [0, 0, 2, 1, 0, 0, 1, 2]
    for _cycle in range(CYCLES):
        for _label, tones in PHRASE_CHORDS:
            low_tones = [note.Note(t).transpose(-12).nameWithOctave for t in tones]
            for deg in pattern_degrees:
                n = note.Note(low_tones[deg % len(low_tones)])
                n.duration = duration.Duration(0.5)
                n.volume.velocity = 44
                p.append(n)
    return p


# ---------------------------------------------------------------------------
# Part 3 -- hand-percussion pulse (GM program 116 "Woodblock") via a generic
# Instrument with an explicit midiProgram, the channel-10-avoidance technique
# copied verbatim from the original for the reason its own comment records.
# Same steady eighth-note pulse; the light accent leans to the backbeat.
# [VARIED, axis 3]
# ---------------------------------------------------------------------------

def build_percussion_part():
    p = stream.Part(id="Hand Percussion")
    perc = instrument.Instrument()
    perc.instrumentName = "Hand Percussion (Woodblock)"
    perc.midiProgram = 115  # GM program 116 "Woodblock", 0-indexed
    p.insert(0, perc)
    accent_beats = {1, 3}  # backbeat; original: {0, 2}
    for _cycle in range(CYCLES):
        for _label, _tones in PHRASE_CHORDS:
            for beat in range(4):
                for eighth in range(2):
                    n = note.Note("C5")  # a GM patch selector here, not melody
                    n.duration = duration.Duration(0.5)
                    n.volume.velocity = 56 if beat in accent_beats and eighth == 0 else 38
                    p.append(n)
    return p


# ---------------------------------------------------------------------------
# Part 4 -- Glockenspiel bright-bell accent, one sparse flourish per 8-bar
# phrase head (3 total). Four even eighths instead of the original's three
# uneven notes -- still sparse, still at the phrase head. [VARIED, axis 4]
# ---------------------------------------------------------------------------

def build_bell_accent_part():
    p = stream.Part(id="Bright Bell Accent")
    p.insert(0, instrument.Glockenspiel())
    for cycle_idx in range(CYCLES):
        bar_offset = cycle_idx * BARS_PER_PHRASE * 4.0
        flourish = [("D6", 0.5), ("F#6", 0.5), ("A6", 0.5), ("B6", 0.5)]
        pos = bar_offset
        for pitch_name, ql in flourish:
            n = note.Note(pitch_name)
            n.duration = duration.Duration(ql)
            n.volume.velocity = 50
            p.insert(pos, n)
            pos += ql
        rest = note.Rest()
        rest.duration = duration.Duration(BARS_PER_PHRASE * 4.0 - 2.0)
        p.insert(pos, rest)
    return p


def build_score():
    sc = stream.Score()
    sc.insert(0, tempo.MetronomeMark(number=BPM))
    sc.insert(0, meter.TimeSignature("4/4"))
    sc.insert(0, key.Key("D", "major"))

    for part in (
        build_melody_part(),
        build_ostinato_part(),
        build_percussion_part(),
        build_bell_accent_part(),
    ):
        part.insert(0, tempo.MetronomeMark(number=BPM))
        part.insert(0, meter.TimeSignature("4/4"))
        sc.insert(0, part)
    return sc


if __name__ == "__main__":
    import sys

    out_path = sys.argv[1] if len(sys.argv) > 1 else "exploration-loop-variation-b.mid"
    score = build_score()
    score.write("midi", fp=out_path)
    print(f"Wrote {out_path}")

    total_quarters = TOTAL_BARS * 4.0
    seconds = total_quarters * (60.0 / BPM)
    print(f"Total bars: {TOTAL_BARS}, total quarter-notes: {total_quarters}, "
          f"expected duration at {BPM} BPM: {seconds:.1f}s")
