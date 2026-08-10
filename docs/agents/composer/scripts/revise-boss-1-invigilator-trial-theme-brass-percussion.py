"""
Composer agent — issue #139 revision of the 4.9 track.

Target: the mini-boss/Director trial ("the Invigilator") combat loop.
Original brief: docs/agents/lorena/log.md, 2026-08-04 entry "4.9: First music
brief, the mini-boss/Director trial (the Invigilator)".
Revision trigger: GitHub issue #139 -- developer playtest feedback on the
shipped track (PR #135's Level 5 boss encounter): "the sound of the final
boss fight its nice, i like it, but i feel like we need more brass and
percussions there to make it feel more of a battle." Positive-baseline
direction note, not a bug -- extend/rearrange, don't replace.

This script is a full re-generation of the original four voices (cello
melody, harp ostinato, warm pad drone, tubular bells -- copied verbatim from
compose-boss-1-invigilator-trial-theme.py, same pitches/rhythms/velocities,
unchanged) plus two new voices added on top:

  - Horn (French Horn): a sustained root+third brass dyad, two half-note
    chords per bar (beat 1 / beat 3), doubling the same i-i-iv-iv-v-v-VI-VI
    harmonic cycle the harp/pad already outline, one octave below the
    written harp/pad register. Constant velocity throughout (66/70,
    beat1/beat3) -- no per-cycle crescendo, so the loop point stays clean
    (matching the precedent already set by the original four voices, all of
    which hold constant dynamics for the same reason, per the Heckler-cleared
    2026-08-04 track).
  - Trombone + Timpani: unison root-note hits on beat 1 (velocity 82/88)
    and beat 3 (velocity 68/74), one octave below the Horn dyad's root,
    landing on the same two beats every bar -- a low brass-and-drum downbeat
    pulse (a standard "battle" orchestration device: low brass doubled by
    timpani on the strong beats) rather than a fast action-drum pattern,
    keeping the brief's "deliberate, not frantic" 96 BPM character while
    still reading as substantially more brass and percussion presence than
    the original track's near-total absence of both.

Explicit tension disclosed, not silently resolved: Lorena's original brief
said "avoid genre-standard 'epic orchestral boss' bombast -- no bwah-bwah
brass hits, no choir climax." Issue #139 is direct, later developer feedback
overriding that specific instruction for this specific track (brass and
percussion are exactly what's being asked for) -- it does not override the
brief's other, still-valid instructions (D minor, 96 BPM, "deliberate rather
than frantic," no big finale swell, loop cleanly). The judgment call made
here is to voice the new brass as sustained chorale-style dyads and the
percussion as a restrained two-beats-per-bar downbeat pulse -- reading as
"a battle" via a martial, low, weighty pulse rather than via fast fanfare
stabs or a full drum-kit action groove, as a middle path between the two
instructions rather than picking one over the other outright. Flagged in
the composer log for Heckler's-hat review, not decided unilaterally as a
final call.

Generation method: same as the original -- deterministic, notation-based
composition via music21 (no raw-audio or notation-as-text generation asked
of a model, per docs/adr/0002). Renders to a standard MIDI file.
"""

from music21 import stream, note, chord, meter, tempo, key, instrument, duration

BPM = 96
BARS_PER_CYCLE = 8
CYCLES = 3
TOTAL_BARS = BARS_PER_CYCLE * CYCLES  # 24 bars = 60s at 96 BPM, 4/4

# One triad per bar-pair across the 8-bar cycle: i - i - iv - iv - v - v - VI - VI
# (identical to the original script -- the harmonic plan is unchanged)
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
# Parts 1-4: unchanged from compose-boss-1-invigilator-trial-theme.py.
# ---------------------------------------------------------------------------

