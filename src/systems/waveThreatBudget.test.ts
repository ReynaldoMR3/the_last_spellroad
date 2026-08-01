import { describe, expect, it } from "vitest";
import {
  computeThreatBudget,
  isWithinBand,
  isOnboardingGrace,
  STANDARD_REGULAR_WAVE_BAND,
  ONBOARDING_COMPETENT_CEILING
} from "./waveThreatBudget";

describe("computeThreatBudget", () => {
  it("matches Warden's validated (Melee=3, Ranged=2) regression pair", () => {
    const budget = computeThreatBudget({ melee: 3, ranged: 2, debuffer: 0 });
    expect(budget.competentPct).toBeCloseTo(12.2, 5);
    expect(budget.carelessPct).toBeCloseTo(29, 5);
  });

  it("matches Warden's validated (Melee=2, Ranged=3) regression pair", () => {
    const budget = computeThreatBudget({ melee: 2, ranged: 3, debuffer: 0 });
    expect(budget.competentPct).toBeCloseTo(14.8, 5);
    expect(budget.carelessPct).toBeCloseTo(26, 5);
  });

  it("ignores Debuffer count — 0 damage per hp-template.md", () => {
    const withDebuffer = computeThreatBudget({ melee: 3, ranged: 2, debuffer: 4 });
    const withoutDebuffer = computeThreatBudget({ melee: 3, ranged: 2, debuffer: 0 });
    expect(withDebuffer).toEqual(withoutDebuffer);
  });
});

describe("isWithinBand against the standard regular-wave band", () => {
  it("passes both known-good compositions", () => {
    expect(isWithinBand(computeThreatBudget({ melee: 3, ranged: 2, debuffer: 0 }), STANDARD_REGULAR_WAVE_BAND)).toBe(
      true
    );
    expect(isWithinBand(computeThreatBudget({ melee: 2, ranged: 3, debuffer: 0 }), STANDARD_REGULAR_WAVE_BAND)).toBe(
      true
    );
  });

  it("rejects a composition that busts the careless ceiling (Melee=4, Ranged=2)", () => {
    const budget = computeThreatBudget({ melee: 4, ranged: 2, debuffer: 0 });
    expect(budget.carelessPct).toBeGreaterThan(STANDARD_REGULAR_WAVE_BAND.carelessMax);
    expect(isWithinBand(budget, STANDARD_REGULAR_WAVE_BAND)).toBe(false);
  });
});

describe("isOnboardingGrace — Level 1 Wave 0's exception, distinct from the standard band", () => {
  it("passes the onboarding floor but fails the standard band's competent floor (Melee=2, Ranged=1)", () => {
    const budget = computeThreatBudget({ melee: 2, ranged: 1, debuffer: 0 });
    expect(budget.competentPct).toBeLessThan(STANDARD_REGULAR_WAVE_BAND.competentMin);
    expect(isOnboardingGrace(budget)).toBe(true);
    expect(isWithinBand(budget, STANDARD_REGULAR_WAVE_BAND)).toBe(false);
  });

  it("rejects a zero-threat composition as too trivial to count as onboarding grace", () => {
    const budget = computeThreatBudget({ melee: 0, ranged: 0, debuffer: 0 });
    expect(isOnboardingGrace(budget)).toBe(false);
  });

  it("never passes for a composition already within the standard band", () => {
    const budget = computeThreatBudget({ melee: 3, ranged: 2, debuffer: 0 });
    expect(budget.competentPct).toBeGreaterThanOrEqual(ONBOARDING_COMPETENT_CEILING);
    expect(isOnboardingGrace(budget)).toBe(false);
  });
});
