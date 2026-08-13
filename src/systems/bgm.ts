/**
 * Background-music asset identity (backlog 4.11, issue #97; extended by issues #142 and #188).
 *
 * Four tracks for the vertical slice — the mini-boss/Director trial theme, the ordinary-wave
 * combat cue, and (issue #188) three rotating variants of one non-combat interlude loop, which
 * between them cover every moment of the slice that isn't a menu. The trial theme is the one
 * Composer generated as a `.mid` (deterministically, via `music21`, per ADR-0002) and the developer
 * approved by ear (PR #90). Phaser's sound manager can't play a raw MIDI file in a browser (no
 * bundled synth), so the shipped asset here is a rendered `.ogg` — same source composition,
 * converted once via a naive additive-synthesis render (`pretty_midi`'s `synthesize`, no system
 * audio dependency, matching Composer's own no-paid-API/local-tooling constraint) so it's real
 * playable audio without introducing a runtime MIDI-playback dependency. The original `.mid`
 * stays in the repo alongside it as the authored source of truth; only the `.ogg` is loaded by
 * the game. The second track (issue #142's ordinary-wave combat cue) ships the same way, from
 * the same deterministic `music21`-plus-`pretty_midi` pipeline. The three interlude loops (issue
 * #188) are the same deterministic `music21` composition step but a different render step —
 * FluidSynth against a licensed GM SoundFont, then `ffmpeg` to Vorbis — because that is how the
 * original of the three was rendered before it was pulled from the game, and re-rendering it
 * through the sine-wave path to match the other two would have changed the track the developer
 * said he liked.
 *
 * Those first two stay flat sets of named exports rather than a `BgmCue` union like `sfx.ts`'s
 * multi-cue registry: they are not interchangeable cues played through one lookup — they have
 * different lifetimes, different owners in the scene, and are mutually exclusive by construction
 * (see `shouldPlayCombatCueForWave` below). The module comment used to say to "introduce the
 * union/lookup pattern when a track ships that a caller genuinely selects *by key* at runtime";
 * the interlude rotation is exactly that track, so it — and only it — ships as a keyed
 * collection (`EXPLORATION_LOOP_KEYS`/`EXPLORATION_LOOP_URLS`).
 *
 * A pure, Phaser-free module, same convention as `sfx.ts` — `SpellroadScene.ts` is the only
 * caller and the only place that touches `this.load`/`this.sound`.
 */

import type { WaveDefinition } from "../data/types";

export const BOSS_THEME_KEY = "bgm-boss-1-invigilator-trial-theme";

export const BOSS_THEME_URL = "assets/audio/music/boss-1-invigilator-trial-theme.ogg";

/** Loops continuously under one-shot SFX (`sfx.ts`, played via `computeSfxVariation`/
 * `computeSpellSfxVariation`'s 0.85-1.0 per-play range, `sfxVariation.ts`) for the whole
 * boss encounter — kept under that range so it still sits behind the hit/cast/impact/death
 * cues instead of competing with them, per issue #97's original "shouldn't drown them out"
 * criterion.
 *
 * **2026-08-12 (issue #180):** developer playtest on the final level: "the audio of the spells
 * are higher... it needs adjusting so it's at the same level." At the original 0.35 this loop
 * sat at roughly 35-41% of the SFX one-shots' loudness (0.35 / 0.85-1.0) — read as buried
 * rather than merely "behind." Raised to 0.55 (+0.20, ×1.57): now roughly 55-65% of the SFX
 * range, audibly present under a rapid-fire cast sequence per this issue's own acceptance
 * criterion, while staying below every SFX one-shot's floor (0.85) so #97's original complaint
 * (spells drowned out by the music) doesn't reopen in the other direction. Deliberately not
 * raised to parity (~1.0): the one-shots are still the moment-to-moment feedback a player reacts
 * to (am I getting hit, did that cast land), and #97 exists because parity is exactly what
 * buried them the first time. Left as a `BOSS_THEME_VOLUME` constant/`COMBAT_CUE_VOLUME` pair
 * rather than touching `sfxVariation.ts`'s SFX range: that range is shared by every level, not
 * just the boss encounter this ticket calls out, and the ticket's own acceptance criterion is
 * scoped to "the boss/Level 5 encounter, at minimum." */
export const BOSS_THEME_VOLUME = 0.55;