MELODY_PHRASE = [
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


def build_ostinato_part():
    p = stream.Part(id="Harp")
    p.insert(0, instrument.Harp())
    pattern_degrees = [0, 1, 2, 1]
    for _cycle in range(CYCLES):
        for _label, tones in CYCLE_CHORDS:
            low_tones = [note.Note(t).transpose(-12).nameWithOctave for t in tones]
            for beat in range(4):
                for eighth in range(2):
                    deg = pattern_degrees[(beat * 2 + eighth) % len(pattern_degrees)]
                    n = note.Note(low_tones[deg % len(low_tones)])
                    n.duration = duration.Duration(0.5)
                    n.volume.velocity = 42
                    p.append(n)
    return p


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


# ---------------------------------------------------------------------------
# Part 5 (NEW) -- Horn: sustained root+third brass dyad, two half-note
# chords per bar (beat 1 / beat 3), one octave below the written
# harp/pad harmony register. Doubles the same harmonic cycle, giving a
# continuous brass-chorale presence across all 24 bars.
# ---------------------------------------------------------------------------

def build_horn_part():
    p = stream.Part(id="Horn")
    p.insert(0, instrument.Horn())
    for _cycle in range(CYCLES):
        for _label, tones in CYCLE_CHORDS:
            root, third = tones[0], tones[1]
            dyad = [note.Note(root).transpose(-12).nameWithOctave,
                    note.Note(third).transpose(-12).nameWithOctave]
            c1 = chord.Chord(dyad)
            c1.duration = duration.Duration(2.0)
            c1.volume.velocity = 66
            p.append(c1)
            c2 = chord.Chord(dyad)
            c2.duration = duration.Duration(2.0)
            c2.volume.velocity = 70
            p.append(c2)
    return p


# ---------------------------------------------------------------------------
# Part 6 (NEW) -- Trombone: low brass root-note hits on beat 1 / beat 3,
# one octave below the Horn dyad's root (two octaves below the written
# harmony). Detached quarter notes with rests on beats 2 / 4 -- a martial
# "oom-pah" downbeat pulse, not a continuous line.
# ---------------------------------------------------------------------------

def build_trombone_part():
    p = stream.Part(id="Trombone")
    p.insert(0, instrument.Trombone())
    for _cycle in range(CYCLES):
        for _label, tones in CYCLE_CHORDS:
            root = note.Note(tones[0]).transpose(-24).nameWithOctave
            n1 = note.Note(root)
            n1.duration = duration.Duration(1.0)
            n1.volume.velocity = 82
            p.append(n1)
            r1 = note.Rest()
            r1.duration = duration.Duration(1.0)
            p.append(r1)
            n2 = note.Note(root)
            n2.duration = duration.Duration(1.0)
            n2.volume.velocity = 68
            p.append(n2)
            r2 = note.Rest()
            r2.duration = duration.Duration(1.0)
            p.append(r2)
    return p


# ---------------------------------------------------------------------------
# Part 7 (NEW) -- Timpani: unison with the Trombone's rhythm and root
# pitch (beat 1 / beat 3), the low-brass-plus-drum downbeat pulse that
# reads as "battle" per issue #139, still only two hits per bar so the
# 96 BPM "deliberate, not frantic" character survives.
# ---------------------------------------------------------------------------

def build_timpani_part():
    p = stream.Part(id="Timpani")
    p.insert(0, instrument.Timpani())
    for _cycle in range(CYCLES):
        for _label, tones in CYCLE_CHORDS:
            root = note.Note(tones[0]).transpose(-24).nameWithOctave
            n1 = note.Note(root)
            n1.duration = duration.Duration(1.0)
            n1.volume.velocity = 88
            p.append(n1)
            r1 = note.Rest()
            r1.duration = duration.Duration(1.0)
            p.append(r1)
            n2 = note.Note(root)
            n2.duration = duration.Duration(1.0)
            n2.volume.velocity = 74
            p.append(n2)
            r2 = note.Rest()
            r2.duration = duration.Duration(1.0)
            p.append(r2)
    return p


def build_score():
    sc = stream.Score()
    sc.insert(0, tempo.MetronomeMark(number=BPM))
    sc.insert(0, meter.TimeSignature("4/4"))
    sc.insert(0, key.Key("d", "minor"))

    parts = (
        build_melody_part(),
        build_ostinato_part(),
        build_drone_part(),
        build_bell_part(),
        build_horn_part(),
        build_trombone_part(),
        build_timpani_part(),
    )
    for part in parts:
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

    total_quarters = TOTAL_BARS * 4.0
    seconds = total_quarters * (60.0 / BPM)
    print(f"Total bars: {TOTAL_BARS}, total quarter-notes: {total_quarters}, "
          f"expected duration at {BPM} BPM: {seconds:.1f}s")
