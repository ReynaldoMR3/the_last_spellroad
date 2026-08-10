import { describe, expect, it } from "vitest";
import { clearSave, hasSave, loadSave, writeSave, type SaveBlob } from "./SaveSystem";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  constructor(entries: Iterable<readonly [string, string]> = []) {
    for (const [key, value] of entries) {
      this.values.set(key, value);
    }
  }

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function populatedSave(): SaveBlob {
  return {
    schemaVersion: 2,
    discoveredSpellIds: ["arc_lance"],
    masteryBySpell: { arc_lance: { tier: "adept", landedCasts: 12 } },
    hierarchyRank: 3,
    hexcoinBalance: 42,
    hexcoinLevelStartBalance: 20,
    loreFlags: ["met-director"],
    checkpointId: "level-2-wave-1"
  };
}

function seeded(save: unknown): MemoryStorage {
  return new MemoryStorage([["spellroad-save", JSON.stringify(save)]]);
}

const persistedNumericFields = [
  {
    name: "hierarchyRank",
    saveWith: (value: number) => ({ ...populatedSave(), hierarchyRank: value })
  },
  {
    name: "hexcoinBalance",
    saveWith: (value: number) => ({ ...populatedSave(), hexcoinBalance: value })
  },
  {
    name: "hexcoinLevelStartBalance",
    saveWith: (value: number) => ({ ...populatedSave(), hexcoinLevelStartBalance: value })
  },
  {
    name: "masteryBySpell landedCasts",
    saveWith: (value: number) => ({
      ...populatedSave(),
      masteryBySpell: { arc_lance: { tier: "adept" as const, landedCasts: value } }
    })
  }
];

const invalidPersistedIntegers = [
  { name: "negative", value: -1 },
  { name: "fractional", value: 1.5 },
  { name: "unsafe", value: Number.MAX_SAFE_INTEGER + 1 }
];

describe("SaveSystem", () => {
  it("round-trips a schema-v2 save", () => {
    const storage = new MemoryStorage();
    const save = populatedSave();
    writeSave(save, storage);
    expect(loadSave(storage)).toEqual({ kind: "loaded", save });
  });

  it("reports a missing save with a default schema-v2 blob", () => {
    expect(loadSave(new MemoryStorage())).toEqual({
      kind: "missing",
      save: {
        schemaVersion: 2,
        discoveredSpellIds: [],
        masteryBySpell: {},
        hierarchyRank: 0,
        hexcoinBalance: 0,
        hexcoinLevelStartBalance: 0,
        loreFlags: [],
        checkpointId: null
      }
    });
  });

  it("removes malformed JSON and reports a one-time reset reason", () => {
    const storage = new MemoryStorage([["spellroad-save", "{"]]);
    expect(loadSave(storage).kind).toBe("reset");
    expect(storage.getItem("spellroad-save")).toBeNull();
  });

  it("treats an empty persisted blob as malformed rather than missing", () => {
    const storage = new MemoryStorage([["spellroad-save", ""]]);
    expect(loadSave(storage)).toMatchObject({ kind: "reset", reason: "malformed" });
    expect(storage.getItem("spellroad-save")).toBeNull();
  });

  it("removes old schema versions instead of migrating", () => {
    const storage = new MemoryStorage([["spellroad-save", JSON.stringify({ ...populatedSave(), schemaVersion: 1 })]]);
    expect(loadSave(storage)).toMatchObject({ kind: "reset", reason: "schema-mismatch" });
  });

  it("treats a missing or nonnumeric schema version as an invalid save shape", () => {
    for (const save of [
      (() => {
        const { schemaVersion: _schemaVersion, ...withoutSchemaVersion } = populatedSave();
        return withoutSchemaVersion;
      })(),
      { ...populatedSave(), schemaVersion: "2" }
    ]) {
      const storage = seeded(save);
      expect(loadSave(storage)).toMatchObject({ kind: "reset", reason: "invalid-shape" });
      expect(storage.getItem("spellroad-save")).toBeNull();
    }
  });

  it("rejects schema-v2 data with an invalid Mastery tier", () => {
    const storage = seeded({ ...populatedSave(), masteryBySpell: { arc_lance: { tier: "legend", landedCasts: 0 } } });
    expect(loadSave(storage)).toMatchObject({ kind: "reset", reason: "invalid-shape" });
  });

  it("removes a schema-v2 blob with malformed persisted fields", () => {
    const invalidSaves = [
      { ...populatedSave(), discoveredSpellIds: "arc_lance" },
      { ...populatedSave(), masteryBySpell: [] },
      { ...populatedSave(), hierarchyRank: "3" },
      { ...populatedSave(), hexcoinBalance: null },
      { ...populatedSave(), hexcoinLevelStartBalance: undefined },
      { ...populatedSave(), loreFlags: [0] },
      { ...populatedSave(), checkpointId: 2 },
      { ...populatedSave(), masteryBySpell: { arc_lance: { tier: "novice", landedCasts: "zero" } } }
    ];

    for (const invalidSave of invalidSaves) {
      const storage = seeded(invalidSave);
      expect(loadSave(storage)).toMatchObject({ kind: "reset", reason: "invalid-shape" });
      expect(storage.getItem("spellroad-save")).toBeNull();
    }
  });

  it("rejects JSON numeric overflow instead of loading an infinite balance", () => {
    const raw = JSON.stringify(populatedSave()).replace('"hexcoinBalance":42', '"hexcoinBalance":1e400');
    const storage = new MemoryStorage([["spellroad-save", raw]]);
    expect(loadSave(storage)).toMatchObject({ kind: "reset", reason: "invalid-shape" });
    expect(storage.getItem("spellroad-save")).toBeNull();
  });

  describe.each(persistedNumericFields)("$name numeric domain", ({ saveWith }) => {
    it.each(invalidPersistedIntegers)("rejects a $name value", ({ value }) => {
      const storage = seeded(saveWith(value));
      expect(loadSave(storage)).toMatchObject({ kind: "reset", reason: "invalid-shape" });
      expect(storage.getItem("spellroad-save")).toBeNull();
    });
  });

  it("allows spending below the level-start balance and Mastery progress up to the safe-integer limit", () => {
    const save: SaveBlob = {
      ...populatedSave(),
      hexcoinBalance: 5,
      hexcoinLevelStartBalance: 20,
      masteryBySpell: { arc_lance: { tier: "master", landedCasts: Number.MAX_SAFE_INTEGER } }
    };
    expect(loadSave(seeded(save))).toEqual({ kind: "loaded", save });
  });

  it("clearSave removes the blob used by hasSave", () => {
    const storage = seeded(populatedSave());
    clearSave(storage);
    expect(hasSave(storage)).toBe(false);
  });
});
