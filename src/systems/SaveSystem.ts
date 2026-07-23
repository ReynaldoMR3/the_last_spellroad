import type { MasteryTier } from "../data/types";

const SAVE_KEY = "spellroad-save";
/** First concrete schema implementation (backlog task 1.6's "save schema v2" — the GDD only described the design before this). */
const SCHEMA_VERSION = 1;

export interface SaveBlob {
  schemaVersion: number;
  discoveredSpellIds: string[];
  masteryBySpell: Record<string, { tier: MasteryTier; landedCasts: number }>;
  hierarchyRank: number;
  hexcoinBalance: number;
  loreFlags: string[];
  /**
   * Whatever checkpoint id the engine currently tracks the mage as being at. This field
   * only stores that id — it does NOT decide checkpoint/respawn *placement* policy
   * (does a death respawn before or after the pre-boss waves, do those re-award
   * Hexcoin on retry). That's backlog item 0.2, still an open developer decision.
   */
  checkpointId: string | null;
}

export function defaultSave(): SaveBlob {
  return {
    schemaVersion: SCHEMA_VERSION,
    discoveredSpellIds: [],
    masteryBySpell: {},
    hierarchyRank: 0,
    hexcoinBalance: 0,
    loreFlags: [],
    checkpointId: null
  };
}

/** Schema-version mismatch triggers a clean reset (Save Data And Persistence, GDD) — no silent migration attempt. */
export function loadSave(storage: Storage = localStorage): SaveBlob {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) {
    return defaultSave();
  }
  try {
    const parsed = JSON.parse(raw) as SaveBlob;
    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      storage.removeItem(SAVE_KEY);
      return defaultSave();
    }
    return parsed;
  } catch {
    storage.removeItem(SAVE_KEY);
    return defaultSave();
  }
}

export function writeSave(blob: SaveBlob, storage: Storage = localStorage): void {
  storage.setItem(SAVE_KEY, JSON.stringify({ ...blob, schemaVersion: SCHEMA_VERSION }));
}
