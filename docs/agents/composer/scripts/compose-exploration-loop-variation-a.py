"""
Composer agent -- issue #188, exploration-loop variation "Sibling A".

Target: the Level 1-4 non-combat interlude (the quiet window between waves
inside a level, where issue #157's Side-Pocket Explore/Continue prompt sits).
One of three tracks that rotate in that slot -- the existing original
(compose-opening-magic-deterministic-original.py) plus this Sibling A and its
Sibling B counterpart.

Brief: docs/agents/lorena/log.md, 2026-08-12 entry "Issue #188: variation
brief for the Level 1 exploration loop (2 sibling tracks)". That entry is an
*amendment* scoped to two sibling tracks, written against the already-approved
docs/agents/_reference/opening-experience-brief.md -- not a replacement for it.
Developer's own framing: "2 more very similar with some variations."

This script is deliberately a close derivative of
compose-opening-magic-deterministic-original.py -- same module layout, same
four build_*_part() functions, same generation method -- rather than a fresh
composition. Everything the brief locks is copied verbatim from that script;
only the five axes the brief opens are changed. Each parameter below is
labelled LOCKED (brief says do not vary; identical to the original) or
VARIED (one of the brief's five open axes).

  - Tempo: 128 BPM, straight 4/4.                                    [LOCKED]
  - Key: D major.                                                    [LOCKED]
  - Length: 24 bars (3 x 8-bar phrase) = 96 quarter notes = 45.0s.   [LOCKED]
  - Instrumentation: Celesta melody, generic "Pizzicato Strings" (GM 46)
    ostinato, Woodblock-patch (GM 116) hand percussion, sparse
    Glockenspiel phrase-head accent -- same four voices, same roles,
    same GM programs, same channel-10-avoidance technique.           [LOCKED]
  - Phrase ends on V, never resolving to I.                          [LOCKED]
  - Chord path: I-vi-IV-V-I-vi-ii-V (original: I-V-vi-IV-I-V-IV-V).
    Same diatonic neighbourhood, different route; picks up the ii chord
    the original never uses, per the brief's axis 1.                 [VARIED]
  - Melodic ornament: the ascending arpeggio motif is unchanged (it is
    the identity); what changes is the top and the tail -- a two-note
    sixteenth turn at the peak and a longer held arrival, per the
    brief's axis 2 ("recognise the gesture and not the phrase").     [VARIED]
  - Percussion accent: beats 1 and 4 (original: 1 and 3).            [VARIED]
  - Bell flourish: descending A6-F#6-D6 (original: ascending
    D6-F#6-A6) -- the same figure inverted.                          [VARIED]
  - Ostinato figure: 0-2-1-2-0-1-2-1 through the chord tones
    (original: 0-1-2-1-2-1-0-1).                                     [VARIED]

Sibling character, per the brief: "brighter and busier than the original ...
the 'the road is going well' face of the same theme." Realized as more notes
per melodic bar (7-8 vs the original's 6-7) and a marginally brighter dynamic
(velocity 68 vs 66) -- deliberately a small delta, since the brief's own
failure test is a listener hearing "the music changed" rather than "this bit
sounds different."

Generation method: deterministic, notation-based composition via music21
(per docs/adr/0002-unblock-audio-scope-add-composer-agent.md -- no raw-audio
or notation-as-text generation asked of a model). Renders a standard MIDI
file; a separate FluidSynth + ffmpeg pass in the pinned
spellroad/composer:opening-magic-1 image renders the browser-ready OGG (see
the composer log for the exact commands).
"""

from music21 import stream, note, meter, tempo, key, instrument, duration

BPM = 128
BARS_PER_PHRASE = 8
CYCLES = 3
TOTAL_BARS = BARS_PER_PHRASE * CYCLES  # 24 bars = 45.0s at 128 BPM, 4/4

# [VARIED, axis 1] I-vi-IV-V-I-vi-ii-V. Still ends on V, so the phrase never
# lands on a resolved tonic downbeat -- it only resolves by looping back to
# bar 1's I, exactly as the original does. Same register as the original's
# PHRASE_CHORDS (the ostinato's home octave; the melody transposes up).
PHRASE_CHORDS = [
    ("I", ["D4", "F#4", "A4"]),
    ("vi", ["B4", "D5", "F#5"]),
    ("IV", ["G4", "B4", "D5"]),
    ("V", ["A4", "C#5", "E5"]),
    ("I", ["D4", "F#4", "A4"]),
    ("vi", ["B4", "D5", "F#5"]),
    ("ii", ["E4", "G4", "B4"]),
    ("V", ["A4", "C#5", "E5"]),
]

# [LOCKED] Identical to the original: cycle 0 at the melody's home register,
# cycle 1 an octave brighter, cycle 2 back home.
CYCLE_ARPEGGIO_TRANSPOSE = [12, 24, 12]


# ---------------------------------------------------------------------------
# Part 1 -- Celesta melody. The ascending root-3rd-5th-octave arpeggio is
# copied unchanged from the original (it is the motif the brief locks); the
# variation is entirely in what happens after the peak: a two-note sixteenth
# turn (octave's fifth, then the octave again) followed by a held 1.5-quarter
# arrival on the third, instead of the original's two plain descending
# quarter notes. Every bar still sums to exactly 4.0.
# ---------------------------------------------------------------------------

