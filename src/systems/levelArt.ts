/**
 * Level-art asset identity + placement (backlog 3.8's engine half, issue #29).
 *
 * A pure, Phaser-free module so the "which asset key/URL does level N load" and "where does
 * that art sit relative to the live lane geometry" questions are unit-testable without a
 * running Scene. `SpellroadScene.ts` is the only caller — it still owns every actual
 * `this.load.*`/`this.make.tilemap(...)` call, since that side genuinely needs Phaser.
 *
 * Source data: Tilesmith's #28 (`tilesmith/tiled-layouts-28`, PR #35) built 5 Tiled JSON maps
 * at `public/assets/levels/level-1.json`..`level-5.json` (level 5 = the boss arena, matching
 * `WaveDefinition.level` 1:1 — see `src/data/waves/boss-1.json`, `level: 5`), all referencing
 * one shared tileset image already committed under
 * `public/assets/third-party/kenney-tiny-dungeon/Tilemap/tilemap_packed.png` (12x11 tiles,
 * 16x16, `firstgid: 1`). Every map's embedded tileset is named
 * `"kenney-tiny-dungeon-tilemap_packed"` in the JSON (`tilesets[0].name`) — `addTilesetImage`
 * must be called with that exact string to match Phaser's own tileset lookup.
 */

/** Regular levels 1-4 plus the boss arena (level 5) — matches every `WaveDefinition.level`
 * value that currently exists in `src/data/waves/*.json`. */
export const ALL_LEVELS: readonly number[] = [1, 2, 3, 4, 5];

export function isValidLevel(level: number): boolean {
  return ALL_LEVELS.includes(level);
}

/** Shared tileset, loaded once regardless of how many levels use it. */
export const TILESET_IMAGE_KEY = "spellroad-tileset";
export const TILESET_IMAGE_URL = "assets/third-party/kenney-tiny-dungeon/Tilemap/tilemap_packed.png";
/** Must match `tilesets[0].name` inside every `level-N.json` exactly (Tilesmith's #28 entry,
 * 2026-08-01) — this is not a free-form label, Phaser's `addTilesetImage` looks it up by this
 * exact string against the map's embedded tileset config. */
export const TILESET_NAME_IN_MAP = "kenney-tiny-dungeon-tilemap_packed";

/** Cache key `this.load.tilemapTiledJSON(key, url)` registers a level's layout under, and
 * `this.make.tilemap({ key })` later reads it back by. */
export function levelMapKey(level: number): string {
  return `level-art-${level}`;
}

/** Static URL Vite serves the Tiled JSON from (public/assets/levels/level-N.json, per
 * Tilesmith's #28 file-path-convention note) — relative to the site root, not `src/`, so it
 * survives a production build the same way the tileset PNG already does. */
export function levelMapUrl(level: number): string {
  return `assets/levels/level-${level}.json`;
}

export interface TilemapAlignmentInput {
  /** Full render width of the scene's canvas. */
  canvasWidth: number;
  /** The y-coordinate the existing gameplay-bounds rectangle (`LANE_RECT`/`ROAD_TOP` +
   * `ROAD_HEIGHT`/2 in `SpellroadScene.ts`) is centered on — unchanged by this module, only
   * read as an input. */
  laneCenterY: number;
  /** A given level's Tiled map pixel width (`map.widthInPixels`). */
  mapWidthPx: number;
  /** A given level's Tiled map pixel height (`map.heightInPixels`). */
  mapHeightPx: number;
}

export interface TilemapOffset {
  x: number;
  y: number;
}

/**
 * Where to draw a level's tile layer so it reads as "the lane" without changing the lane's
 * actual gameplay bounds. Tilesmith's #28 maps are sized in whole 16px tile units (960x288 for
 * Levels 1-4, 960x320 for the boss arena). As of backlog 2.27 / issue #53 (2026-08-02),
 * `ROAD_WIDTH` (`SpellroadScene.ts`) was widened 780->960 to match the art's full canvas
 * width exactly, closing the horizontal half of the mismatch this comment used to describe —
 * width is now pixel-matched. Height remains an approximation (`ROAD_HEIGHT` 280 vs the maps'
 * 288/320): a deliberate, unchanged trade-off from backlog 3.8, left alone by #53 since that
 * ticket's own reported symptom ("you get stuck before reaching the end") was specifically
 * about the left/right edges, not top/bottom. This function only decides where the *art*
 * sits: it centers the map horizontally on the canvas and vertically on the same lane
 * midline movement/spawn/preview-clip geometry already uses, and leaves
 * `ROAD_WIDTH`/`ROAD_HEIGHT`/`LANE_RECT` themselves untouched — those stay the actual
 * gameplay-bounds source of truth, per this ticket's own instructions.
 */
export function computeTilemapOffset({
  canvasWidth,
  laneCenterY,
  mapWidthPx,
  mapHeightPx
}: TilemapAlignmentInput): TilemapOffset {
  return {
    x: (canvasWidth - mapWidthPx) / 2,
    y: laneCenterY - mapHeightPx / 2
  };
}
