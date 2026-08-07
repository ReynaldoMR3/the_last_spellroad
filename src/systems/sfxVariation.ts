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
 *
 * **Per-element base detune, added for issue #111** ("try distinct audio settings for each
 * spell... not just per-cue-type"): the developer's 2026-08-06 follow-up on 3.11/#94 found
 * per-play variation alone still didn't resolve the fatigue complaint, and asked specifically
 * for per-spell distinction on top of it. Scoped at the *element* granularity rather than
 * per-spell, same reasoning `spellIcons.ts` already applied to backlog 2.30's icon work: the 12
 * shipped spells span exactly 4 elements, and there's no dedicated per-spell audio asset to draw
 * a finer distinction from anyway (still the same 2 shared "cast"/"impact" one-shots, per
 * `sfx.ts`) — a per-element base pitch is the honest ceiling of what re-pitching one recording
 * can actually convey, without inventing a false precision a single stock sample can't support.
 * Applies only to `cast`/`impact`, the two cues actually tied to a specific spell's element —
 * `hit`/`enemyDeath`/`playerDeath` aren't attributable to one spell and keep the plain,
 * element-less variation below unchanged.
 */
import type { Element } from "../data/types";

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

/** Fixed base offset (cents) per element, layered under the per-play random range above so
 * every element still sounds distinct from every other even when two plays happen to roll the
 * same random detune. Spread wide enough to read as separate registers on the same underlying
 * sample (a semitone == 100 cents): fire sits low/warm, ice sits high/glassy, lightning sits
 * highest/sharpest, earth sits lowest/heaviest — ordered by each element's established GDD
 * character rather than picked arbitrarily. */
export const ELEMENT_DETUNE_OFFSET_CENTS: Record<Element, number> = {
  earth: -400,
  fire: -150,
  ice: 250,
  lightning: 450
};

/** Same per-play randomization as `computeSfxVariation`, with the target spell's element's
 * fixed base offset added to the detune so repeated casts/impacts of different elements don't
 * all converge on the same pitch register. */
export function computeSpellSfxVariation(
  element: Element,
  random: () => number = Math.random
): SfxVariation {
  const base = computeSfxVariation(random);
  return { ...base, detune: base.detune + ELEMENT_DETUNE_OFFSET_CENTS[element] };
}
