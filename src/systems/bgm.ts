/**
 * Background-music asset identity (backlog 4.11, issue #97; extended by issue #142).
 *
 * Two tracks for the vertical slice — the mini-boss/Director trial theme Composer
 * generated as a `.mid` (deterministically, via `music21`, per ADR-0002) and the developer
 * approved by ear (PR #90). Phaser's sound manager can't play a raw MIDI file in a browser (no
 * bundled synth), so the shipped asset here is a rendered `.ogg` — same source composition,
 * converted once via a naive additive-synthesis render (`pretty_midi`'s `synthesize`, no system
 * audio dependency, matching Composer's own no-paid-API/local-tooling constraint) so it's real
 * playable audio without introducing a runtime MIDI-playback dependency. The original `.mid`
 * stays in the repo alongside it as the authored source of truth; only the `.ogg` is loaded by
 * the game. The second track (issue #142's ordinary-wave combat cue) ships the same way, from
 * the same deterministic `music21`-plus-`pretty_midi` pipeline. Still two flat sets of named
 * exports rather than a `BgmCue` union like `sfx.ts`'s multi-cue registry: the two tracks are
 * not interchangeable cues played through one lookup — they have different lifetimes, different
 * owners in the scene, and are mutually exclusive by construction (see
 * `shouldPlayCombatCueForWave` below). Introduce the union/lookup pattern when a track ships
 * that a caller genuinely selects *by key* at runtime.
 *
 * A pure, Phaser-free module, same convention as `sfx.ts` — `SpellroadScene.ts` is the only
 * caller and the only place that touches `this.load`/`this.sound`.
 */

import type { WaveDefinition } from "../data/types";

export const BOSS_THEME_KEY = "bgm-boss-1-invigilator-trial-theme";

export const BOSS_THEME_URL = "assets/audio/music/boss-1-invigilator-trial-theme.ogg";

/** Loops continuously under one-shot SFX (`sfx.ts`, played at default volume) for the whole
 * boss encounter — kept well under 1.0 so it sits behind the hit/cast/impact/death cues
 * instead of competing with them, per the ticket's own "shouldn't drown them out" criterion. */
export const BOSS_THEME_VOLUME = 0.35;

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

/** A notch under `BOSS_THEME_VOLUME` (0.35) rather than equal to it: this track is
 * continuously busy by design (a 16th-note tremolo bed under an 8th-note ostinato, versus the
 * boss theme's slow solo-cello line), so matching the boss theme's level would put measurably
 * more sustained energy under the same one-shot SFX. Same "sits behind the cues, never competes
 * with them" intent, arrived at from the two tracks' actual densities. */
export const COMBAT_CUE_VOLUME = 0.3;

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
