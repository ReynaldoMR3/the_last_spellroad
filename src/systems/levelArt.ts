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
 * Tiled's semantic movement flag. It may live on a tileset tile (Phaser exposes it through
 * `Tile.properties`) or on an object in any object layer. Layer names remain presentation
 * concerns: a tile in `Decorations` is not solid merely because it is decorative.
 */
export const BLOCKS_MOVEMENT_PROPERTY = "blocksMovement";
export const DESTRUCTIBLE_COVER_PROPERTY = "destructibleCover";
export const COVER_HP_PROPERTY = "coverHp";

/** Existing maps predate semantic Tiled properties. GIDs 37/38/39 are the left, seamless
 * middle, and right pieces of the solid gray wall; the paired GIDs 23/35 form a closed chamber
 * door and intentionally retain wall collision. Floor GIDs 1, 13, and 49 stay absent. */
const SHIPPED_BLOCKING_TILE_INDICES = new Set([23, 35, 37, 38, 39]);

export type TiledPropertyBag =
  | Readonly<Record<string, unknown>>
  | ReadonlyArray<{ name: string; value: unknown }>
  | null
  | undefined;

export interface MovementTileInput {
  index: number;
  properties?: TiledPropertyBag;
}

export interface TiledMovementObject {
  id?: number;
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  gid?: number;
  ellipse?: unknown;
  polygon?: unknown;
  polyline?: unknown;
  properties?: TiledPropertyBag;
}

export interface MovementBlockerRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DestructibleCoverMetadata {
  objectId: number;
  coverHp: number;
  rect: MovementBlockerRect;
}

function tiledProperty(properties: TiledPropertyBag, name: string): unknown {
  if (Array.isArray(properties)) {
    return properties.find((property) => property.name === name)?.value;
  }
  if (properties && typeof properties === "object") {
    return (properties as Readonly<Record<string, unknown>>)[name];
  }
  return undefined;
}

function explicitBlocksMovement(properties: TiledPropertyBag): boolean | undefined {
  const value = tiledProperty(properties, BLOCKS_MOVEMENT_PROPERTY);
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw new Error(`Tiled property ${BLOCKS_MOVEMENT_PROPERTY} must be boolean`);
  }
  return value;
}

function explicitDestructibleCover(properties: TiledPropertyBag): boolean | undefined {
  const value = tiledProperty(properties, DESTRUCTIBLE_COVER_PROPERTY);
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw new Error(`Tiled property ${DESTRUCTIBLE_COVER_PROPERTY} must be boolean`);
  }
  return value;
}

function tiledObjectLabel(object: TiledMovementObject): string {
  return object.name ? `"${object.name}"` : `#${object.id ?? "unknown"}`;
}

/** True when this tile should stop movement, independent of which visual layer contains it. */
export function tileBlocksMovement({ index, properties }: MovementTileInput): boolean {
  return explicitBlocksMovement(properties) ?? SHIPPED_BLOCKING_TILE_INDICES.has(index);
}

/**
 * Converts an explicitly blocking Tiled rectangle object into the world-space bounds used by
 * Arcade Physics. Unmarked objects are presentation-only. More complex geometry is rejected
 * loudly so a future map cannot silently promise collision the engine does not implement.
 */
export function movementBlockerRectFromTiledObject(
  object: TiledMovementObject,
  offset: TilemapOffset
): MovementBlockerRect | null {
  if (explicitBlocksMovement(object.properties) !== true) {
    return null;
  }

  const isAxisAlignedRectangle =
    object.gid === undefined &&
    object.ellipse === undefined &&
    object.polygon === undefined &&
    object.polyline === undefined &&
    (object.rotation ?? 0) === 0 &&
    Number.isFinite(object.x) &&
    Number.isFinite(object.y) &&
    Number.isFinite(object.width) &&
    Number.isFinite(object.height) &&
    (object.width ?? 0) > 0 &&
    (object.height ?? 0) > 0;

  if (!isAxisAlignedRectangle) {
    throw new Error(`Tiled movement blocker ${tiledObjectLabel(object)} must be an axis-aligned rectangle`);
  }

  return {
    x: offset.x + object.x!,
    y: offset.y + object.y!,
    width: object.width!,
    height: object.height!
  };
}

/**
 * Parses the stricter metadata contract for destructible blocking objects. Ordinary movement
 * blockers return `null` and continue through `movementBlockerRectFromTiledObject` unchanged.
 */
export function destructibleCoverMetadataFromTiledObject(
  object: TiledMovementObject,
  offset: TilemapOffset
): DestructibleCoverMetadata | null {
  if (explicitDestructibleCover(object.properties) !== true) {
    return null;
  }

  const label = tiledObjectLabel(object);
  if (explicitBlocksMovement(object.properties) !== true) {
    throw new Error(`Tiled destructible cover ${label} must set ${BLOCKS_MOVEMENT_PROPERTY} to true`);
  }

  const coverHp = tiledProperty(object.properties, COVER_HP_PROPERTY);
  if (typeof coverHp !== "number" || !Number.isFinite(coverHp) || coverHp <= 0) {
    throw new Error(`Tiled destructible cover ${label} ${COVER_HP_PROPERTY} must be a positive finite number`);
  }

  if (!Number.isInteger(object.id) || (object.id ?? 0) <= 0) {
    throw new Error(`Tiled destructible cover ${label} must have a positive integer object id`);
  }

  const rect = movementBlockerRectFromTiledObject(object, offset);
  if (!rect) {
    throw new Error(`Tiled destructible cover ${label} must also block movement`);
  }

  return {
    objectId: object.id!,
    coverHp,
    rect
  };
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
