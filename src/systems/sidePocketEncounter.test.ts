import { describe, expect, it } from "vitest";
import type { WaveDefinition } from "../data/types";
import { SIDE_POCKET_ENCOUNTERS } from "../data/sidePocketEncounters";
import { HexcoinSystem } from "./HexcoinSystem";
import { evaluateSidePocketOffer, resolveSidePocketExplore } from "./sidePocketEncounter";

function wave(overrides: Partial<WaveDefinition>): WaveDefinition {
  return { level: 1, wave_index: 0, enemies: [], hp_modifier: 1, damage_modifier: 1, ...overrides };
}

const LEVEL1_FINAL = wave({ level: 1, wave_index: 1 });
const LEVEL2_FIRST = wave({ level: 2, wave_index: 0 });
const LEVEL1_NON_FINAL = wave({ level: 1, wave_index: 0 });

describe("evaluateSidePocketOffer", () => {
  it("does not offer on a non-final wave of a regular level", () => {
    const decision = evaluateSidePocketOffer(LEVEL1_NON_FINAL, LEVEL1_FINAL, []);
    expect(decision.offer).toBe(false);
  });

  it("offers on the final wave of a regular level with an undiscovered flag", () => {
    const decision = evaluateSidePocketOffer(LEVEL1_FINAL, LEVEL2_FIRST, []);
    expect(decision.offer).toBe(true);
    expect(decision.encounter?.objectName).toBe("Blank Waymark");
  });

  it("offers on the final wave of the run's last regular level too (no `next` wave at all)", () => {
    const level4Final = wave({ level: 4, wave_index: 3 });
    const bossFirst = wave({ level: 5, wave_index: 0, is_boss: true });
    expect(evaluateSidePocketOffer(level4Final, bossFirst, []).offer).toBe(true);
    // Also true if `next` is simply absent (end of the flattened wave array), same "final
    // wave of this level" definition SpellroadScene's own !next check already uses.
    expect(evaluateSidePocketOffer(level4Final, undefined, []).offer).toBe(true);
  });

  it("never offers on a boss wave, regardless of flags", () => {
    const bossPhase = wave({ level: 5, wave_index: 0, is_boss: true });
    const bossPhase2 = wave({ level: 5, wave_index: 1, is_boss: true });
    expect(evaluateSidePocketOffer(bossPhase, bossPhase2, []).offer).toBe(false);
  });

  it("never offers on Level 5 even absent an is_boss flag (no catalog entry exists for level 5)", () => {
    const level5Wave = wave({ level: 5, wave_index: 0 });
    expect(evaluateSidePocketOffer(level5Wave, undefined, []).offer).toBe(false);
  });

  it("does not offer once the level's lore flag is already discovered", () => {
    const decision = evaluateSidePocketOffer(LEVEL1_FINAL, LEVEL2_FIRST, [
      "side-pocket:level-1:blank-waymark"
    ]);
    expect(decision.offer).toBe(false);
  });

  it("offers only the still-undiscovered levels when some flags are already set (partial-discovery save)", () => {
    const flags = ["side-pocket:level-1:blank-waymark", "side-pocket:level-3:root-cellar-key"];
    expect(evaluateSidePocketOffer(LEVEL1_FINAL, LEVEL2_FIRST, flags).offer).toBe(false);
    expect(evaluateSidePocketOffer(wave({ level: 2, wave_index: 1 }), wave({ level: 3 }), flags).offer).toBe(
      true
    );
    expect(
      evaluateSidePocketOffer(wave({ level: 3, wave_index: 1 }), wave({ level: 4 }), flags).offer
    ).toBe(false);
    expect(
      evaluateSidePocketOffer(wave({ level: 4, wave_index: 1 }), wave({ level: 5, is_boss: true }), flags).offer
    ).toBe(true);
  });

  it("a New Game (empty lore flags) offers all four levels' encounters, undiscovered", () => {
    for (const encounter of SIDE_POCKET_ENCOUNTERS) {
      const finalWave = wave({ level: encounter.level, wave_index: 1 });
      const next = wave({ level: encounter.level + 1 });
      expect(evaluateSidePocketOffer(finalWave, next, []).offer).toBe(true);
    }
  });
});

