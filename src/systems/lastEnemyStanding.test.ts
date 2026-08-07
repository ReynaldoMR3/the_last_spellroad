import { describe, expect, it } from "vitest";
import { allRemainingAreYieldingDebuffers } from "./lastEnemyStanding";

function enemy(archetype: "melee" | "ranged" | "debuffer", active = true) {
  return { archetype, active };
}

describe("allRemainingAreYieldingDebuffers", () => {
  it("is false when no enemies remain (nothing to yield)", () => {
    expect(allRemainingAreYieldingDebuffers([], 0)).toBe(false);
  });

  it("is false while enemies remain to spawn, even if all live enemies are debuffers", () => {
    expect(allRemainingAreYieldingDebuffers([enemy("debuffer")], 2)).toBe(false);
  });

  it("is false when a melee or ranged enemy is still active alongside a debuffer", () => {
    expect(allRemainingAreYieldingDebuffers([enemy("debuffer"), enemy("melee")], 0)).toBe(false);
    expect(allRemainingAreYieldingDebuffers([enemy("debuffer"), enemy("ranged")], 0)).toBe(false);
  });

  it("is true when every remaining active enemy is a debuffer and nothing more will spawn", () => {
    expect(allRemainingAreYieldingDebuffers([enemy("debuffer")], 0)).toBe(true);
    expect(allRemainingAreYieldingDebuffers([enemy("debuffer"), enemy("debuffer")], 0)).toBe(true);
  });

  it("ignores already-inactive entries so a mid-cleanup enemy can't block or falsely trigger a yield", () => {
    expect(allRemainingAreYieldingDebuffers([enemy("debuffer", false)], 0)).toBe(false);
    expect(allRemainingAreYieldingDebuffers([enemy("debuffer"), enemy("melee", false)], 0)).toBe(true);
  });
});
