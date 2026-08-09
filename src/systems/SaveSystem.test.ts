import { describe, expect, it } from "vitest";
import { defaultSave, hasSave, loadSave, writeSave, type SaveBlob } from "./SaveSystem";

/** In-memory Storage stand-in — every SaveSystem function accepts an injected `Storage`,
 * so tests never touch a real browser `localStorage`. */
class FakeStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe("SaveSystem", () => {
  it("reports no save when nothing has been written", () => {
    const storage = new FakeStorage();
    expect(hasSave(storage)).toBe(false);
  });

  it("reports a save exists once something is written", () => {
    const storage = new FakeStorage();
    writeSave(defaultSave(), storage);
    expect(hasSave(storage)).toBe(true);
  });

  it("loadSave returns the default blob when nothing is saved", () => {
    const storage = new FakeStorage();
    expect(loadSave(storage)).toEqual(defaultSave());
  });

  it("round-trips a written save through loadSave", () => {
    const storage = new FakeStorage();
    const blob: SaveBlob = { ...defaultSave(), hexcoinBalance: 42, checkpointId: "3" };
    writeSave(blob, storage);
    expect(loadSave(storage)).toEqual(blob);
  });

  it("clean-resets on a schema-version mismatch instead of returning the stale blob", () => {
    const storage = new FakeStorage();
    writeSave(defaultSave(), storage);
    const key = storage.key(0)!;
    storage.setItem(key, JSON.stringify({ ...defaultSave(), schemaVersion: 999 }));
    expect(loadSave(storage)).toEqual(defaultSave());
    expect(hasSave(storage)).toBe(false);
  });

  it("clean-resets on unparseable JSON instead of throwing", () => {
    const storage = new FakeStorage();
    writeSave(defaultSave(), storage);
    const key = storage.key(0)!;
    storage.setItem(key, "{not json");
    expect(loadSave(storage)).toEqual(defaultSave());
  });
});
