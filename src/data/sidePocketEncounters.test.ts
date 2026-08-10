import { describe, expect, it } from "vitest";
import { SIDE_POCKET_ENCOUNTERS, findSidePocketEncounter } from "./sidePocketEncounters";

describe("SIDE_POCKET_ENCOUNTERS catalog invariants", () => {
  it("has exactly four entries, one per regular level 1-4, none for the boss level", () => {
    expect(SIDE_POCKET_ENCOUNTERS).toHaveLength(4);
    expect(SIDE_POCKET_ENCOUNTERS.map((e) => e.level).sort()).toEqual([1, 2, 3, 4]);
  });

  it("gives every encounter a unique id and lore flag", () => {
    const ids = SIDE_POCKET_ENCOUNTERS.map((e) => e.id);
    const flags = SIDE_POCKET_ENCOUNTERS.map((e) => e.loreFlag);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(flags).size).toBe(flags.length);
  });

  it("fixes every reward at 2 Hexcoin, totaling exactly 8 across the complete set", () => {
    expect(SIDE_POCKET_ENCOUNTERS.every((e) => e.rewardHexcoin === 2)).toBe(true);
    expect(SIDE_POCKET_ENCOUNTERS.reduce((sum, e) => sum + e.rewardHexcoin, 0)).toBe(8);
  });

  it("reveals the approved object names in level order", () => {
    expect(SIDE_POCKET_ENCOUNTERS.map((e) => e.objectName)).toEqual([
      "Blank Waymark",
      "Murmur-Glass Vial",
      "Root-Cellar Key",
      "Chalked Ledger Scrap"
    ]);
  });

  it("findSidePocketEncounter looks up by level number, not sequence index", () => {
    expect(findSidePocketEncounter(3)?.objectName).toBe("Root-Cellar Key");
    expect(findSidePocketEncounter(5)).toBeUndefined();
  });
});
