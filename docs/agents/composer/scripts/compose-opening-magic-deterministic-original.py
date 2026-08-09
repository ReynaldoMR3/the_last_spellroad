"""
Composer agent -- issue #126 (part of epic #124), "Deterministic Original"
treatment for the Level 1 Opening Experience.

Target: the Level 1 opening's music layer, one of three comparable resource
treatments issue #126 asks for (CC0 Remix / Deterministic Original / Hybrid).
This script produces the Deterministic Original treatment's loop only.

Brief: docs/agents/_reference/opening-experience-brief.md, section
"Narrative and musical direction -- Lorena briefs, Composer realizes":
  - "The first emotional promise is magical capability and forward
    momentum, not loneliness."
  - "The opening motif should remain transformable: later arrangements can
    slow, thin, darken, or move it toward minor harmony without losing its
    identity."
  - "Favor fast plucked strings, celesta or bright bells, hand percussion,
    and an ascending magical motif."
  - "Avoid epic-orchestral bombast, dense synthetic spellstorm textures,
    and a triumphant cadence that makes the road feel conquered."

Unlike the boss-1 track's brief (docs/agents/lorena/log.md, 2026-08-04
"4.9"), this brief does not pin an exact tempo/key/duration -- Ana's
dispatch for this task explicitly calls that out and asks Composer to fill
those in from the qualitative direction and state the reasoning. Every
parameter below is labeled BRIEF (the brief's literal stated language) or
INTERPRETIVE (Composer's own reasonable fill-in of an unstated specific,
per this track's dispatch instructions and this agent's own AGENT.md
constraint to never silently invent unstated creative direction).

  - Tempo: 128 BPM, straight 4/4.                              [INTERPRETIVE]
    Faster than the boss-1 track's 96 BPM ("melancholic-tense, unhurried")
    to read as brisk forward momentum rather than dread, but well under a
    frantic/combat tempo (~160+) since this scores exploration, not a fight.
  - Key/harmony: D major, I-V-vi-IV per bar, ending each 8-bar phrase on V
    rather than resolving to I.                                [INTERPRETIVE]
    D major is a bright, open key well-suited to celesta/plucked-string
    register. Chosen specifically because its parallel minor (D minor) is
    a one-step darkening move that keeps the same tonic and the same
    melodic pitch *classes* re-harmonized, matching the brief's
    "transformable... move it toward minor harmony without losing its
    identity" line directly. Ending the phrase on V instead of I is the
    direct implementation of "avoid... a triumphant cadence that makes the
    road feel conquered" -- the loop never lands on a resolved tonic
    downbeat; it only resolves by looping back to I, same technique the
    boss-1 script used ending its cycle on VI instead of i.
  - Instrumentation: Celesta (melody/ascending motif), a generic
    "Pizzicato Strings" (GM program 46) ostinato, Woodblock (GM program
    116) hand-percussion pulse, sparse Glockenspiel phrase-head accent.
                                                                  [BRIEF, mapped]
    Directly realizes "fast plucked strings, celesta or bright bells, hand
    percussion" -- using both celesta (continuous melodic color) and
    glockenspiel (sparse bright-bell accent) rather than picking one,
    since the brief phrases them as favored options, not an exclusive
    either/or.                                                 [INTERPRETIVE]
  - Length/loop: 24 bars (3 repeats of an 8-bar phrase) at 128 BPM, 4/4 =
    96 quarter notes = 45.0s by notation.                       [INTERPRETIVE]
    Chosen within this task's own guidance (a 30-60s loop suited to an
    ambient/exploration loop, not a combat loop) and structured the same
    way as the boss-1 precedent (an N-bar phrase x3 cycles) for consistency
    across this agent's output.
  - Mood/texture: three light, mostly-monophonic-per-part layers (no dense
    stacked pad, no brass, no full-orchestra tutti), moderate dynamics
    throughout (velocities 46-70 of 127), no dynamic swell into a final
    climax bar.                                                 [BRIEF, mapped]
    Directly realizes "avoid epic-orchestral bombast, dense synthetic
    spellstorm textures."

Generation method: deterministic, notation-based composition via music21
(per docs/adr/0002-unblock-audio-scope-add-composer-agent.md's constraint --
no raw-audio or notation-as-text generation asked of a model). Renders to a
standard MIDI file; a separate FluidSynth + SoundFont pass (run from this
same Docker image, see the composer log) renders a browser-ready OGG.
"""

