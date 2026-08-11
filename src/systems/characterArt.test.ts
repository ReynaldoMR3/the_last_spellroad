import { describe, expect, it } from "vitest";
import { ALL_ENEMY_ARCHETYPES, MAGE_SPRITE_KEY, MAGE_SPRITE_URL, enemySpriteKey, enemySpriteUrl } from "./characterArt";

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
