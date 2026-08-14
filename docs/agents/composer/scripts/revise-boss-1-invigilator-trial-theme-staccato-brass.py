"""
Composer agent — issue #222 revision of the #139 brass/percussion revision.

Target: the mini-boss/Director trial ("the Invigilator") combat loop.
Revision trigger: GitHub issue #222 -- developer listening pass on the
shipped #139 revision (`revise-boss-1-invigilator-trial-theme-brass-
percussion.py`) rejected it: still doesn't read as "more of a battle." Not
a presence problem -- a phrasing problem. The shipped revision voices brass
as sustained chorale-style dyads (two half-note chords per bar) plus a
restrained two-hits-per-bar downbeat pulse. The developer wants short,
staccato, punchier/more aggressive brass hits instead -- detached stabs,
not held tones.

This script is identical to the #139 revision (all seven parts, same
harmonic plan, same melody/ostinato/drone/bell/trombone/timpani) with one
change: `build_horn_part` is replaced with a syncopated four-stab pattern
instead of the two sustained half-note dyads.

  - Horn (French Horn): four short dyad stabs per bar, on beat 1, the
    "and" of beat 2 (offset 1.5), beat 3, and the "and" of beat 4 (offset
    3.5) -- an eighth-note duration each (detached, with rests filling the
    remainder of each quarter-note slot so the stabs read as hits, not
    held tones), same root+third dyad and same one-octave-below-harmony
    register as the #139 revision. Velocity raised to 92 (from 66/70) for
    a harder attack, constant across all four stabs and across all 24
    bars -- no per-cycle crescendo, preserving the clean loop point every
    other voice already relies on.

    This is the developer-approved option out of three Composer proposed
    (straight eighth-note stabs -- most aggressive, but risks sounding
    frantic/generic; a three-beat martial pattern -- safer, but risks
    repeating the "not enough battle" complaint; this syncopated four-stab
    pattern -- punchy and urgent while staying measured). Chosen for
    landing on more beats per bar than #139's two-hits pulse (reading as
    more urgent) without going to a fully even eighth-note pattern (which
    risks losing the "deliberate, not frantic" 96 BPM character the brief
    still requires).

  - Trombone + Timpani: unchanged from #139 verbatim -- still root-note
    hits on beat 1 and beat 3 only. Issue #222's acceptance criteria asks
    to keep whatever of the existing pulse still fits underneath the new
    brass rhythm, adjusting only if the two now clash. They don't: the new
    Horn stabs land on beats 1 and 3 (coinciding with the existing low-
    brass/timpani hits) plus two additional off-beat positions (1.5 and
    3.5, where Trombone/Timpani are already silent). No pitch or rhythm
    collision at any of the four stab positions, so no adjustment was
    needed -- Composer's own AGENT.md judgment call, not deferred.

Brief exception codified per issue #222: boss/combat tracks are an
explicit exception to Lorena's general "avoid genre-standard 'epic
orchestral boss' bombast" instruction (see `docs/agents/lorena/log.md`'s
original brief) -- brass and percussion presence, and now staccato/
aggressive brass character, are wanted for combat encounter music
specifically. Exploration/ambient tracks keep the original no-bombast
rule; this exception is scoped to boss/combat encounter music only. See
`docs/agents/composer/AGENT.md` for where this is recorded durably.

Generation method: same as #139 and the original -- deterministic,
notation-based composition via music21 (no raw-audio or notation-as-text
generation asked of a model, per docs/adr/0002 and docs/adr/0003).
Renders to a standard MIDI file via `npm run audio:prototype`, per issue
#196's pipeline -- this is a staged audition candidate for the developer's
listening pass, not yet promoted to `public/assets/audio/music/`.
"""

from music21 import stream, note, chord, meter, tempo, key, instrument, duration

BPM = 96
BARS_PER_CYCLE = 8
CYCLES = 3
TOTAL_BARS = BARS_PER_CYCLE * CYCLES  # 24 bars = 60s at 96 BPM, 4/4

# One triad per bar-pair across the 8-bar cycle: i - i - iv - iv - v - v - VI - VI
# (identical to the original script and the #139 revision -- the harmonic
# plan is unchanged)
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
# Parts 1-4: unchanged from compose-boss-1-invigilator-trial-theme.py /
# the #139 revision.
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
# Part 5 (REVISED per issue #222) -- Horn: syncopated four-stab pattern.
# Short dyad stabs at offsets 0.0 (beat 1), 1.5 ("and" of beat 2), 2.0
# (beat 3), and 3.5 ("and" of beat 4) within each bar, each an eighth note
# (0.5 ql) long with a rest filling the remainder of its quarter-note
# slot -- detached stabs, not the #139 revision's sustained half-note
# dyads. Same root+third dyad, one octave below the written harmony, as
# #139. Velocity raised to 92 (from 66/70) for a harder attack; constant
# across all four stabs and all 24 bars, matching every other voice's
# no-crescendo convention so the loop point stays clean.
# ---------------------------------------------------------------------------

STAB_OFFSETS = [0.0, 1.5, 2.0, 3.5]
STAB_DURATION = 0.5
STAB_VELOCITY = 92


def build_horn_part():
    p = stream.Part(id="Horn")
    p.insert(0, instrument.Horn())
    bar_offset = 0.0
    for _cycle in range(CYCLES):
        for _label, tones in CYCLE_CHORDS:
            root, third = tones[0], tones[1]
            dyad = [note.Note(root).transpose(-12).nameWithOctave,
                    note.Note(third).transpose(-12).nameWithOctave]
            cursor = 0.0
            for stab_offset in STAB_OFFSETS:
                if stab_offset > cursor:
                    rest = note.Rest()
                    rest.duration = duration.Duration(stab_offset - cursor)
                    p.append(rest)
                c = chord.Chord(dyad)
                c.duration = duration.Duration(STAB_DURATION)
                c.volume.velocity = STAB_VELOCITY
                p.append(c)
                cursor = stab_offset + STAB_DURATION
            if cursor < 4.0:
                rest = note.Rest()
                rest.duration = duration.Duration(4.0 - cursor)
                p.append(rest)
            bar_offset += 4.0
    return p


# ---------------------------------------------------------------------------
# Part 6 -- Trombone: unchanged from the #139 revision. Low brass
# root-note hits on beat 1 / beat 3, one octave below the Horn dyad's
# root. Verified not to clash with the new Horn stab positions (see
# module docstring).
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
# Part 7 -- Timpani: unchanged from the #139 revision. Unison with the
# Trombone's rhythm and root pitch (beat 1 / beat 3).
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
