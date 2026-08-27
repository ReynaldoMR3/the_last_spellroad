import type { MasteryTier } from "../data/types";

const SAVE_KEY = "spellroad-save";
export const SAVE_SCHEMA_VERSION = 2;

export interface SaveBlob {
  schemaVersion: number;
  discoveredSpellIds: string[];
  masteryBySpell: Record<string, { tier: MasteryTier; landedCasts: number }>;
  hierarchyRank: number;
  hexcoinBalance: number;
  hexcoinLevelStartBalance: number;
  loreFlags: string[];
  /**
   * Whatever checkpoint id the engine currently tracks the mage as being at. This field
   * only stores that id — it does NOT decide checkpoint/respawn *placement* policy.
   * Backlog 0.2 resolved that policy on 2026-08-01 (first wave of the current level;
   * retry gains roll back to the level-start floor). GitHub #144 owns wiring this field
   * and the rest of the blob into gameplay.
   */
  checkpointId: string | null;
}

export type SaveLoadResult =
  | { kind: "loaded"; save: SaveBlob }
  | { kind: "missing"; save: SaveBlob }
  | { kind: "reset"; reason: "malformed" | "schema-mismatch" | "invalid-shape"; save: SaveBlob };

export function defaultSave(): SaveBlob {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    discoveredSpellIds: [],
    masteryBySpell: {},
    hierarchyRank: 0,
    hexcoinBalance: 0,
    hexcoinLevelStartBalance: 0,
    loreFlags: [],
    checkpointId: null
  };
}

/** backlog 5.8 — Title scene's "Continue" vs. "New Game only" choice (see the 2026-08-01
 * boot-title-pause design spec) needs to know whether a save exists at all, distinct from
 * `loadSave`'s default-bearing result. A raw key check means a stale-schema blob still
 * correctly reports "yes, something is there" until `loadSave` clears it. */
export function hasSave(storage: Storage = localStorage): boolean {
  return storage.getItem(SAVE_KEY) !== null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isMasteryTier(value: unknown): value is MasteryTier {
  return value === "novice" || value === "adept" || value === "master";
}

function isMasteryBySpell(value: unknown): value is SaveBlob["masteryBySpell"] {
  return isRecord(value) && Object.values(value).every(
    (entry) => isRecord(entry) && isMasteryTier(entry.tier) && isNonNegativeSafeInteger(entry.landedCasts)
  );
}

function isSaveBlob(value: unknown): value is SaveBlob {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.schemaVersion === SAVE_SCHEMA_VERSION &&
    isStringArray(value.discoveredSpellIds) &&
    isMasteryBySpell(value.masteryBySpell) &&
    isNonNegativeSafeInteger(value.hierarchyRank) &&
    isNonNegativeSafeInteger(value.hexcoinBalance) &&
    isNonNegativeSafeInteger(value.hexcoinLevelStartBalance) &&
    isStringArray(value.loreFlags) &&
    (typeof value.checkpointId === "string" || value.checkpointId === null)
  );
}

function resetSave(
  storage: Storage,
  reason: Extract<SaveLoadResult, { kind: "reset" }>["reason"]
): SaveLoadResult {
  storage.removeItem(SAVE_KEY);
  return { kind: "reset", reason, save: defaultSave() };
}

/** Schema-version mismatch triggers a clean reset (Save Data And Persistence, GDD) — no silent migration attempt. */
export function loadSave(storage: Storage = localStorage): SaveLoadResult {
  const raw = storage.getItem(SAVE_KEY);
  if (raw === null) {
    return { kind: "missing", save: defaultSave() };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return resetSave(storage, "invalid-shape");
    }
    if (!isFiniteNumber(parsed.schemaVersion)) {
      return resetSave(storage, "invalid-shape");
    }
    if (parsed.schemaVersion !== SAVE_SCHEMA_VERSION) {
      return resetSave(storage, "schema-mismatch");
    }
    if (!isSaveBlob(parsed)) {
      return resetSave(storage, "invalid-shape");
    }
    return { kind: "loaded", save: parsed };
  } catch {
    return resetSave(storage, "malformed");
  }
}

export function writeSave(blob: SaveBlob, storage: Storage = localStorage): void {
  storage.setItem(SAVE_KEY, JSON.stringify({ ...blob, schemaVersion: SAVE_SCHEMA_VERSION }));
}

export function clearSave(storage: Pick<Storage, "removeItem"> = localStorage): void {
  storage.removeItem(SAVE_KEY);
}
