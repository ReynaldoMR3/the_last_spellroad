/**
 * Spell icon asset identity, per element (backlog 2.30, issue #56).
 *
 * The reported bug (`arc_lance` and `stone_spike` are both `shape: line, weight: light`,
 * differing only in element/power/target-count, none of which had any visual representation)
 * is fixed at the element granularity, not per-spell: `src/data/spells/spells.json`'s 12
 * shipped spells span exactly 4 elements (fire, ice, lightning, earth) across 3 shapes and 3
 * weight classes. A per-element icon set (4 icons total, reused across every spell sharing that
 * element) already disambiguates every same-shape/same-weight pair in the current spellbook —
 * `arc_lance` (lightning) vs `stone_spike` (earth) get visibly different icons — while staying
 * proportionate to a vertical slice: shape is already shown via the cast-preview geometry and
 * the hotbar's `[shape/weight]` text tag (backlog 2.14), so a full 12-unique-icon commission
 * would mostly re-encode information already on screen rather than closing a new gap. If a
 * later pass finds two same-element spells still get confused in play, the natural next step is
 * a small corner badge per shape/weight on top of these 4 base icons, not a full per-spell
 * redraw.
 *
 * A pure, Phaser-free module so "which element maps to which icon key/URL" is decidable without
 * a running Scene — same convention as `levelArt.ts`'s `TILESET_IMAGE_KEY`/`TILESET_IMAGE_URL`
 * pair. `SpellroadScene.ts` is the only caller: it still owns every actual
 * `this.load.image()`/`Image` GameObject call, since that side genuinely needs Phaser.
 *
 * Source: hand-authored (Art Sourcing Contract step 4, last resort) — Kenney.nl has no
 * dedicated elemental/spell-icon pack (checked "Game Icons", "UI Pack (RPG Expansion)", the
 * asset catalog search, and the two packs already in this repo, none contain a discrete
 * icon-shaped asset for fire/ice/lightning/earth), and OpenGameArt's CC0-filtered candidates
 * either used the wrong element set at the wrong art style (`element-icons`,
 * `magic-spell-icons` — flat SVG, fire/earth/water/air) or the right element set at the wrong
 * license (`12-elemental-type-symbolsicons` — CC-BY 4.0, disqualified: this project's search
 * order only accepts CC0 from OpenGameArt). See `docs/agents/tilesmith/log.md`'s 2026-08-02
 * entry for the full record of what was checked before falling back to hand-authoring.
 */
import type { Element, SpellDefinition } from "../data/types";

/** The 4 elements every shipped spell (`src/data/spells/spells.json`) currently uses. Not
 * hardcoded as a length check anywhere — if a 5th element ships later, `spellIconKey`/
 * `spellIconUrl` work for any `Element` string, this is just the documented current set. */
export const SPELL_ICON_ELEMENTS: readonly Element[] = ["fire", "ice", "lightning", "earth"];

/** Cache key `this.load.image(key, url)` registers an element's icon under, and an `Image`
 * GameObject's `setTexture(key)` reads it back by. */
export function spellIconKey(element: Element): string {
  return `spell-icon-${element}`;
}

/** Static URL Vite serves the hand-authored icon PNG from (`public/assets/spell-icons/
 * <element>.png`), relative to the site root so it survives a production build the same way
 * the tileset PNG and level JSON already do (see `levelArt.ts`'s equivalent comment). */
export function spellIconUrl(element: Element): string {
  return `assets/spell-icons/${element}.png`;
}

/** Convenience wrapper for the common case of "this spell's icon texture key". */
export function iconKeyForSpell(spell: Pick<SpellDefinition, "element">): string {
  return spellIconKey(spell.element);
}
