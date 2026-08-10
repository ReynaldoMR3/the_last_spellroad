import { describe, expect, it } from "vitest";
import type { WaveDefinition } from "../data/types";
import type { SaveBlob, SaveLoadResult } from "./SaveSystem";
import {
  buildSaveBlob,
  prepareGameProgress,
  type PersistentMetadata
} from "./gameProgress";

const SPELL_IDS = ["arc_lance", "ember_orb", "verdant_grasp"];

const WAVES: WaveDefinition[] = [
  { level: 1, wave_index: 0, enemies: [], hp_modifier: 1, damage_modifier: 1 },
  { level: 1, wave_index: 1, enemies: [], hp_modifier: 1, damage_modifier: 1 },
  { level: 2, wave_index: 0, enemies: [], hp_modifier: 1, damage_modifier: 1 },
  { level: 3, wave_index: 0, enemies: [], hp_modifier: 1, damage_modifier: 1 },
  { level: 3, wave_index: 1, enemies: [], hp_modifier: 1, damage_modifier: 1 }
];

function savedProgress(overrides: Partial<SaveBlob> = {}): SaveBlob {
  return {
    schemaVersion: 2,
    discoveredSpellIds: ["arc_lance", "ember_orb"],
    masteryBySpell: {
      arc_lance: { tier: "adept", landedCasts: 12 },
      ember_orb: { tier: "master", landedCasts: 3 }
    },
    hierarchyRank: 4,
    hexcoinBalance: 71,
    hexcoinLevelStartBalance: 50,
    loreFlags: ["met-director", "opened-gate"],
    checkpointId: "level:3",
    ...overrides
  };
}

function loaded(save: SaveBlob): SaveLoadResult {
  return { kind: "loaded", save };
}

describe("prepareGameProgress", () => {
  it("starts a new game with every current spell discovered at novice mastery", () => {
    const progress = prepareGameProgress({ mode: "new" }, SPELL_IDS, WAVES);

    expect(progress).toEqual({
      startWaveIndex: 0,
      checkpointLevel: 1,
      discoveredSpellIds: ["arc_lance", "ember_orb", "verdant_grasp"],
      masteryBySpell: {
        arc_lance: { tier: "novice", landedCasts: 0 },
        ember_orb: { tier: "novice", landedCasts: 0 },
        verdant_grasp: { tier: "novice", landedCasts: 0 }
      },
      hexcoin: { balance: 0, levelStartBalance: 0 },
      metadata: { hierarchyRank: 0, loreFlags: [] },
      resetNotice: null
    });
  });

  it("continues from the first wave of the saved level while preserving persistent state", () => {
    const progress = prepareGameProgress({ mode: "continue", load: loaded(savedProgress()) }, SPELL_IDS, WAVES);

    expect(progress).toEqual({
      startWaveIndex: 3,
      checkpointLevel: 3,
      discoveredSpellIds: ["arc_lance", "ember_orb"],
      masteryBySpell: {
        arc_lance: { tier: "adept", landedCasts: 12 },
        ember_orb: { tier: "master", landedCasts: 3 }
      },
      hexcoin: { balance: 71, levelStartBalance: 50 },
      metadata: { hierarchyRank: 4, loreFlags: ["met-director", "opened-gate"] },
      resetNotice: null
    });
  });

  it("drops removed spell ids from the discovered catalog and Mastery state", () => {
    const progress = prepareGameProgress(
      { mode: "continue", load: loaded(savedProgress({
        discoveredSpellIds: ["arc_lance", "removed_spell"],
        masteryBySpell: {
          arc_lance: { tier: "adept", landedCasts: 12 },
          removed_spell: { tier: "master", landedCasts: 1 }
        }
      })) },
      ["arc_lance", "verdant_grasp"],
      WAVES
    );

    expect(progress.discoveredSpellIds).toEqual(["arc_lance"]);
    expect(progress.masteryBySpell).toEqual({ arc_lance: { tier: "adept", landedCasts: 12 } });
  });

  it.each([
    ["malformed", "unreadable save reset"],
    ["schema-mismatch", "incompatible save reset"]
  ] as const)("resets %s saves to new-game defaults with the correct one-time notice", (reason, resetNotice) => {
    const progress = prepareGameProgress(
      { mode: "continue", load: { kind: "reset", reason, save: savedProgress() } },
      SPELL_IDS,
      WAVES
    );

    expect(progress).toMatchObject({
      startWaveIndex: 0,
      checkpointLevel: 1,
      discoveredSpellIds: ["arc_lance", "ember_orb", "verdant_grasp"],
      masteryBySpell: {
        arc_lance: { tier: "novice", landedCasts: 0 },
        ember_orb: { tier: "novice", landedCasts: 0 },
        verdant_grasp: { tier: "novice", landedCasts: 0 }
      },
      hexcoin: { balance: 0, levelStartBalance: 0 },
      metadata: { hierarchyRank: 0, loreFlags: [] },
      resetNotice
    });
  });

  it("falls back to Level 1's first wave when the saved checkpoint is unknown", () => {
    const progress = prepareGameProgress(
      { mode: "continue", load: loaded(savedProgress({ checkpointId: "level:99" })) },
      SPELL_IDS,
      WAVES
    );

    expect(progress.startWaveIndex).toBe(0);
    expect(progress.checkpointLevel).toBe(1);
  });

  it("does not interpret legacy or malformed checkpoint formats as a level", () => {
    const progress = prepareGameProgress(
      { mode: "continue", load: loaded(savedProgress({ checkpointId: "level-3-wave-1" })) },
      SPELL_IDS,
      WAVES
    );

    expect(progress.startWaveIndex).toBe(0);
    expect(progress.checkpointLevel).toBe(1);
  });
});

describe("buildSaveBlob", () => {
  it("keeps discovery and Mastery keysets distinct while preserving metadata and Hexcoin balances", () => {
    const metadata: PersistentMetadata = {
      hierarchyRank: 4,
      loreFlags: ["met-director", "opened-gate"]
    };
    const discoveredSpellIds = ["arc_lance", "discovery_only"];

    const save = buildSaveBlob(
      metadata,
      discoveredSpellIds,
      {
        arc_lance: { tier: "adept", landedCasts: 12 },
        mastery_only: { tier: "novice", landedCasts: 0 }
      },
      { balance: 71, levelStartBalance: 50 },
      3
    );

    discoveredSpellIds.push("later_discovery");

    expect(save).toEqual({
      schemaVersion: 2,
      discoveredSpellIds: ["arc_lance", "discovery_only"],
      masteryBySpell: {
        arc_lance: { tier: "adept", landedCasts: 12 },
        mastery_only: { tier: "novice", landedCasts: 0 }
      },
      hierarchyRank: 4,
      hexcoinBalance: 71,
      hexcoinLevelStartBalance: 50,
      loreFlags: ["met-director", "opened-gate"],
      checkpointId: "level:3"
    });
  });
});
