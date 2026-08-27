import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  ALL_LEVELS,
  computeLevelLaneBounds,
  computeTilemapOffset,
  isValidLevel,
  levelMapKey,
  levelMapUrl,
  movementBlockerRectFromTiledObject,
  tileBlocksMovement
} from "./levelArt";

interface TiledLevel {
  width: number;
  height: number;
  layers: Array<{ data: number[] }>;
}

function readLevel(level: number): TiledLevel {
  return JSON.parse(readFileSync(new URL(`../../public/assets/levels/level-${level}.json`, import.meta.url), "utf8")) as TiledLevel;
}

function row(level: TiledLevel, rowIndex: number): number[] {
  return level.layers[0].data.slice(rowIndex * level.width, (rowIndex + 1) * level.width);
}

function tileAt(level: TiledLevel, x: number, y: number): number {
  return level.layers[0].data[y * level.width + x];
}

const LEVEL_1_WALL_ROWS = [
  [37, 38, 38, 38, 30, 38, 38, 23, 38, 38, 38, 38, 30, 38, 38, 38, 38, 38, 38, 23, 30, 38, 38, 38, 38, 38, 38, 38, 30, 38, 38, 38, 23, 38, 38, 38, 30, 38, 38, 38, 38, 38, 38, 38, 30, 38, 23, 38, 38, 38, 38, 38, 30, 38, 38, 23, 38, 38, 38, 39],
  [13, 13, 25, 25, 13, 13, 13, 13, 13, 25, 25, 13, 13, 13, 13, 13, 13, 25, 25, 13, 13, 13, 13, 13, 13, 25, 25, 13, 13, 13, 13, 13, 13, 13, 25, 25, 13, 13, 13, 13, 13, 13, 25, 25, 13, 13, 13, 13, 13, 13, 25, 25, 13, 13, 13, 13, 13, 25, 25, 13],
  [13, 13, 25, 25, 13, 13, 13, 13, 13, 25, 25, 13, 13, 13, 13, 13, 13, 25, 25, 13, 13, 13, 13, 13, 13, 25, 25, 13, 13, 13, 13, 13, 13, 13, 25, 25, 13, 13, 13, 13, 13, 13, 25, 25, 13, 13, 13, 13, 13, 13, 25, 25, 13, 13, 13, 13, 13, 25, 25, 13],
  [37, 38, 38, 38, 30, 38, 38, 38, 38, 38, 38, 38, 30, 38, 38, 38, 38, 38, 38, 38, 30, 38, 38, 38, 38, 38, 38, 38, 30, 38, 38, 38, 38, 38, 38, 38, 30, 38, 38, 38, 38, 38, 38, 38, 30, 38, 38, 38, 38, 38, 38, 38, 30, 38, 38, 38, 38, 38, 38, 39]
];

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

describe("level wall frame", () => {
  it("keeps the regular-level top and bottom wall rows identical to Level 1", () => {
    const level1 = readLevel(1);
    const referenceRows = [0, 1, level1.height - 2, level1.height - 1].map((index) => row(level1, index));
    expect(referenceRows).toEqual(LEVEL_1_WALL_ROWS);

    for (const levelNumber of [2, 3, 4]) {
      const level = readLevel(levelNumber);
      expect(level.height).toBe(level1.height);
      expect([0, 1, level.height - 2, level.height - 1].map((index) => row(level, index))).toEqual(referenceRows);
    }
  });

  it("keeps the Level 1 wall motif on the boss arena's lower frame", () => {
    const level1 = readLevel(1);
    const boss = readLevel(5);
    expect(boss.height).toBe(level1.height + 2);
    expect([boss.height - 2, boss.height - 1].map((index) => row(boss, index))).toEqual([
      row(level1, level1.height - 2),
      row(level1, level1.height - 1)
    ]);
  });

  it("turns the boss arena's top four rows into a deep wall with one centered two-sided entrance", () => {
    const boss = readLevel(5);
    const topWall = [0, 1, 2, 3].flatMap((rowIndex) => row(boss, rowIndex));

    expect(topWall).not.toContain(1);
    expect(topWall).not.toContain(13);
    expect(topWall).not.toContain(25);
    expect(topWall.filter((gid) => gid === 23)).toHaveLength(1);
    expect(topWall.filter((gid) => gid === 24)).toHaveLength(1);
    expect(tileAt(boss, 29, 3)).toBe(23);
    expect(tileAt(boss, 30, 3)).toBe(24);
  });

  it("keeps the Level 5 dais and pillars inside the wall frame", () => {
    const boss = readLevel(5);

    expect(tileAt(boss, 22, 8)).toBe(43);
    expect(tileAt(boss, 24, 9)).toBe(49);
    expect(tileAt(boss, 4, 10)).toBe(50);
    expect(tileAt(boss, 6, 10)).toBe(51);
  });

  it("adds symmetrical final-arena columns and magical basins around the existing dais", () => {
    const boss = readLevel(5);

    for (const [x, y] of [
      [14, 7],
      [45, 7],
      [14, 14],
      [45, 14]
    ]) {
      expect(tileAt(boss, x, y)).toBe(43);
    }
    for (const [x, y] of [
      [18, 6],
      [41, 6],
      [18, 15],
      [41, 15]
    ]) {
      expect(tileAt(boss, x, y)).toBe(33);
    }
  });

  it("leaves the four removed prop locations as plain floor", () => {
    const boss = readLevel(5);

    expect(tileAt(boss, 12, 5)).toBe(1);
    expect(tileAt(boss, 47, 5)).toBe(1);
    expect(tileAt(boss, 12, 15)).toBe(1);
    expect(tileAt(boss, 47, 15)).toBe(1);
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

describe("computeLevelLaneBounds — matching movement space to the visible wall depth", () => {
  const baseLane = { x: 0, y: 130, width: 960, height: 280 };

  it("leaves regular levels on the original lane bounds", () => {
    expect(computeLevelLaneBounds(1, baseLane)).toEqual(baseLane);
    expect(computeLevelLaneBounds(4, baseLane)).toEqual(baseLane);
  });

  it("moves Level 5's upper boundary to the first floor row while preserving its lower boundary", () => {
    const bossLane = computeLevelLaneBounds(5, baseLane);

    expect(bossLane).toEqual({ x: 0, y: 174, width: 960, height: 236 });
    expect(bossLane.y + bossLane.height).toBe(baseLane.y + baseLane.height);
  });
});
