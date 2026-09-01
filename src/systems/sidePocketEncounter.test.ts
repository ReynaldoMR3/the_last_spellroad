import { describe, expect, it } from "vitest";
import type { WaveDefinition } from "../data/types";
import { SIDE_POCKET_ENCOUNTERS } from "../data/sidePocketEncounters";
import { HexcoinSystem } from "./HexcoinSystem";
import { evaluateSidePocketOffer, resolveSidePocketExplore } from "./sidePocketEncounter";
// Issue #166 — the real shipped wave files, imported the same way `validateContent.test.ts`
// already does, so the bottom suite can check the controller against the waves the game
// actually plays rather than only against synthetic ones.
import level1 from "../data/waves/level-1.json";
import level2 from "../data/waves/level-2.json";
import level3 from "../data/waves/level-3.json";
import level4 from "../data/waves/level-4.json";
import level5 from "../data/waves/level-5.json";
import boss1 from "../data/waves/boss-1.json";

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

/**
 * Issue #166 — the coverage gap behind "I could not find the side-pocket at all". Every test
 * above builds its own synthetic `WaveDefinition`s, so this whole suite stayed green without
 * anything ever checking the controller against the wave list the game actually ships and plays.
 * These tests walk the real flattened list, assembled exactly the way `SpellroadScene.create`
 * assembles it (levels 1-5 then boss-1, in order), driving it through the same `wave`/`next` pair
 * `SpellroadScene.updateEnemies` passes in.
 */
describe("Side-Pocket Lore Encounters — against the real shipped wave list (issue #166)", () => {
  const REAL_WAVES = [...level1, ...level2, ...level3, ...level4, ...level5, ...boss1] as WaveDefinition[];

  /** Replays a whole run, collecting the encounters actually offered, with flags persisting. */
  function playThrough(): string[] {
    const offered: string[] = [];
    let flags: string[] = [];
    REAL_WAVES.forEach((wave, index) => {
      const decision = evaluateSidePocketOffer(wave, REAL_WAVES[index + 1], flags);
      if (decision.offer && decision.encounter) {
        offered.push(decision.encounter.id);
        flags = resolveSidePocketExplore(decision.encounter, flags).updatedLoreFlags;
      }
    });
    return offered;
  }

  it("offers exactly one encounter per regular level, in level order, over a real full run", () => {
    expect(playThrough()).toEqual([
      "level-1-blank-waymark",
      "level-2-murmur-glass-vial",
      "level-3-root-cellar-key",
      "level-4-chalked-ledger-scrap"
    ]);
  });

  it("offers Level 1's encounter on a real Level 1 wave the player can actually reach", () => {
    // The specific thing the playtest could not find. Level 1's offer must land on the last
    // Level 1 wave in the shipped file, not on a wave index that never occurs.
    const level1Waves = REAL_WAVES.filter((wave) => wave.level === 1);
    const offering = level1Waves.filter(
      (wave) => evaluateSidePocketOffer(wave, REAL_WAVES[REAL_WAVES.indexOf(wave) + 1], []).offer
    );
    expect(offering).toHaveLength(1);
    expect(offering[0]).toBe(level1Waves[level1Waves.length - 1]);
    expect(offering[0].is_boss).toBeFalsy();
  });

  it("never offers anything during the real boss file", () => {
    for (const [index, wave] of REAL_WAVES.entries()) {
      if (!wave.is_boss) {
        continue;
      }
      expect(evaluateSidePocketOffer(wave, REAL_WAVES[index + 1], []).offer).toBe(false);
    }
  });

  it("re-playing a run with all four flags already set offers nothing (one-time, persisted)", () => {
    const allFlags = SIDE_POCKET_ENCOUNTERS.map((encounter) => encounter.loreFlag);
    for (const [index, wave] of REAL_WAVES.entries()) {
      expect(evaluateSidePocketOffer(wave, REAL_WAVES[index + 1], allFlags).offer).toBe(false);
    }
  });

  it("places every marker inside the mage's walkable lane, so each one is reachable", () => {
    // `LANE_RECT` in `SpellroadScene`: ROAD_LEFT=0, ROAD_TOP=130, ROAD_WIDTH=960, ROAD_HEIGHT=280.
    // A marker outside this rectangle would render but be unreachable on foot.
    const lane = { left: 0, top: 130, right: 0 + 960, bottom: 130 + 280 };
    for (const encounter of SIDE_POCKET_ENCOUNTERS) {
      expect(encounter.marker.x).toBeGreaterThan(lane.left);
      expect(encounter.marker.x).toBeLessThan(lane.right);
      expect(encounter.marker.y).toBeGreaterThan(lane.top);
      expect(encounter.marker.y).toBeLessThan(lane.bottom);
    }
  });
});