/**
 * Issue #142 — the ordinary (non-boss) monster-engagement loop, composed against Lorena's
 * 2026-08-09 combat-cue brief (`docs/agents/lorena/log.md`) and validated by Heckler
 * (`docs/agents/heckler/log.md`, 2026-08-09 (3)). 28.6s, A minor, 136 BPM, viola ostinato +
 * syncopated low-tom pulse + clipped horn stabs + tremolo string bed — deliberately a different
 * key, tempo, register, and instrument set from the boss theme, because this ticket exists
 * precisely because the previous single loop read as calm exploration music once monsters were
 * on screen.
 *
 * The exploration/forest-ambience identity this cue is contrasted against is untouched: its
 * brief (`docs/agents/_reference/opening-experience-brief.md`) and its composition script
 * (`docs/agents/composer/scripts/compose-opening-magic-deterministic-original.py`) both stay
 * exactly as they were, reserved for future exploration/NPC-conversation content. Nothing in
 * this module reads or replaces them.
 */
export const COMBAT_CUE_KEY = "bgm-combat-encounter-loop";

export const COMBAT_CUE_URL = "assets/audio/music/combat-encounter-loop.ogg";

/** A notch under `BOSS_THEME_VOLUME` rather than equal to it: this track is continuously busy
 * by design (a 16th-note tremolo bed under an 8th-note ostinato, versus the boss theme's slow
 * solo-cello line), so matching the boss theme's level would put measurably more sustained
 * energy under the same one-shot SFX. Same "sits behind the cues, never competes with them"
 * intent, arrived at from the two tracks' actual densities.
 *
 * **2026-08-12 (issue #180):** raised from 0.3 to 0.5 alongside `BOSS_THEME_VOLUME`'s own
 * 0.35→0.55 raise, keeping the original 0.05 gap between the two tracks rather than scaling it
 * proportionally — the density difference the comment above describes is a fixed property of
 * the two compositions, not something that should shrink or grow with the absolute volume. Only
 * the boss/Level 5 encounter was the developer's explicit playtest complaint, but the ticket
 * asked to consider this constant too "while in there," and leaving the two tracks at
 * different absolute distances from the SFX floor (0.35 vs 0.3 stayed 0.05 apart pre-fix) than
 * post-fix would have been the one asymmetry with no stated reason. */
export const COMBAT_CUE_VOLUME = 0.5;

/**
 * Whether the combat cue owns the music for a given wave.
 *
 * Boss waves are excluded outright — Level 5 is the Director trial, whose own theme starts at
 * Phase 1 and runs across every phase break (`SpellroadScene.playBossTheme`). The two tracks are
 * never layered: one predicate decides which track a wave belongs to, so "both playing at once"
 * is not a state the scene can reach by forgetting a stop call somewhere.
 *
 * Kept here as a pure function (rather than an inline `!wave.is_boss` in the scene) so the
 * boss-exclusion rule is unit-testable without Phaser, matching this repo's convention that
 * decisions live in `systems/` and only playback lives in the scene.
 */
export function shouldPlayCombatCueForWave(wave: WaveDefinition | undefined): boolean {
  if (!wave) {
    return false;
  }
  return wave.is_boss !== true;
}

/**
 * Issue #188 — the Level 1-4 non-combat interlude loop, in three rotating variants.
 *
 * This is the exploration/forest-ambience identity the two comments above describe as
 * "untouched... reserved for future exploration/NPC-conversation content." That future arrived:
 * developer playtest (2026-08-12) — "its good the level 1 music i like it, but i think we need 2
 * more very similar with some variations, so the loop of the song gets to bother it," clarified
 * as "when i finish a level and select explore i dont hear any music, so it would be nice to hear
 * the explore theme here." The Side-Pocket Explore/Continue prompt (issue #157) is the moment
 * that surfaced the silence; the silence itself covers every non-combat gap between waves.
 *
 * The first entry is the original `opening-magic-deterministic-original` track (composed against
 * `docs/agents/_reference/opening-experience-brief.md`, staged and then removed from the shipped
 * game by issue #125) restored byte-for-byte and promoted from `assets/prototypes/` to
 * `assets/audio/music/` alongside the other two shipped tracks. The other two are its siblings,
 * composed against Lorena's 2026-08-12 variation brief (`docs/agents/lorena/log.md`) — same key
 * (D major), same tempo (128 BPM), same length (45.3s), same four voices, deliberately close
 * variations rather than new compositions, because "very similar with some variations" is the
 * developer's own framing.
 *
 * This is the first track set that a caller genuinely selects *by key* at runtime, which is
 * exactly the condition the module doc comment above names for introducing a keyed collection —
 * so these three are an array plus a `Record` lookup, while the boss theme and combat cue stay
 * the flat single-track exports they were.
 */