from music21 import stream, note, chord, meter, tempo, key, instrument, duration

BPM = 128
BARS_PER_PHRASE = 8
CYCLES = 3
TOTAL_BARS = BARS_PER_PHRASE * CYCLES  # 24 bars = 45.0s at 128 BPM, 4/4

# One triad per bar across the 8-bar phrase: I-V-vi-IV-I-V-IV-V.
# Ends on V (not I) so the phrase never resolves to a landed tonic -- it
# only resolves by looping back to bar 1's I, per the brief's anti-
# "conquered cadence" instruction. Register chosen as the ostinato's home
# octave; the melody transposes these up for brightness.
PHRASE_CHORDS = [
    ("I", ["D4", "F#4", "A4"]),
    ("V", ["A4", "C#5", "E5"]),
    ("vi", ["B4", "D5", "F#5"]),
    ("IV", ["G4", "B4", "D5"]),
    ("I", ["D4", "F#4", "A4"]),
    ("V", ["A4", "C#5", "E5"]),
    ("IV", ["G4", "B4", "D5"]),
    ("V", ["A4", "C#5", "E5"]),
]


# ---------------------------------------------------------------------------
# Part 1 -- Celesta melody: the ascending magical motif. Deterministically
# built per bar from that bar's chord tones (root-3rd-5th-octave ascending,
# eighth notes) followed by a two-note descending tail (quarter notes) so
# every bar sums to exactly 4.0 without hand-tallied arithmetic. Each of the
# 3 phrase-repeats transposes/varies the arpeggio register slightly so the
# loop reads as one recognizable motif developing, not a mechanical
# copy-paste, mirroring the boss-1 script's 3-varied-repeats approach.
# ---------------------------------------------------------------------------

# Per-cycle octave offset (in semitones) applied to the arpeggio figure only
# -- cycle 0 at the melody's home register, cycle 1 brightens up an octave
# (the "forward momentum" building), cycle 2 settles back toward the home
# register with one added passing tone for a light embellishment.
CYCLE_ARPEGGIO_TRANSPOSE = [12, 24, 12]


def _bar_melody_notes(chord_tones, cycle_idx):
    root, third, fifth = chord_tones
    transpose = CYCLE_ARPEGGIO_TRANSPOSE[cycle_idx]
    arp_pitches = [
        note.Note(root).transpose(transpose).nameWithOctave,
        note.Note(third).transpose(transpose).nameWithOctave,
        note.Note(fifth).transpose(transpose).nameWithOctave,
        note.Note(root).transpose(transpose + 12).nameWithOctave,
    ]
    events = [(p, 0.5) for p in arp_pitches]  # ascending arpeggio, 4 eighths = 2.0

    if cycle_idx == 2:
        # Final-cycle embellishment: an extra passing eighth between the
        # arpeggio peak and the descending tail, still identity-preserving
        # (same chord tones, same contour), per the brief's "remain
        # transformable... without losing its identity."
        passing = note.Note(fifth).transpose(transpose + 12).nameWithOctave
        events.append((passing, 0.5))
        events.append((fifth, 0.5))
        events.append((third, 1.0))
    else:
        events.append((fifth, 1.0))
        events.append((third, 1.0))
    return events


def build_melody_part():
    p = stream.Part(id="Celesta")
    p.insert(0, instrument.Celesta())
    for cycle_idx in range(CYCLES):
        for _label, tones in PHRASE_CHORDS:
            events = _bar_melody_notes(tones, cycle_idx)
            total = 0.0
            for pitch_name, ql in events:
                n = note.Note(pitch_name)
                n.duration = duration.Duration(ql)
                n.volume.velocity = 66
                p.append(n)
                total += ql
            assert abs(total - 4.0) < 1e-6, total
    return p


# ---------------------------------------------------------------------------
# Part 2 -- "Pizzicato Strings" ostinato (GM program 46, generic Instrument
# since music21 has no dedicated PizzicatoStrings class -- confirmed absent
# in this image's music21 10.5.0, same technique the boss-1 script used for
# its generic "Warm Pad"). Fast sixteenth-note broken-chord pulse, one
# octave below PHRASE_CHORDS' written register, realizing the brief's "fast
# plucked strings."
# ---------------------------------------------------------------------------

