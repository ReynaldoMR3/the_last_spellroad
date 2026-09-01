/**
 * Mage + enemy-archetype sprite asset identity (issue #163).
 *
 * Before this, the mage and every enemy archetype rendered as a programmatically generated
 * flat shape (`SpellroadScene.createMage`'s `graphics.generateTexture("mage-placeholder", ...)`
 * circle, `Enemy.ensureTexture`'s `fillRoundedRect` colored square) — no real art, just a
 * Phaser `Graphics` object baked into a texture at runtime. This module is the pure,
 * Phaser-free "which archetype/character maps to which real sprite key/URL" lookup, same
 * convention as `levelArt.ts`'s `TILESET_IMAGE_KEY`/`TILESET_IMAGE_URL` and `spellIcons.ts`'s
 * `spellIconKey`/`spellIconUrl` pairs — `SpellroadScene.ts` and `Enemy.ts` are the only
 * callers, since actually calling `this.load.image()`/`setTexture()` needs a live Scene.
 *
 * Source: no new sourcing needed — both packs backing these picks are already CC0,
 * downloaded, and developer-signed-off (`docs/agents/tilesmith/log.md`, 2026-07-30 entry),
 * and the specific tile picks were already curated and developer-facing in
 * `docs/agents/tilesmith/tile-legend.md` (2026-08-01 entry). Issue #163's own text confirms
 * this isn't a sourcing gap for the 3 enemy archetypes — only the mage sprite and the actual
 * engine wiring were missing. Individual per-tile PNGs (not the packed spritesheet) are used
 * here since each pack already ships every tile as its own standalone file under `Tiles/
 * tile_NNNN.png` — a plain `this.load.image()` per key, no spritesheet-frame math needed,
 * matching the existing `spellIcons.ts`/`TILESET_IMAGE_URL` "one file per load call"
 * convention rather than introducing a new frame-indexing pattern for just this one case.
 *
 * - Mage: Kenney "Tiny Dungeon" (CC0), tile index 84 — `tile-legend.md`'s "Chibi base-character
 *   reference" (purple-robed, white-bearded wizard). That entry originally logged this tile as
 *   "style/size reference only, not an archetype pick" for the *enemies* — it was never ruled
 *   out as a player-facing pick, and a robed wizard silhouette is exactly what the mage needs;
 *   this promotes it from reference-only to the actual shipped mage sprite. Same pack/license
 *   already covers the lane terrain, so no new third-party asset enters the repo.
 * - Melee -> Golem: OpenGameArt "Tiny Creatures" (CC0), tile index 127.
 * - Ranged -> Harpy: OpenGameArt "Tiny Creatures" (CC0), tile index 32.
 * - Debuffer -> Witch: OpenGameArt "Tiny Creatures" (CC0), tile index 66.
 *
 * Every tile used here is native 16x16 pixel art (both packs' shared scale) — every call site keeps
 * its own already-explicit `setDisplaySize`/`body.setSize` calls so the swap from a
 * generated-texture's native size to this 16x16 art doesn't silently shrink hit boxes or
 * on-screen footprint; this module only supplies the texture identity, never sizing.
 */
import { MONSTER_REGISTRY } from "../data/monsterRegistry";
import type { Element, EnemyArchetype } from "../data/types";

/** Cache key `this.load.image(key, url)` registers the mage's sprite under, and
 * `sprite.setTexture(key)` reads it back by. */
export const MAGE_SPRITE_KEY = "mage-sprite";

/** Static URL Vite serves the mage's sprite PNG from — already-committed third-party art
 * (Kenney Tiny Dungeon, CC0, 2026-07-30 sign-off), not a new download. Relative to the site
 * root, same convention as `TILESET_IMAGE_URL`/`spellIconUrl`. */
export const MAGE_SPRITE_URL = "assets/third-party/kenney-tiny-dungeon/Tiles/tile_0084.png";

/** Cache key `this.load.image(key, url)` registers an archetype's sprite under, and
 * `Enemy.ensureTexture` reads it back by (`enemy-${archetype}`, unchanged from the prior
 * generated-texture convention so no other call site needs to change its own key format). */
export function enemySpriteKey(archetype: EnemyArchetype): string {
  return `enemy-${archetype}`;
}

/** Static URL Vite serves an archetype's sprite PNG from — all 3 already-committed
 * third-party art (OpenGameArt Tiny Creatures, CC0, 2026-07-30 sign-off), curated in
 * `docs/agents/tilesmith/tile-legend.md`'s 2026-08-01 entry. Not a new download. */
export function enemySpriteUrl(archetype: EnemyArchetype): string {
  return ENEMY_SPRITE_URL[archetype];
}

