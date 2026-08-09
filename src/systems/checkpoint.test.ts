import { describe, expect, it } from "vitest";
import { composeCheckpointBlob, resolveStartWaveIndex } from "./checkpoint";
import { defaultSave } from "./SaveSystem";
import type { WaveDefinition } from "../data/types";

/**
 * Final branch review finding #1/#6 — `writeCheckpoint()` (SpellroadScene.ts) used to write
 * `hexcoinBalance` from every call site, including the Mastery tier-up one, which could stamp a
 * mid-level balance (above the level floor) as the saved value; restoring that on `Continue`
 * ratchets the Hexcoin floor upward indefinitely across quit/continue cycles. `hexcoinBalance` is
 * now only genuinely a floor at the level-start and post-death-rollback call sites, so this pure
 * function makes that omission explicit and testable instead of inlined and unverified.
 */
describe("composeCheckpointBlob", () => {
  it("overlays masteryBySpell/checkpointId/hexcoinBalance onto the base blob when a balance is given", () => {
    const base = { ...defaultSave(), discoveredSpellIds: ["ember_lance"], hexcoinBalance: 999 };
    const blob = composeCheckpointBlob(base, { ember_lance: { tier: "adept", landedCasts: 3 } }, "2", 40);

    expect(blob).toEqual({
      ...base,
      masteryBySpell: { ember_lance: { tier: "adept", landedCasts: 3 } },
      checkpointId: "2",
      hexcoinBalance: 40
    });
  });

  it("leaves the base blob's hexcoinBalance untouched when the balance argument is omitted (the tier-up call site)", () => {
    const base = { ...defaultSave(), hexcoinBalance: 999 };
    const blob = composeCheckpointBlob(base, { ember_lance: { tier: "adept", landedCasts: 3 } }, "2");

    expect(blob.hexcoinBalance).toBe(999);
    expect(blob.masteryBySpell).toEqual({ ember_lance: { tier: "adept", landedCasts: 3 } });
    expect(blob.checkpointId).toBe("2");
  });

  it("preserves every other base field untouched (discoveredSpellIds/hierarchyRank/loreFlags pass-through)", () => {
    const base = { ...defaultSave(), discoveredSpellIds: ["frost_bolt"], hierarchyRank: 3, loreFlags: ["intro"] };
    const blob = composeCheckpointBlob(base, {}, null, 0);

    expect(blob.discoveredSpellIds).toEqual(["frost_bolt"]);
    expect(blob.hierarchyRank).toBe(3);
    expect(blob.loreFlags).toEqual(["intro"]);
  });

  it("writes a null checkpointId as-is (no active wave)", () => {
    const base = defaultSave();
    const blob = composeCheckpointBlob(base, {}, null, 0);
    expect(blob.checkpointId).toBeNull();
  });
});

describe("resolveStartWaveIndex", () => {
  const waves: WaveDefinition[] = [
    { level: 1, wave_index: 0, enemies: [], hp_modifier: 1, damage_modifier: 1, is_boss: false },
    { level: 1, wave_index: 1, enemies: [], hp_modifier: 1, damage_modifier: 1, is_boss: false },
    { level: 2, wave_index: 0, enemies: [], hp_modifier: 1, damage_modifier: 1, is_boss: false }
  ];

  it("returns 0 for a fresh game (checkpointLevel is null)", () => {
    expect(resolveStartWaveIndex(waves, null)).toBe(0);
  });

  it("returns the index of the first wave matching the checkpointed level", () => {
    expect(resolveStartWaveIndex(waves, 2)).toBe(2);
  });

  it("falls back to 0 when the checkpointed level isn't found in the waves array (findIndex returns -1)", () => {
    expect(resolveStartWaveIndex(waves, 99)).toBe(0);
  });
});
