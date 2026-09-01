import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as characterArt from "./characterArt";
import { MONSTER_REGISTRY } from "../data/monsterRegistry";

const {
  ALL_ENEMY_ARCHETYPES,
  MAGE_SPRITE_KEY,
  MAGE_SPRITE_URL,
  enemySpriteKey,
  enemySpriteUrl
} = characterArt;

describe("MAGE_SPRITE_KEY / MAGE_SPRITE_URL — mage sprite asset identity (issue #163)", () => {
  it("points at the already-committed Kenney Tiny Dungeon wizard tile", () => {
    expect(MAGE_SPRITE_KEY).toBe("mage-sprite");
    expect(MAGE_SPRITE_URL).toBe("assets/third-party/kenney-tiny-dungeon/Tiles/tile_0084.png");
  });
});

describe("enemySpriteKey / enemySpriteUrl — per-archetype enemy sprite asset identity (issue #163)", () => {
  it("produces a distinct, stable cache key per archetype, matching Enemy.ensureTexture's prior naming", () => {
    expect(enemySpriteKey("melee")).toBe("enemy-melee");
    expect(enemySpriteKey("ranged")).toBe("enemy-ranged");
    expect(enemySpriteKey("debuffer")).toBe("enemy-debuffer");
  });

  it("points every archetype at its curated Tiny Creatures tile (tile-legend.md, 2026-08-01)", () => {
    expect(enemySpriteUrl("melee")).toBe("assets/third-party/tiny-creatures/Tiles/tile_0128.png");
    expect(enemySpriteUrl("ranged")).toBe("assets/third-party/tiny-creatures/Tiles/tile_0033.png");
    expect(enemySpriteUrl("debuffer")).toBe("assets/third-party/tiny-creatures/Tiles/tile_0067.png");
  });
});

describe("ALL_ENEMY_ARCHETYPES", () => {
  it("covers exactly the 3 shipped archetypes, for a preload() loop to iterate", () => {
    expect(ALL_ENEMY_ARCHETYPES).toEqual(["melee", "ranged", "debuffer"]);
  });
});

describe("monster visual roster", () => {
  it("looks up a compatibility sprite without inventing an element presentation", () => {
    const neutralLookup = characterArt as typeof characterArt & {
      monsterSprite?: (id: string) => unknown;
    };

    expect(neutralLookup.monsterSprite).toBeTypeOf("function");
    expect(neutralLookup.monsterSprite?.("monster_m01")).toEqual({
      key: "monster-monster_m01",
      url: "assets/third-party/tiny-creatures/Tiles/tile_0128.png"
    });
  });

  it("preloads every registry visual from an already-committed Tiny Creatures tile", () => {
    const expectedIds = [
      "monster_m01", "monster_m02", "monster_m03", "monster_m04",
      "monster_r01", "monster_r02", "monster_r03", "monster_r04",
      "monster_d01", "monster_d02", "monster_d03", "monster_d04",
      "monster_boss_01"
    ];

    expect(characterArt.MONSTER_VISUAL_IDS).toEqual(expectedIds);

    for (const id of expectedIds) {
      const visual = characterArt.monsterVisual(id, "fire");
      expect(visual.key).toBe(MONSTER_REGISTRY[id].spriteKey);
      expect(visual.url).toMatch(/^assets\/third-party\/tiny-creatures\/Tiles\/tile_\d{4}\.png$/);
      expect(existsSync(resolve("public", visual.url))).toBe(true);
      expect(visual.outline.color).toBe(0x14161f);
      expect(visual.outline.channel).toBe("neutral-outline");
    }
  });

  it("derives a unique non-color motif from the explicit wave element", () => {
    const expected = {
      fire: { accentColor: 0xe05252, motif: "flame-spikes" },
      ice: { accentColor: 0x8dd8ff, motif: "ice-crystal" },
      earth: { accentColor: 0x9e7a4f, motif: "earth-corners" },
      lightning: { accentColor: 0xf4c430, motif: "lightning-zigzag" }
    } as const;

    for (const [element, presentation] of Object.entries(expected)) {
      const visual = characterArt.monsterVisual("monster_m01", element as keyof typeof expected);
      expect(visual.accentColor).toBe(presentation.accentColor);
      expect(visual.motif).toBe(presentation.motif);
      expect(visual.accentChannel).toBe("wave-element");
    }
    expect(new Set(Object.values(expected).map((presentation) => presentation.motif)).size).toBe(4);
  });

  it("defines large filled silhouette-adjacent badges with unique geometry at normal scale", () => {
    const badges = Object.values(characterArt.ELEMENTAL_BADGE_PRESENTATION);
    expect(badges).toHaveLength(4);
    expect(new Set(badges.map((badge) => badge.shape)).size).toBe(4);
    for (const badge of badges) {
      expect(badge.regularDiameter).toBeGreaterThanOrEqual(16);
      expect(badge.bossDiameter).toBeGreaterThan(badge.regularDiameter);
      expect(badge.fillChannel).toBe("filled-non-color-motif");
    }
  });
});