describe("resolveSidePocketExplore", () => {
  const encounter = SIDE_POCKET_ENCOUNTERS[0];

  it("reveals the correct object/lore, adds exactly the one flag, and awards the reward", () => {
    const result = resolveSidePocketExplore(encounter, []);
    expect(result.applied).toBe(true);
    expect(result.encounter.objectName).toBe(encounter.objectName);
    expect(result.encounter.loreSentence).toBe(encounter.loreSentence);
    expect(result.rewardHexcoin).toBe(2);
    expect(result.updatedLoreFlags).toEqual([encounter.loreFlag]);
  });

  it("is a no-op (idempotent) when the flag is already present, e.g. a duplicate/stale Explore call", () => {
    const alreadyDiscovered = [encounter.loreFlag];
    const result = resolveSidePocketExplore(encounter, alreadyDiscovered);
    expect(result.applied).toBe(false);
    expect(result.rewardHexcoin).toBe(0);
    expect(result.updatedLoreFlags).toEqual(alreadyDiscovered);
  });

  it("does not mutate the loreFlags array passed in", () => {
    const flags = ["some-other-flag"];
    resolveSidePocketExplore(encounter, flags);
    expect(flags).toEqual(["some-other-flag"]);
  });

  it("preserves pre-existing flags alongside the newly added one", () => {
    const result = resolveSidePocketExplore(encounter, ["met-director"]);
    expect(result.updatedLoreFlags).toEqual(["met-director", encounter.loreFlag]);
  });
});

describe("Side-Pocket Lore Encounters — full-set economy and isolation properties", () => {
  it("discovering all four produces exactly 8 total one-time Hexcoin", () => {
    const hexcoin = new HexcoinSystem();
    let flags: string[] = [];
    for (const encounter of SIDE_POCKET_ENCOUNTERS) {
      const result = resolveSidePocketExplore(encounter, flags);
      hexcoin.awardPermanent(result.rewardHexcoin);
      flags = result.updatedLoreFlags;
    }
    expect(hexcoin.balance).toBe(8);
    expect(flags).toHaveLength(4);
  });

  it("a duplicate Explore call against the same accumulated flags cannot double-award", () => {
    const hexcoin = new HexcoinSystem();
    const first = resolveSidePocketExplore(SIDE_POCKET_ENCOUNTERS[0], []);
    hexcoin.awardPermanent(first.rewardHexcoin);
    // Simulates a stale callback delivering the same Explore action twice against the
    // now-updated persistent flags — the real defense-in-depth guard the scene itself also
    // has via `canResolveEncounterChoice`'s generation/phase check.
    const duplicate = resolveSidePocketExplore(SIDE_POCKET_ENCOUNTERS[0], first.updatedLoreFlags);
    hexcoin.awardPermanent(duplicate.rewardHexcoin);
    expect(hexcoin.balance).toBe(2);
  });

  it("the permanent award survives a death rollback to the level-start floor", () => {
    const hexcoin = new HexcoinSystem();
    hexcoin.markLevelStart();
    const result = resolveSidePocketExplore(SIDE_POCKET_ENCOUNTERS[0], []);
    hexcoin.awardPermanent(result.rewardHexcoin);
    hexcoin.earn(3); // some further in-attempt income that death SHOULD roll back
    hexcoin.rollbackToLevelStart();
    expect(hexcoin.balance).toBe(2);
  });

  it("the controller never reads or writes HP/Mana/Mastery/wave-composition/boss-recovery state", () => {
    // Structural guard: evaluateSidePocketOffer/resolveSidePocketExplore's own type
    // signatures only ever take a WaveDefinition, the encounter catalog, and lore flags —
    // there is no HealthSystem/ManaSystem/MasterySystem/HexcoinSystem parameter for the
    // offer/reveal decision itself to reach into. The Hexcoin award is applied by the
    // caller (SpellroadScene), never internally, exactly like the phase-break's own pattern.
    const result = resolveSidePocketExplore(SIDE_POCKET_ENCOUNTERS[0], []);
    expect(Object.keys(result).sort()).toEqual(["applied", "encounter", "rewardHexcoin", "updatedLoreFlags"]);
  });
});
