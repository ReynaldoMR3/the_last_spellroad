"""
Composer agent — issue #142 (epic #124), first combat-specific track.

Target: the ambient combat loop for ordinary (non-boss) monster-engagement
waves, Level 1-4 -- NOT the mini-boss/Director trial theme (issue #139,
separate, already composed, out of scope here).

Brief: docs/agents/lorena/log.md, 2026-08-09 entry "Issue #142 (epic #124):
music brief for the ordinary combat-encounter loop".

Brief parameters this script composes against:
  - Mood: alert, tactically live -- not exploration's bright contentment,
    not the boss trial's unhurried dread. Urgency under survivable pressure.
  - Tempo: 132-140 BPM, straight 4/4, driving/syncopated pulse. Chosen: 136.
  - Key/harmony: A minor, a tight i-VII-i-iv vamp (Am-G-Am-Dm), circling
    rather than resolving, ending each 4-bar cycle on iv so the loop point
    reads as circular, not a finale cadence (same anti-cadence technique
    the boss-1 and opening-magic scripts already use, ending on VI / V).
  - Instrumentation: low string ostinato (viola, driving pulse), a
    syncopated low-tom/frame-drum pulse, sparse clipped horn stabs (once
    every 2 bars), and a tense tremolo string bed underneath.
  - Length/loop: 16 bars (4 cycles of the 4-bar vamp) = 64 quarter-notes,
    ~28.2s at 136 BPM -- inside the brief's 20-35s target, deliberately
    much shorter than the boss trial's 45-75s loop since regular waves are
    the GDD's fast/frequent "resolve quickly" tier, not the trial's
    sustained multi-phase tier.

Generation method: deterministic, notation-based composition via music21
(per docs/adr/0002-unblock-audio-scope-add-composer-agent.md's requirement --
no raw-audio or notation-as-text generation). Renders to a standard MIDI
file; a separate render step (pretty_midi.synthesize() + soundfile, no
system fluidsynth/ffmpeg) produces the browser-ready .ogg, per the render
precedent already used for boss-1-invigilator-trial-theme.ogg
(docs/agents/loomwright/log.md, 2026-08-05 entry).

Percussion note: the opening-magic script found that music21's writer
auto-routes dedicated percussion-class instruments (e.g. instrument.Woodblock)
onto MIDI channel 10, where a GM program-change is meaningless -- so, same
fix as that script, the tom/frame-drum part below uses a generic
instrument.Instrument() with an explicit midiProgram rather than a
percussion-class instrument.
"""

from music21 import stream, note, chord, meter, tempo, key, instrument, duration

BPM = 136
BARS_PER_CYCLE = 4
CYCLES = 4
TOTAL_BARS = BARS_PER_CYCLE * CYCLES  # 16 bars = ~28.2s at 136 BPM, 4/4

# One triad per bar across the 4-bar vamp: i - VII - i - iv (Am - G - Am - Dm).
# Ends on iv, not i -- the loop reads as circling back to the top rather than
# resolving to a tonic downbeat, same anti-finale technique as the boss-1
# (ends on VI) and opening-magic (ends on V) scripts.
CYCLE_CHORDS = [
    ("i", ["A3", "C4", "E4"]),
    ("VII", ["G3", "B3", "D4"]),
    ("i", ["A3", "C4", "E4"]),
    ("iv", ["D4", "F4", "A4"]),
]

# ---------------------------------------------------------------------------
# Part 1 -- low string ostinato (viola register): the driving rhythmic pulse
# that carries the "combat is live" identity for the whole loop. Eighth-note
# chord-tone pattern with a velocity accent scheme so it reads as syncopated
# even though the underlying durations are straight eighths -- same
# accent-via-velocity technique the boss-1 harp ostinato already used.
# ---------------------------------------------------------------------------

# Within-chord tone index per eighth-note slot (root-fifth-third-fifth,
# repeated), and a matching velocity accent so beats 1 and 3 punch through.
DEGREE_PATTERN = [0, 2, 1, 2, 0, 2, 1, 2]
VELOCITY_PATTERN = [82, 56, 66, 56, 78, 54, 64, 54]


def build_ostinato_part():
    p = stream.Part(id="Viola")
    p.insert(0, instrument.Viola())
    for _cycle in range(CYCLES):
        for _label, tones in CYCLE_CHORDS:
            low_tones = [note.Note(t).transpose(-12).nameWithOctave for t in tones]
            for slot in range(8):
                deg = DEGREE_PATTERN[slot]
                n = note.Note(low_tones[deg % len(low_tones)])
                n.duration = duration.Duration(0.5)
                n.volume.velocity = VELOCITY_PATTERN[slot]
                p.append(n)
    return p


