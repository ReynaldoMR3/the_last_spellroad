/**
 * Fire-cast VFX asset identity for `flame_sweep` (issue #125, epic #124's "Runes Awake at
 * Arcane Momentum" opening-magic plan).
 *
 * These are the CC0 Remix treatment's cast/impact/trail spritesheets -- the softer, pastel
 * particle-derived visual style the developer's live `?prototype=openingmagic` Prototype 1
 * playtest (issue #128, 2026-08-09) picked over Deterministic Original/Hybrid ("VFX: positive
 * ... the developer prefers CC0 Remix's softer, pastel particle-derived look"). Relocated to
 * this permanent production path from the throwaway `public/assets/prototypes/opening-magic/
 * cc0-remix/vfx/` directory when issue #125 wired them into the real Level 1 scene and removed
 * the now-superseded prototype scene/registry entry (`docs/agents/ana/log.md`'s 2026-08-09
 * entry on #126/#128; `docs/eng-skills/prototype-harness.md`'s Active Prototype lifecycle).
 * Byte-identical files -- see `public/assets/vfx/opening-magic-cc0-remix/provenance.json`'s
 * sha256 hashes for proof, not just an assertion.
 *
 * Scope, deliberately narrow: fire element only. The CC0 Remix sourcing pass only ever
 * generated/tinted VFX for `flame_sweep` (fire, cone) as its one showcase spell -- there is no
 * developer-reviewed CC0 Remix asset for ice/earth/lightning. Multiplicatively re-tinting these
 * specific sprites (baseline color ~(255,107,61), a warm orange) toward cyan/violet/gold would
 * produce a muddy, never-reviewed look, not an extension of anything the developer actually
 * approved -- so `SpellroadScene.ts` only wires this treatment onto fire casts and leaves the
 * existing per-element flash/burst (`ELEMENT_EFFECT_COLOR`) untouched for the other 3 elements.
 * Extending real sprite VFX to the other elements needs its own sourced/generated asset and its
 * own developer review, not a guess bolted on here.
 *
 * A pure, Phaser-free module, same convention as `sfx.ts`/`bgm.ts`/`levelArt.ts` -- only
 * `SpellroadScene.ts` touches `this.load`/`this.add.sprite`/`this.anims`.
 */

const ASSET_ROOT = "assets/vfx/opening-magic-cc0-remix";

export const OPENING_VFX_CAST_KEY = "openingvfx-fire-cast";
export const OPENING_VFX_IMPACT_KEY = "openingvfx-fire-impact";
export const OPENING_VFX_TRAIL_KEY = "openingvfx-fire-trail";

export const OPENING_VFX_CAST_URL = `${ASSET_ROOT}/cast-flame_sweep.png`;
export const OPENING_VFX_IMPACT_URL = `${ASSET_ROOT}/impact-flame_sweep.png`;
export const OPENING_VFX_TRAIL_URL = `${ASSET_ROOT}/trail-fire.png`;

export interface SpritesheetFrameConfig {
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
}

// Frame dimensions per public/assets/vfx/opening-magic-cc0-remix/provenance.json's
// `derivatives` entries -- kept as named exports (not re-derived at runtime) so a future asset
// regeneration that changes an atlas's geometry has exactly one place to update per atlas.
export const OPENING_VFX_CAST_FRAME: SpritesheetFrameConfig = { frameWidth: 64, frameHeight: 64, frameCount: 4 };
export const OPENING_VFX_IMPACT_FRAME: SpritesheetFrameConfig = { frameWidth: 48, frameHeight: 48, frameCount: 4 };
export const OPENING_VFX_TRAIL_FRAME: SpritesheetFrameConfig = { frameWidth: 64, frameHeight: 24, frameCount: 4 };

/** `this.anims.create({ key: ... })` keys -- one play-once animation per atlas. */
export const OPENING_VFX_CAST_ANIM_KEY = `${OPENING_VFX_CAST_KEY}-play`;
export const OPENING_VFX_IMPACT_ANIM_KEY = `${OPENING_VFX_IMPACT_KEY}-play`;
export const OPENING_VFX_TRAIL_ANIM_KEY = `${OPENING_VFX_TRAIL_KEY}-play`;