def build_ostinato_part():
    p = stream.Part(id="Pizzicato Strings")
    pizz = instrument.Instrument()
    pizz.instrumentName = "Pizzicato Strings"
    pizz.midiProgram = 45  # GM program 46 "Pizzicato Strings", 0-indexed
    p.insert(0, pizz)
    pattern_degrees = [0, 1, 2, 1, 2, 1, 0, 1]  # 8 sixteenths/bar, within-chord index
    for _cycle in range(CYCLES):
        for _label, tones in PHRASE_CHORDS:
            low_tones = [note.Note(t).transpose(-12).nameWithOctave for t in tones]
            for deg in pattern_degrees:
                n = note.Note(low_tones[deg % len(low_tones)])
                n.duration = duration.Duration(0.5)
                n.volume.velocity = 46
                p.append(n)
    return p


# ---------------------------------------------------------------------------
# Part 3 -- hand-percussion pulse (GM program 116 "Woodblock"). Uses a
# generic Instrument with an explicit midiProgram, the same technique as
# the Pizzicato Strings part above, deliberately NOT music21's
# instrument.Woodblock class: that class is modeled as unpitched percussion
# and music21's MIDI writer auto-routes it to MIDI channel 10 (the GM
# percussion channel), where a program-change to 115 is meaningless --
# channel 10 selects its sound from note number, not program change.
# Caught this in this track's own self-verification render pass: FluidSynth
# logged "Instrument not found on channel 9 [bank=128 prog=115]" and
# substituted a standard drum kit, so the notated "C5" pulse played back as
# a wrong percussion voice (GM key 72 on the standard kit, not a
# woodblock). Forcing a normal melodic channel (confirmed channel 1 below,
# not 10, via `mido` re-inspection) renders the intended GM 116 patch.
# Steady eighth-note pulse, light dynamics -- forward momentum without
# density, realizing the brief's "hand percussion."
# ---------------------------------------------------------------------------

def build_percussion_part():
    p = stream.Part(id="Hand Percussion")
    perc = instrument.Instrument()
    perc.instrumentName = "Hand Percussion (Woodblock)"
    perc.midiProgram = 115  # GM program 116 "Woodblock", 0-indexed
    p.insert(0, perc)
    accent_beats = {0, 2}  # slightly louder on beats 1 and 3 of each bar
    for _cycle in range(CYCLES):
        for _label, _tones in PHRASE_CHORDS:
            for beat in range(4):
                for eighth in range(2):
                    n = note.Note("C5")  # pitch is a GM patch selector here, not melody
                    n.duration = duration.Duration(0.5)
                    n.volume.velocity = 58 if beat in accent_beats and eighth == 0 else 40
                    p.append(n)
    return p


# ---------------------------------------------------------------------------
# Part 4 -- Glockenspiel bright-bell accent: one sparse ascending flourish
# marking each 8-bar phrase's first beat (3 times total), realizing the
# brief's "celesta or bright bells" as a second, sparse color distinct from
# the continuous celesta melody, in the same "used rarely" spirit as the
# boss-1 script's sparse tubular-bell accent.
# ---------------------------------------------------------------------------

def build_bell_accent_part():
    p = stream.Part(id="Bright Bell Accent")
    p.insert(0, instrument.Glockenspiel())
    for cycle_idx in range(CYCLES):
        bar_offset = cycle_idx * BARS_PER_PHRASE * 4.0
        flourish = [("D6", 0.5), ("F#6", 0.5), ("A6", 1.0)]
        pos = bar_offset
        for pitch_name, ql in flourish:
            n = note.Note(pitch_name)
            n.duration = duration.Duration(ql)
            n.volume.velocity = 54
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

    out_path = sys.argv[1] if len(sys.argv) > 1 else "opening-magic-deterministic-original.mid"
    score = build_score()
    score.write("midi", fp=out_path)
    print(f"Wrote {out_path}")

    total_quarters = TOTAL_BARS * 4.0
    seconds = total_quarters * (60.0 / BPM)
    print(f"Total bars: {TOTAL_BARS}, total quarter-notes: {total_quarters}, "
          f"expected duration at {BPM} BPM: {seconds:.1f}s")