const ENEMY_SPRITE_URL: Record<EnemyArchetype, string> = {
  melee: "assets/third-party/tiny-creatures/Tiles/tile_0128.png",
  ranged: "assets/third-party/tiny-creatures/Tiles/tile_0033.png",
  debuffer: "assets/third-party/tiny-creatures/Tiles/tile_0067.png"
};

/** Every archetype this game currently ships, for a `preload()` loop to iterate — same
 * "explicit list, not derived from a Record's keys at call time" convention `spellIcons.ts`'s
 * `SPELL_ICON_ELEMENTS` uses, so the preload loop's order is stable and readable at the call
 * site. */
export const ALL_ENEMY_ARCHETYPES: readonly EnemyArchetype[] = ["melee", "ranged", "debuffer"];

/** The registry remains the single owner of a silhouette's ID, archetype, cache key, and asset
 * record. This list is only its stable preload order, never a second roster declaration. */
export const MONSTER_VISUAL_IDS = Object.keys(MONSTER_REGISTRY);

export type ElementalMonsterMotif = "flame-spikes" | "ice-crystal" | "earth-corners" | "lightning-zigzag";

export interface ElementalMonsterPresentation {
  accentColor: number;
  accentChannel: "wave-element";
  motif: ElementalMonsterMotif;
  outline: {
    color: number;
    channel: "neutral-outline";
  };
}

/** Explicit wave-element metadata, deliberately independent of the source sprite's pixels.
 * Shape motifs remain discernible when accent colors are unavailable to a player. */
export const ELEMENTAL_MONSTER_PRESENTATION: Record<Element, ElementalMonsterPresentation> = {
  fire: {
    accentColor: 0xe05252,
    accentChannel: "wave-element",
    motif: "flame-spikes",
    outline: { color: 0x14161f, channel: "neutral-outline" }
  },
  ice: {
    accentColor: 0x8dd8ff,
    accentChannel: "wave-element",
    motif: "ice-crystal",
    outline: { color: 0x14161f, channel: "neutral-outline" }
  },
  earth: {
    accentColor: 0x9e7a4f,
    accentChannel: "wave-element",
    motif: "earth-corners",
    outline: { color: 0x14161f, channel: "neutral-outline" }
  },
  lightning: {
    accentColor: 0xf4c430,
    accentChannel: "wave-element",
    motif: "lightning-zigzag",
    outline: { color: 0x14161f, channel: "neutral-outline" }
  }
};

export type ElementalBadgeShape = "triangle" | "diamond" | "square" | "zigzag";
export interface ElementalBadgePresentation {
  shape: ElementalBadgeShape;
  regularDiameter: number;
  bossDiameter: number;
  fillChannel: "filled-non-color-motif";
}

/** Normal-scale tactical marker. Unlike the decorative 2px frame motif, this is a filled,
 * silhouette-adjacent badge large enough to remain separable in mixed clusters and grayscale. */
export const ELEMENTAL_BADGE_PRESENTATION: Record<Element, ElementalBadgePresentation> = {
  fire: { shape: "triangle", regularDiameter: 16, bossDiameter: 22, fillChannel: "filled-non-color-motif" },
  ice: { shape: "diamond", regularDiameter: 16, bossDiameter: 22, fillChannel: "filled-non-color-motif" },
  earth: { shape: "square", regularDiameter: 16, bossDiameter: 22, fillChannel: "filled-non-color-motif" },
  lightning: { shape: "zigzag", regularDiameter: 16, bossDiameter: 22, fillChannel: "filled-non-color-motif" }
};

export interface MonsterVisualPresentation extends ElementalMonsterPresentation {
  key: string;
  url: string;
}

/** Registry-only lookup for preload and legacy-wave compatibility. It intentionally returns no
 * accent, outline, or motif because no wave element has been supplied. */
export function monsterSprite(id: string): Pick<MonsterVisualPresentation, "key" | "url"> {
  const monster = MONSTER_REGISTRY[id];
  if (!monster) {
    throw new Error(`Unknown monster visual "${id}"`);
  }
  return { key: monster.spriteKey, url: monster.asset.url };
}

export function monsterVisual(id: string, element: Element): MonsterVisualPresentation {
  return {
    ...monsterSprite(id),
    ...ELEMENTAL_MONSTER_PRESENTATION[element]
  };
}

/** Keeps pre-Task-4 authored waves drawable while their entries still identify an archetype
 * rather than a registry visual ID. The element remains absent here by design: it belongs to a
 * wave assignment and is never fabricated from the silhouette. */
export function defaultMonsterVisualId(archetype: EnemyArchetype): string {
  return {
    melee: "monster_m01",
    ranged: "monster_r01",
    debuffer: "monster_d01"
  }[archetype];
}