# ---------------------------------------------------------------------------
# Part 2 -- syncopated low-tom / frame-drum pulse: a constant rhythmic
# signal, not decoration (contrast against the opening-magic loop's
# ambient woodblock and the boss trial's rare ritual bell). Hits land off
# the strict downbeat (beat 1, beat 2.5, beat 3.5) each bar for a driving,
# slightly uneven pulse.
# ---------------------------------------------------------------------------

TOM_OFFSETS_IN_BAR = [0.0, 1.5, 2.5]


def build_tom_part():
    p = stream.Part(id="LowTom")
    tom = instrument.Instrument()
    tom.instrumentName = "Low Tom / Frame Drum"
    tom.midiProgram = 116  # GM program 117, "Taiko Drum" (0-indexed) -- generic
    # Instrument with an explicit midiProgram, per this script's own header
    # note, to avoid music21 auto-routing a percussion-class instrument onto
    # MIDI channel 10.
    p.insert(0, tom)
    bar_length = 4.0
    for bar_idx in range(TOTAL_BARS):
        bar_start = bar_idx * bar_length
        events = []
        prev_end = 0.0
        for onset in TOM_OFFSETS_IN_BAR:
            if onset > prev_end:
                r = note.Rest()
                r.duration = duration.Duration(onset - prev_end)
                events.append(r)
            n = note.Note("D3")
            n.duration = duration.Duration(0.5)
            n.volume.velocity = 74 if onset == 0.0 else 62
            events.append(n)
            prev_end = onset + 0.5
        if prev_end < bar_length:
            r = note.Rest()
            r.duration = duration.Duration(bar_length - prev_end)
            events.append(r)
        for ev in events:
            p.append(ev)
    return p


# ---------------------------------------------------------------------------
# Part 3 -- sparse horn stabs: short, clipped chord hits on structural
# downbeats only, once every 2 bars (8 stabs across 16 bars). Both existing
# tracks' briefs explicitly ruled brass out; this is the one place the new
# brief deliberately reintroduces it, in a controlled dose, because "reads
# as combat" was the entire signal from the failed playtest.
# ---------------------------------------------------------------------------


def build_horn_part():
    p = stream.Part(id="Horn")
    p.insert(0, instrument.Horn())
    bar_length = 4.0
    for cycle_idx in range(CYCLES):
        for bar_in_cycle, (_label, tones) in enumerate(CYCLE_CHORDS):
            bar_idx = cycle_idx * BARS_PER_CYCLE + bar_in_cycle
            bar_start = bar_idx * bar_length
            if bar_idx % 2 == 0:
                stab = chord.Chord([tones[0], tones[-1]])  # root + top voice, no full triad
                stab.duration = duration.Duration(0.75)
                stab.volume.velocity = 70
                p.insert(bar_start, stab)
                r = note.Rest()
                r.duration = duration.Duration(bar_length - 0.75)
                p.insert(bar_start + 0.75, r)
            else:
                r = note.Rest()
                r.duration = duration.Duration(bar_length)
                p.insert(bar_start, r)
    return p


# ---------------------------------------------------------------------------
# Part 4 -- tense tremolo string bed: fast sixteenth-note reiteration of the
# current chord's root, soft dynamic, throughout the whole loop. Replaces
# the opening-magic loop's plucked lightness and the boss trial's held warm
# pad with an on-edge, slightly unsettled texture underneath.
# ---------------------------------------------------------------------------


def build_tremolo_part():
    p = stream.Part(id="TremoloStrings")
    p.insert(0, instrument.Violin())
    for _cycle in range(CYCLES):
        for _label, tones in CYCLE_CHORDS:
            root = tones[0]
            for sixteenth in range(16):
                n = note.Note(root)
                n.duration = duration.Duration(0.25)
                n.volume.velocity = 30 if sixteenth % 4 else 34
                p.append(n)
    return p


def build_score():
    sc = stream.Score()
    sc.insert(0, tempo.MetronomeMark(number=BPM))
    sc.insert(0, meter.TimeSignature("4/4"))
    sc.insert(0, key.Key("a", "minor"))

    for part in (
        build_ostinato_part(),
        build_tom_part(),
        build_horn_part(),
        build_tremolo_part(),
    ):
        part.insert(0, tempo.MetronomeMark(number=BPM))
        part.insert(0, meter.TimeSignature("4/4"))
        sc.insert(0, part)
    return sc


if __name__ == "__main__":
    import sys

    out_path = sys.argv[1] if len(sys.argv) > 1 else "combat-encounter-loop.mid"
    score = build_score()
    score.write("midi", fp=out_path)
    print(f"Wrote {out_path}")

    total_quarters = TOTAL_BARS * 4.0
    seconds = total_quarters * (60.0 / BPM)
    print(f"Total bars: {TOTAL_BARS}, total quarter-notes: {total_quarters}, "
          f"expected duration at {BPM} BPM: {seconds:.1f}s")
