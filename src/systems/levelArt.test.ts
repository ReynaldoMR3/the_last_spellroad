import { describe, expect, it } from "vitest";
import {
  ALL_LEVELS,
  computeTilemapOffset,
  isValidLevel,
  levelMapKey,
  levelMapUrl,
  movementBlockerRectFromTiledObject,
  tileBlocksMovement
} from "./levelArt";

describe("levelMapKey / levelMapUrl — level number to Tiled JSON asset identity", () => {
  it("produces a distinct cache key per level", () => {
    expect(levelMapKey(1)).toBe("level-art-1");
    expect(levelMapKey(5)).toBe("level-art-5");
    expect(levelMapKey(1)).not.toBe(levelMapKey(2));
  });

  it("points at the file path Tilesmith's #28 entry documents (public/assets/levels/level-N.json, N=1..5)", () => {
    expect(levelMapUrl(1)).toBe("assets/levels/level-1.json");
    expect(levelMapUrl(5)).toBe("assets/levels/level-5.json");
  });
});

describe("ALL_LEVELS / isValidLevel", () => {
  it("covers exactly the 5 shipped levels (4 regular + 1 boss), matching WaveDefinition.level", () => {
    expect(ALL_LEVELS).toEqual([1, 2, 3, 4, 5]);
  });

  it("accepts 1-5 and rejects everything else", () => {
    for (const level of ALL_LEVELS) {
      expect(isValidLevel(level)).toBe(true);
    }
    expect(isValidLevel(0)).toBe(false);
    expect(isValidLevel(6)).toBe(false);
    expect(isValidLevel(-1)).toBe(false);
    expect(isValidLevel(2.5)).toBe(false);
  });
});

describe("computeTilemapOffset — aligning a level's Tiled layout to the live lane geometry", () => {
  it("centers a Levels-1-4-sized map (960x288) horizontally on a 960-wide canvas and on the lane's y=270 midline", () => {
    const offset = computeTilemapOffset({
      canvasWidth: 960,
      laneCenterY: 270,
      mapWidthPx: 960,
      mapHeightPx: 288
    });
    expect(offset.x).toBe(0);
    expect(offset.y).toBe(126);
  });

  it("centers the taller boss-arena map (960x320) on the same midline, producing a different y than the regular levels", () => {
    const offset = computeTilemapOffset({
      canvasWidth: 960,
      laneCenterY: 270,
      mapWidthPx: 960,
      mapHeightPx: 320
    });
    expect(offset.x).toBe(0);
    expect(offset.y).toBe(110);
  });

  it("horizontally centers a map narrower than the canvas instead of assuming they're always equal", () => {
    const offset = computeTilemapOffset({
      canvasWidth: 960,
      laneCenterY: 270,
      mapWidthPx: 800,
      mapHeightPx: 288
    });
    expect(offset.x).toBe(80);
  });
});

describe("Tiled movement collision contract", () => {
  it("keeps shipped floor surfaces walkable while treating every shipped gray wall segment as blocking", () => {
    for (const floorIndex of [1, 13, 25, 49]) {
      expect(tileBlocksMovement({ index: floorIndex })).toBe(false);
    }
    for (const wallIndex of [37, 38, 39]) {
      expect(tileBlocksMovement({ index: wallIndex })).toBe(true);
    }
  });

  it("treats every wall-integrated relief, threshold, brazier, and door tile as solid", () => {
    for (const wallDecorationIndex of [20, 21, 22, 23, 24, 30, 33, 34, 35, 36]) {
      expect(tileBlocksMovement({ index: wallDecorationIndex })).toBe(true);
    }
  });

  it("uses explicit blocksMovement metadata instead of assuming every decoration is solid", () => {
    expect(tileBlocksMovement({ index: 64 })).toBe(false);
    expect(tileBlocksMovement({ index: 64, properties: { blocksMovement: true } })).toBe(true);
    expect(tileBlocksMovement({ index: 37, properties: { blocksMovement: false } })).toBe(false);
  });

  it("turns a marked Tiled rectangle into a world-space blocker using the rendered map offset", () => {
    expect(
      movementBlockerRectFromTiledObject(
        {
          id: 12,
          name: "Closed door",
          x: 320,
          y: 96,
          width: 16,
          height: 32,
          properties: [{ name: "blocksMovement", value: true }]
        },
        { x: 0, y: 126 }
      )
    ).toEqual({ x: 320, y: 222, width: 16, height: 32 });
  });

  it("ignores unmarked decorative objects and rejects marked shapes without rectangular physics", () => {
    expect(
      movementBlockerRectFromTiledObject(
        { id: 13, name: "Banner", x: 100, y: 40, width: 16, height: 16 },
        { x: 0, y: 126 }
      )
    ).toBeNull();

    expect(() =>
      movementBlockerRectFromTiledObject(
        {
          id: 14,
          name: "Angled door",
          x: 200,
          y: 60,
          width: 16,
          height: 32,
          rotation: 15,
          properties: { blocksMovement: true }
        },
        { x: 0, y: 126 }
      )
    ).toThrow(/axis-aligned rectangle/);
  });
});
