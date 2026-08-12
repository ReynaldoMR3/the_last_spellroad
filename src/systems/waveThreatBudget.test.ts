import { describe, expect, it } from "vitest";
import {
  computeThreatBudget,
  isWithinBand,
  isOnboardingGrace,
  STANDARD_REGULAR_WAVE_BAND,
  ONBOARDING_COMPETENT_CEILING,
  ONBOARDING_CARELESS_CEILING,
  LEVEL_BAND_MULTIPLIER,
  scaleBand,
  levelRegularWaveBand,
  applyDamageModifier,
  BOSS_TRIAL_BAND,
  sumThreatBudgets
} from "./waveThreatBudget";
import level1Waves from "../data/waves/level-1.json";
import level2Waves from "../data/waves/level-2.json";
import level3Waves from "../data/waves/level-3.json";
import level4Waves from "../data/waves/level-4.json";
import boss1Waves from "../data/waves/boss-1.json";
import { ENEMY_REGISTRY } from "../data/enemyRegistry";
import type { WaveDefinition } from "../data/types";

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

  it("rejects a melee-heavy composition that clears the competent floor but blows past the careless ceiling (Melee=7, Ranged=0)", () => {
    const budget = computeThreatBudget({ melee: 7, ranged: 0, debuffer: 0 });
    expect(budget.competentPct).toBeLessThan(ONBOARDING_COMPETENT_CEILING);
    expect(budget.carelessPct).toBeGreaterThan(STANDARD_REGULAR_WAVE_BAND.carelessMax);
    expect(budget.carelessPct).toBeGreaterThanOrEqual(ONBOARDING_CARELESS_CEILING);
    expect(isOnboardingGrace(budget)).toBe(false);
  });
});

describe("scaleBand", () => {
  it("scales every bound by the same factor, preserving the band's shape", () => {
    const scaled = scaleBand(STANDARD_REGULAR_WAVE_BAND, 1.08);
    expect(scaled.competentMin).toBeCloseTo(10.8, 5);
    expect(scaled.competentMax).toBeCloseTo(16.2, 5);
    expect(scaled.carelessMin).toBeCloseTo(27, 5);
    expect(scaled.carelessMax).toBeCloseTo(37.8, 5);
  });

  it("is a no-op at multiplier 1.0", () => {
    expect(scaleBand(STANDARD_REGULAR_WAVE_BAND, 1.0)).toEqual(STANDARD_REGULAR_WAVE_BAND);
  });
});

describe("levelRegularWaveBand — issue #162's per-level difficulty curve", () => {
  it("returns the unmodified standard band for Level 1 (multiplier 1.0)", () => {
    expect(levelRegularWaveBand(1)).toEqual(STANDARD_REGULAR_WAVE_BAND);
  });

  it("widens the envelope for Levels 2-4 per LEVEL_BAND_MULTIPLIER", () => {
    for (const level of [2, 3, 4]) {
      const band = levelRegularWaveBand(level);
      const multiplier = LEVEL_BAND_MULTIPLIER[level];
      expect(band.competentMin).toBeCloseTo(STANDARD_REGULAR_WAVE_BAND.competentMin * multiplier, 5);
      expect(band.competentMax).toBeCloseTo(STANDARD_REGULAR_WAVE_BAND.competentMax * multiplier, 5);
      // Each level's envelope must strictly widen over the previous level's — otherwise the
      // "curve" is flat again, exactly the defect issue #162 exists to close.
      const previous = levelRegularWaveBand(level - 1);
      expect(band.competentMax).toBeGreaterThan(previous.competentMax);
      expect(band.carelessMax).toBeGreaterThan(previous.carelessMax);
    }
  });

  it("throws for a level with no defined multiplier", () => {
    expect(() => levelRegularWaveBand(5)).toThrow();
  });
});

describe("applyDamageModifier", () => {
  it("scales both figures by the modifier", () => {
    const budget = computeThreatBudget({ melee: 3, ranged: 2, debuffer: 0 });
    const scaled = applyDamageModifier(budget, 1.24);
    expect(scaled.competentPct).toBeCloseTo(12.2 * 1.24, 5);
    expect(scaled.carelessPct).toBeCloseTo(29 * 1.24, 5);
  });

  it("is a no-op at modifier 1.0", () => {
    const budget = computeThreatBudget({ melee: 3, ranged: 2, debuffer: 0 });
    expect(applyDamageModifier(budget, 1.0)).toEqual(budget);
  });
});

describe("sumThreatBudgets", () => {
  it("sums competent and careless figures independently across phases", () => {
    const sum = sumThreatBudgets([
      { competentPct: 13.4, carelessPct: 19 },
      { competentPct: 19.74, carelessPct: 31.5 },
      { competentPct: 20.68, carelessPct: 33 }
    ]);
    expect(sum.competentPct).toBeCloseTo(53.82, 5);
    expect(sum.carelessPct).toBeCloseTo(83.5, 5);
  });

  it("returns zero for an empty phase list", () => {
    expect(sumThreatBudgets([])).toEqual({ competentPct: 0, carelessPct: 0 });
  });
});

