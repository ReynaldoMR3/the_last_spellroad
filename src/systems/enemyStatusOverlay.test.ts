import { describe, expect, it } from "vitest";
import { computeHpFraction, computeHpBarColor, HP_BAR_COLOR } from "./enemyStatusOverlay";

describe("computeHpFraction", () => {
  it("returns 1 at full HP", () => {
    expect(computeHpFraction(18, 18)).toBe(1);
  });

  it("returns a proportional fraction mid-fight", () => {
    expect(computeHpFraction(9, 18)).toBeCloseTo(0.5, 5);
  });

  it("clamps to 0 rather than going negative on an overkill hit", () => {
    expect(computeHpFraction(-4, 18)).toBe(0);
  });

  it("returns 0 for a non-positive maxHp instead of dividing by zero/negative", () => {
    expect(computeHpFraction(5, 0)).toBe(0);
    expect(computeHpFraction(5, -1)).toBe(0);
  });
});

describe("computeHpBarColor", () => {
  it("matches spawnDamageNumber's own healthy/wounded/critical thresholds (backlog 2.9), reused for visual agreement", () => {
    expect(computeHpBarColor(1)).toBe(HP_BAR_COLOR.healthy);
    expect(computeHpBarColor(0.81)).toBe(HP_BAR_COLOR.healthy);
    expect(computeHpBarColor(0.8)).toBe(HP_BAR_COLOR.wounded);
    expect(computeHpBarColor(0.31)).toBe(HP_BAR_COLOR.wounded);
    expect(computeHpBarColor(0.3)).toBe(HP_BAR_COLOR.critical);
    expect(computeHpBarColor(0)).toBe(HP_BAR_COLOR.critical);
  });
});