export const EXPLORATION_LOOP_KEYS = [
  "bgm-exploration-loop-original",
  "bgm-exploration-loop-variation-a",
  "bgm-exploration-loop-variation-b"
] as const;

export type ExplorationLoopKey = (typeof EXPLORATION_LOOP_KEYS)[number];

export const EXPLORATION_LOOP_URLS: Record<ExplorationLoopKey, string> = {
  "bgm-exploration-loop-original": "assets/audio/music/exploration-loop-original.ogg",
  "bgm-exploration-loop-variation-a": "assets/audio/music/exploration-loop-variation-a.ogg",
  "bgm-exploration-loop-variation-b": "assets/audio/music/exploration-loop-variation-b.ogg"
};

/** Matched to `COMBAT_CUE_VOLUME` rather than set independently: this loop and the combat cue
 * hand off to each other continuously within a level (this one stops on the same first-enemy
 * spawn that starts that one), and a level change across that handoff would read as the game
 * getting louder or quieter at the moment combat starts — a second, unasked-for signal on top of
 * the deliberate one the track change already carries. Both still sit below every SFX one-shot's
 * 0.85 floor (`sfxVariation.ts`), per issue #97's original "shouldn't drown them out" criterion. */
export const EXPLORATION_LOOP_VOLUME = 0.5;

/**
 * Whether the interlude loop owns the music in the gap between two waves.
 *
 * The inverse of `shouldPlayCombatCueForWave`'s boundary, evaluated at a wave clear: the cue
 * covers a wave that is being fought, this covers the quiet after one ends and before the next
 * one's first enemy spawns.
 *
 * Boss waves are excluded on *both* sides, which is the one rule here that isn't just "not
 * combat." A cleared boss phase leads to the phase-break prompt, which the Director trial's own
 * theme plays under from Phase 1 through to victory (`SpellroadScene.playBossTheme`) — the same
 * mutual exclusion `shouldPlayCombatCueForWave` already establishes, extended to a third track.
 * The *next* wave is checked too so the last ordinary wave of Level 4 doesn't open a 1.2s window
 * of exploration music immediately before the boss theme starts; that transition is the run's
 * biggest tonal gear-change and putting a 1-second track between its two halves would blunt it.
 * A missing next wave (the vertical slice ending) is excluded for the same reason: nothing
 * follows, so there is no interlude, only an ending.
 *
 * Kept here as a pure function for the same reason its sibling predicate is — the rule is
 * unit-testable without Phaser, and decisions live in `systems/` while playback lives in the
 * scene.
 */
export function shouldPlayExplorationLoopBetweenWaves(
  clearedWave: WaveDefinition | undefined,
  nextWave: WaveDefinition | undefined
): boolean {
  if (!clearedWave || !nextWave) {
    return false;
  }
  return clearedWave.is_boss !== true && nextWave.is_boss !== true;
}

/**
 * Picks which of the three interlude tracks plays next, never the one that played immediately
 * before.
 *
 * The whole point of the ticket is that hearing the same 45-second loop back to back is what
 * "gets to bother" a player, so the only hard guarantee is no immediate repeat; beyond that the
 * choice is random rather than a fixed A-B-C cycle, since a fixed cycle is itself a longer loop a
 * player eventually learns.
 *
 * `previousKey` is `undefined` on the first interlude of a session, which simply means every
 * track is a candidate. `random` is injected (defaulting to `Math.random`) so the rotation is
 * testable without stubbing globals — the same "pure, Phaser-free, unit-testable" convention
 * `shouldPlayCombatCueForWave` set, applied to a function that genuinely needs a random source.
 *
 * Degenerate inputs fail safe rather than throwing: a single-track list returns that track (a
 * repeat is the only option), and an empty list returns `undefined` for the caller to skip
 * playback rather than crash the scene mid-level over a music choice.
 */
export function pickExplorationTrack(
  previousKey: ExplorationLoopKey | undefined,
  allKeys: readonly ExplorationLoopKey[] = EXPLORATION_LOOP_KEYS,
  random: () => number = Math.random
): ExplorationLoopKey | undefined {
  if (allKeys.length === 0) {
    return undefined;
  }
  const candidates = allKeys.filter((key) => key !== previousKey);
  const pool = candidates.length > 0 ? candidates : allKeys;
  // Clamped rather than trusting `random()` to stay in [0, 1): an injected test double (or a
  // seeded RNG swapped in later) returning exactly 1 would otherwise index off the end and hand
  // the scene an `undefined` key that only fails at `this.sound.add` time, far from the cause.
  const index = Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)));
  return pool[index];
}