def _bar_melody_notes(chord_tones, cycle_idx):
    root, third, fifth = chord_tones
    t = CYCLE_ARPEGGIO_TRANSPOSE[cycle_idx]

    def up(pitch_name, semitones):
        return note.Note(pitch_name).transpose(semitones).nameWithOctave

    events = [
        (up(root, t), 0.5),
        (up(third, t), 0.5),
        (up(fifth, t), 0.5),
        (up(root, t + 12), 0.5),   # ascending arpeggio, 4 eighths = 2.0
        (up(fifth, t + 12), 0.25),  # [VARIED, axis 2] the turn at the peak
        (up(root, t + 12), 0.25),
    ]
    if cycle_idx == 1:
        # Middle cycle takes the tail in two steps rather than one held note,
        # the same "one cycle is embellished" technique the original uses.
        events.append((up(third, t + 12), 1.0))
        events.append((up(root, t), 0.5))
    else:
        events.append((up(third, t + 12), 1.5))
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
                n.volume.velocity = 68
                p.append(n)
                total += ql
            assert abs(total - 4.0) < 1e-6, total
    return p


# ---------------------------------------------------------------------------
# Part 2 -- "Pizzicato Strings" ostinato (GM program 46, generic Instrument
# with an explicit midiProgram -- music21 10.5.0 has no PizzicatoStrings
# class). Same instrument, same density (8 notes/bar), same register (one
# octave below PHRASE_CHORDS' written pitches) as the original; only the path
# through the chord tones differs. [VARIED, axis 5]
# ---------------------------------------------------------------------------

def build_ostinato_part():
    p = stream.Part(id="Pizzicato Strings")
    pizz = instrument.Instrument()
    pizz.instrumentName = "Pizzicato Strings"
    pizz.midiProgram = 45  # GM program 46 "Pizzicato Strings", 0-indexed
    p.insert(0, pizz)
    pattern_degrees = [0, 2, 1, 2, 0, 1, 2, 1]
    for _cycle in range(CYCLES):
        for _label, tones in PHRASE_CHORDS:
            low_tones = [note.Note(t).transpose(-12).nameWithOctave for t in tones]
            for deg in pattern_degrees:
                n = note.Note(low_tones[deg % len(low_tones)])
                n.duration = duration.Duration(0.5)
                n.volume.velocity = 48
                p.append(n)
    return p


# ---------------------------------------------------------------------------
# Part 3 -- hand-percussion pulse (GM program 116 "Woodblock"), via a generic
# Instrument with an explicit midiProgram rather than music21's Woodblock
# class. That technique is load-bearing and copied verbatim from the original:
# the Woodblock class is modelled as unpitched percussion, so music21's MIDI
# writer auto-routes it to channel 10, where a program change is meaningless
# and FluidSynth substitutes a drum-kit voice (the original script's own
# self-verification caught exactly this).
#
# Same steady eighth-note pulse and same dynamics as the original; only which
# beats carry the light accent moves. [VARIED, axis 3]
# ---------------------------------------------------------------------------

def build_percussion_part():
    p = stream.Part(id="Hand Percussion")
    perc = instrument.Instrument()
    perc.instrumentName = "Hand Percussion (Woodblock)"
    perc.midiProgram = 115  # GM program 116 "Woodblock", 0-indexed
    p.insert(0, perc)
    accent_beats = {0, 3}  # original: {0, 2}
    for _cycle in range(CYCLES):
        for _label, _tones in PHRASE_CHORDS:
            for beat in range(4):
                for eighth in range(2):
                    n = note.Note("C5")  # a GM patch selector here, not melody
                    n.duration = duration.Duration(0.5)
                    n.volume.velocity = 58 if beat in accent_beats and eighth == 0 else 40
                    p.append(n)
    return p


# ---------------------------------------------------------------------------
# Part 4 -- Glockenspiel bright-bell accent, one sparse flourish per 8-bar
# phrase head (3 total), same sparseness and same phrase-head placement as the
# original. The figure itself is the original's ascending D6-F#6-A6 inverted
# to a descending A6-F#6-D6. [VARIED, axis 4]
# ---------------------------------------------------------------------------

def build_bell_accent_part():
    p = stream.Part(id="Bright Bell Accent")
    p.insert(0, instrument.Glockenspiel())
    for cycle_idx in range(CYCLES):
        bar_offset = cycle_idx * BARS_PER_PHRASE * 4.0
        flourish = [("A6", 0.5), ("F#6", 0.5), ("D6", 1.0)]
        pos = bar_offset
        for pitch_name, ql in flourish:
            n = note.Note(pitch_name)
            n.duration = duration.Duration(ql)
            n.volume.velocity = 56
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

    out_path = sys.argv[1] if len(sys.argv) > 1 else "exploration-loop-variation-a.mid"
    score = build_score()
    score.write("midi", fp=out_path)
    print(f"Wrote {out_path}")

    total_quarters = TOTAL_BARS * 4.0
    seconds = total_quarters * (60.0 / BPM)
    print(f"Total bars: {TOTAL_BARS}, total quarter-notes: {total_quarters}, "
          f"expected duration at {BPM} BPM: {seconds:.1f}s")