/** Converts a wave's authored `enemies` entries into the `{melee, ranged, debuffer}` shape
 * `computeThreatBudget` needs, resolving each entry's `type` through the real `ENEMY_REGISTRY`
 * — the same lookup Loomwright's loader uses, so a wave that introduces a new named variant
 * (built on an existing archetype) is counted correctly without this test file inventing its
 * own parallel mapping. */
function compositionOf(wave: WaveDefinition): { melee: number; ranged: number; debuffer: number } {
  const composition = { melee: 0, ranged: 0, debuffer: 0 };
  for (const entry of wave.enemies) {
    const registryEntry = ENEMY_REGISTRY[entry.type];
    if (!registryEntry) {
      throw new Error(`compositionOf: "${entry.type}" is not in ENEMY_REGISTRY`);
    }
    composition[registryEntry.archetype] += entry.count;
  }
  return composition;
}

describe("issue #162 — real shipped wave files clear the per-level difficulty curve", () => {
  const regularLevels: [number, WaveDefinition[]][] = [
    [1, level1Waves as WaveDefinition[]],
    [2, level2Waves as WaveDefinition[]],
    [3, level3Waves as WaveDefinition[]],
    [4, level4Waves as WaveDefinition[]]
  ];

  it("every regular wave's damage_modifier != 1.0 except Level 1 Wave 0's onboarding exception", () => {
    for (const [level, waves] of regularLevels) {
      for (const wave of waves) {
        const isOnboardingWave = level === 1 && wave.wave_index === 0;
        if (isOnboardingWave) {
          expect(wave.damage_modifier).toBe(1.0);
        } else {
          expect(wave.damage_modifier).not.toBe(1.0);
        }
      }
    }
  });

  it("hp_modifier and damage_modifier move together on every wave (the shared difficulty-tier scalar)", () => {
    for (const [, waves] of regularLevels) {
      for (const wave of waves) {
        expect(wave.hp_modifier).toBe(wave.damage_modifier);
      }
    }
  });

  it("damage_modifier strictly increases wave-over-wave within every level", () => {
    for (const [, waves] of regularLevels) {
      const sorted = [...waves].sort((a, b) => a.wave_index - b.wave_index);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].damage_modifier).toBeGreaterThan(sorted[i - 1].damage_modifier);
      }
    }
  });

  it("each level's opening damage_modifier strictly increases level-over-level (Level 1 -> Level 4)", () => {
    const openers = regularLevels.map(([, waves]) => waves.find((w) => w.wave_index === 0)!.damage_modifier);
    for (let i = 1; i < openers.length; i++) {
      expect(openers[i]).toBeGreaterThan(openers[i - 1]);
    }
  });

  it("Level 1 Wave 0's onboarding composition still passes isOnboardingGrace, not the standard band", () => {
    const wave0 = (level1Waves as WaveDefinition[]).find((w) => w.wave_index === 0)!;
    const budget = computeThreatBudget(compositionOf(wave0));
    expect(isOnboardingGrace(budget)).toBe(true);
    expect(isWithinBand(budget, STANDARD_REGULAR_WAVE_BAND)).toBe(false);
  });

  it("every non-onboarding regular wave's modifier-scaled budget clears its own level's scaled band", () => {
    for (const [level, waves] of regularLevels) {
      const band = levelRegularWaveBand(level);
      for (const wave of waves) {
        if (level === 1 && wave.wave_index === 0) continue; // onboarding exception, checked above
        const raw = computeThreatBudget(compositionOf(wave));
        const effective = applyDamageModifier(raw, wave.damage_modifier);
        expect(isWithinBand(effective, band)).toBe(true);
      }
    }
  });

  it("the boss's cumulative modifier-scaled budget clears BOSS_TRIAL_BAND", () => {
    const bossWaves = boss1Waves as WaveDefinition[];
    const perPhase = bossWaves.map((wave) => applyDamageModifier(computeThreatBudget(compositionOf(wave)), wave.damage_modifier));
    const cumulative = sumThreatBudgets(perPhase);
    expect(isWithinBand(cumulative, BOSS_TRIAL_BAND)).toBe(true);
  });

  it("boss damage_modifier increases phase-over-phase, same escalation shape as a regular level", () => {
    const bossWaves = [...(boss1Waves as WaveDefinition[])].sort((a, b) => a.wave_index - b.wave_index);
    for (let i = 1; i < bossWaves.length; i++) {
      expect(bossWaves[i].damage_modifier).toBeGreaterThan(bossWaves[i - 1].damage_modifier);
    }
  });
});
