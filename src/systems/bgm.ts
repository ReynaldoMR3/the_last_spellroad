/**
 * Background-music asset identity (backlog 4.11, issue #97).
 *
 * Just one track for the vertical slice — the mini-boss/Director trial theme Composer
 * generated as a `.mid` (deterministically, via `music21`, per ADR-0002) and the developer
 * approved by ear (PR #90). Phaser's sound manager can't play a raw MIDI file in a browser (no
 * bundled synth), so the shipped asset here is a rendered `.ogg` — same source composition,
 * converted once via a naive additive-synthesis render (`pretty_midi`'s `synthesize`, no system
 * audio dependency, matching Composer's own no-paid-API/local-tooling constraint) so it's real
 * playable audio without introducing a runtime MIDI-playback dependency. The original `.mid`
 * stays in the repo alongside it as the authored source of truth; only the `.ogg` is loaded by
 * the game. A single named export (not a `BgmCue` union like `sfx.ts`'s multi-cue registry) —
 * add the union/lookup pattern back if a second track ever ships.
 */

export const BOSS_THEME_KEY = "bgm-boss-1-invigilator-trial-theme";

export const BOSS_THEME_URL = "assets/audio/music/boss-1-invigilator-trial-theme.ogg";

/** Loops continuously under one-shot SFX (`sfx.ts`, played at default volume) for the whole
 * boss encounter — kept well under 1.0 so it sits behind the hit/cast/impact/death cues
 * instead of competing with them, per the ticket's own "shouldn't drown them out" criterion. */
export const BOSS_THEME_VOLUME = 0.35;
