/**
 * Per-play pitch/volume variation for the SFX cues (`sfx.ts`) — backlog 3.11, issue #94.
 *
 * The developer's 2026-08-05 playtest reopened 3.10's own disclosed tradeoff: the shipped
 * cast/impact/hit cues are generic Kenney stand-ins (no dedicated "magic spell" pack exists),
 * and hearing the exact same one-shot on every cast/hit over extended play reads as grating.
 * Developer's chosen fix (2026-08-06): reduce the repetition fatigue with per-play pitch and
 * volume variation on the existing cues, falling back to re-sourcing only if this doesn't land.
 *
 * A pure, Phaser-free module so the random range is decidable and testable without a running
 * Scene — same seam convention as `debuffDisplay.ts`/`hotbarLayout.ts`. `SpellroadScene.ts` is
 * the only caller: it passes the result straight into `this.sound.play(key, config)`'s
 * `detune`/`volume` fields, which Phaser's sound manager already supports per-play.
 */

export interface SfxVariation {
  /** Cents to detune this play by (Phaser's `SoundConfig.detune`). +/-100 cents is +/-1
   * semitone — enough to make repeats sound distinct without reading as "wrong note". */
  detune: number;
  volume: number;
}

export const DETUNE_RANGE_CENTS = 100;
export const VOLUME_MIN = 0.85;
export const VOLUME_MAX = 1.0;

/**
 * `random` defaults to `Math.random` and must return a value in `[0, 1)` (or `[0, 1]` at the
 * boundary, as in this file's own tests) — injectable so the range's endpoints are directly
 * testable without stubbing the global.
 */
export function computeSfxVariation(random: () => number = Math.random): SfxVariation {
  const detune = (random() * 2 - 1) * DETUNE_RANGE_CENTS;
  const volume = VOLUME_MIN + random() * (VOLUME_MAX - VOLUME_MIN);
  return { detune, volume };
}
