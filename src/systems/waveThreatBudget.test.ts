import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
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
import spellsData from "../data/spells/spells.json";
import { selectDefaultLoadout } from "./defaultLoadout";
import * as contentValidation from "../data/validateContent";
import type { SpellDefinition, WaveDefinition } from "../data/types";

const level5Url = new URL("../data/waves/level-5.json", import.meta.url);
const level5Waves = existsSync(level5Url)
  ? JSON.parse(readFileSync(level5Url, "utf8")) as WaveDefinition[]
  : [];

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

  it("widens the envelope for Levels 2-5 per LEVEL_BAND_MULTIPLIER", () => {
    for (const level of [2, 3, 4, 5]) {
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
    expect(() => levelRegularWaveBand(6)).toThrow();
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
 * `computeThreatBudget` needs, using the archetype that is now explicit in every authored entry.
 * `validateWaves` independently proves that it matches the registry before this arithmetic is trusted. */
function compositionOf(wave: WaveDefinition): { melee: number; ranged: number; debuffer: number } {
  const composition = { melee: 0, ranged: 0, debuffer: 0 };
  for (const entry of wave.enemies) {
    composition[entry.archetype] += entry.count;
  }
  return composition;
}

describe("issue #162 — real shipped wave files clear the per-level difficulty curve", () => {
  const regularLevels: [number, WaveDefinition[]][] = [
    [1, level1Waves as WaveDefinition[]],
    [2, level2Waves as WaveDefinition[]],
    [3, level3Waves as WaveDefinition[]],
    [4, level4Waves as WaveDefinition[]],
    [5, level5Waves]
  ];

  it("follows the approved 3/5/7/9/12 active visual-identity curve", () => {
    const activeIds = (waves: WaveDefinition[]) =>
      new Set(waves.flatMap((wave) => wave.enemies.map((entry) => entry.type))).size;
    const level1Wave2 = level1Waves.find((wave) => wave.wave_index === 2)! as WaveDefinition;

    expect([
      activeIds([level1Wave2]),
      ...regularLevels.slice(1).map(([, waves]) => activeIds(waves))
    ]).toEqual([3, 5, 7, 9, 12]);
  });

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

function authoredArchetypeComposition(wave: WaveDefinition): { melee: number; ranged: number; debuffer: number } {
  const composition = { melee: 0, ranged: 0, debuffer: 0 };
  for (const entry of wave.enemies) {
    const archetype = (entry as typeof entry & { archetype?: keyof typeof composition }).archetype;
    if (archetype) composition[archetype] += entry.count;
  }
  return composition;
}

function effectiveThreat(wave: WaveDefinition): { competentPct: number; carelessPct: number } {
  return applyDamageModifier(computeThreatBudget(authoredArchetypeComposition(wave)), wave.damage_modifier);
}

function elementsOf(wave: WaveDefinition): Set<string | undefined> {
  return new Set(wave.enemies.map((entry) => entry.element));
}

function combinationCount(wave: WaveDefinition): number {
  return new Set(wave.enemies.map((entry) => `${(entry as typeof entry & { archetype?: string }).archetype}:${entry.element}`)).size;
}

/** Warden's documented cadence-pressure axis is the first inter-group gap: a smaller
 * positive authored delay means the next enemy group joins sooner and pressure rises. */
function firstInterGroupDelayMs(wave: WaveDefinition): number {
  return Math.min(...wave.enemies.map((entry) => entry.spawn_delay_ms).filter((delay) => delay > 0));
}

function debufferCount(wave: WaveDefinition): number {
  return authoredArchetypeComposition(wave).debuffer;
}

function waveFairnessErrors(waves: WaveDefinition[], loadout: SpellDefinition[]): string[] {
  const validator = (contentValidation as typeof contentValidation & {
    validateWaveFairness?: (waves: WaveDefinition[], loadout: SpellDefinition[]) => string[];
  }).validateWaveFairness;
  return validator ? validator(waves, loadout) : ["validateWaveFairness is missing"];
}

function authoredWave(overrides: Partial<WaveDefinition> = {}): WaveDefinition {
  return {
    level: 1,
    wave_index: 0,
    enemies: [{ type: "monster_m01", archetype: "melee", element: "fire", count: 1, spawn_delay_ms: 0 }],
    hp_modifier: 1,
    damage_modifier: 1,
    ...overrides
  };
}

describe("elemental encounter progression", () => {
  it("keeps Level 1 Wave 0 as a fire-only onboarding skirmish", () => {
    const wave0 = (level1Waves as WaveDefinition[]).find((wave) => wave.wave_index === 0)!;
    expect(elementsOf(wave0)).toEqual(new Set(["fire"]));
    expect(isOnboardingGrace(computeThreatBudget(authoredArchetypeComposition(wave0)))).toBe(true);
  });

  it("makes Level 1 Wave 1 simpler than Wave 2 and introduces the first debuffer only in Wave 2", () => {
    const waves = [...(level1Waves as WaveDefinition[])].sort((a, b) => a.wave_index - b.wave_index);
    expect(authoredArchetypeComposition(waves[1]).debuffer).toBe(0);
    expect(authoredArchetypeComposition(waves[2]).debuffer).toBe(1);
    expect(combinationCount(waves[1])).toBeLessThan(combinationCount(waves[2]));
    expect(waves[1].damage_modifier).toBeLessThan(waves[2].damage_modifier);
  });

  it("introduces each new element alone before later mixtures", () => {
    expect(elementsOf((level2Waves as WaveDefinition[])[0])).toEqual(new Set(["ice"]));
    expect(elementsOf((level3Waves as WaveDefinition[])[0])).toEqual(new Set(["earth"]));
    expect(elementsOf((level3Waves as WaveDefinition[])[2]).size).toBe(3);
    expect(elementsOf((level4Waves as WaveDefinition[])[0])).toEqual(new Set(["lightning"]));
    expect(elementsOf((level4Waves as WaveDefinition[])[1]).size).toBe(3);
    expect(elementsOf((level4Waves as WaveDefinition[])[2]).size).toBe(3);
  });

  it("strictly raises both opening threat figures from Level 1 through Level 5", () => {
    expect(level5Waves.length).toBeGreaterThan(0);
    const levels = [level1Waves, level2Waves, level3Waves, level4Waves, level5Waves] as WaveDefinition[][];
    const openings = levels.map((waves) => effectiveThreat(waves.find((wave) => wave.wave_index === 0)!));
    for (let index = 1; index < openings.length; index += 1) {
      expect(openings[index].competentPct).toBeGreaterThan(openings[index - 1].competentPct);
      expect(openings[index].carelessPct).toBeGreaterThan(openings[index - 1].carelessPct);
    }
  });

  it("strictly raises modifier-scaled competent and careless threat wave-over-wave within every regular level", () => {
    const levels = [level1Waves, level2Waves, level3Waves, level4Waves, level5Waves] as WaveDefinition[][];
    for (const waves of levels) {
      const sorted = [...waves].sort((a, b) => a.wave_index - b.wave_index);
      for (let index = 1; index < sorted.length; index += 1) {
        const previous = effectiveThreat(sorted[index - 1]);
        const current = effectiveThreat(sorted[index]);
        const transition = `Level ${sorted[index].level} Wave ${sorted[index - 1].wave_index}->${sorted[index].wave_index}`;
        expect(current.competentPct, `${transition} competent threat`).toBeGreaterThan(previous.competentPct);
        expect(current.carelessPct, `${transition} careless threat`).toBeGreaterThan(previous.carelessPct);
      }
    }
  });

  it("authors Level 2 Wave 2 as a relief beat after the first genuine mix while threat still rises", () => {
    const waves = [...(level2Waves as WaveDefinition[])].sort((a, b) => a.wave_index - b.wave_index);
    const firstMix = waves[1];
    const relief = waves[2];

    expect(elementsOf(firstMix).size).toBeGreaterThan(1);
    expect(combinationCount(relief)).toBeLessThan(combinationCount(firstMix));
    expect(effectiveThreat(relief).competentPct).toBeGreaterThan(effectiveThreat(firstMix).competentPct);
    expect(effectiveThreat(relief).carelessPct).toBeGreaterThan(effectiveThreat(firstMix).carelessPct);
  });

  it("never increases every declared difficulty lever in one regular-wave transition", () => {
    const levels = [level1Waves, level2Waves, level3Waves, level4Waves, level5Waves] as WaveDefinition[][];
    for (const waves of levels) {
      const sorted = [...waves].sort((a, b) => a.wave_index - b.wave_index);
      for (let index = 1; index < sorted.length; index += 1) {
        const previous = sorted[index - 1];
        const current = sorted[index];
        const previousThreat = effectiveThreat(previous);
        const currentThreat = effectiveThreat(current);
        const axesThatIncrease = {
          directThreat: currentThreat.competentPct > previousThreat.competentPct && currentThreat.carelessPct > previousThreat.carelessPct,
          elementalBreadth: elementsOf(current).size > elementsOf(previous).size,
          archetypeElementCombinations: combinationCount(current) > combinationCount(previous),
          debufferApplications: debufferCount(current) > debufferCount(previous),
          cadencePressure: firstInterGroupDelayMs(current) < firstInterGroupDelayMs(previous)
        };

        expect(
          Object.values(axesThatIncrease).every(Boolean),
          `Level ${current.level} Wave ${previous.wave_index}->${current.wave_index} increases every axis`
        ).toBe(false);
      }
    }
  });

  it("uses all twelve regular monster IDs in Level 5 and reserves four-element mixtures for late waves", () => {
    expect(level5Waves).toHaveLength(3);
    const ids = new Set(level5Waves.flatMap((wave) => wave.enemies.map((entry) => entry.type)));
    expect(ids).toEqual(new Set([
      "monster_m01", "monster_m02", "monster_m03", "monster_m04",
      "monster_r01", "monster_r02", "monster_r03", "monster_r04",
      "monster_d01", "monster_d02", "monster_d03", "monster_d04"
    ]));
    expect(elementsOf(level5Waves[0]).size).toBeLessThan(4);
    expect(elementsOf(level5Waves[1]).size).toBeLessThan(4);
    expect(elementsOf(level5Waves[2])).toEqual(new Set(["fire", "ice", "earth", "lightning"]));
  });

  it("makes late Level 5 waves compositionally denser than late Level 1", () => {
    expect(level5Waves.length).toBeGreaterThan(0);
    const level1 = level1Waves as WaveDefinition[];
    const level1Late = level1[level1.length - 1];
    const level5Late = level5Waves[level5Waves.length - 1];
    expect(combinationCount(level5Late)).toBeGreaterThan(combinationCount(level1Late));
  });
});

describe("default-loadout elemental fairness", () => {
  const defaultLoadout = selectDefaultLoadout(spellsData as SpellDefinition[]);

  it("gives every shipped mixed wave counters and no mandatory default spell", () => {
    expect(level5Waves.length).toBeGreaterThan(0);
    const allWaves = [
      ...(level1Waves as WaveDefinition[]),
      ...(level2Waves as WaveDefinition[]),
      ...(level3Waves as WaveDefinition[]),
      ...(level4Waves as WaveDefinition[]),
      ...level5Waves,
      ...(boss1Waves as WaveDefinition[])
    ];
    expect(waveFairnessErrors(allWaves, defaultLoadout)).toEqual([]);
  });

  it("rejects a mixed wave when the loadout has no counter for an active element", () => {
    const mixedWave = authoredWave({
      enemies: [
        { type: "monster_m01", archetype: "melee", element: "fire", count: 1, spawn_delay_ms: 0 },
        { type: "monster_r01", archetype: "ranged", element: "ice", count: 1, spawn_delay_ms: 0 }
      ]
    });
    const noLightning = defaultLoadout.filter((spell) => spell.element !== "lightning");
    expect(waveFairnessErrors([mixedWave], noLightning)).toContain(
      "Wave level 1 wave 0: active fire has no 1.25 counter in the default loadout"
    );
  });

  it("rejects a mixed wave that makes one default spell mandatory", () => {
    const mixedWave = authoredWave({
      enemies: [
        { type: "monster_m01", archetype: "melee", element: "fire", count: 1, spawn_delay_ms: 0 },
        { type: "monster_r01", archetype: "ranged", element: "earth", count: 1, spawn_delay_ms: 0 }
      ]
    });
    const narrowLoadout = defaultLoadout.filter((spell) => spell.id === "flame_sweep" || spell.id === "frost_nova");
    expect(waveFairnessErrors([mixedWave], narrowLoadout)).toContain(
      'Wave level 1 wave 0: default spell "flame_sweep" is mandatory for neutral-or-better coverage'
    );
  });

  it("keeps authored threat arithmetic independent from elemental assignments", () => {
    const allFire = authoredWave({
      enemies: [
        { type: "monster_m01", archetype: "melee", element: "fire", count: 3, spawn_delay_ms: 0 },
        { type: "monster_r01", archetype: "ranged", element: "fire", count: 2, spawn_delay_ms: 0 }
      ]
    });
    const mixed = authoredWave({
      enemies: [
        { type: "monster_m01", archetype: "melee", element: "ice", count: 3, spawn_delay_ms: 0 },
        { type: "monster_r01", archetype: "ranged", element: "lightning", count: 2, spawn_delay_ms: 0 }
      ]
    });
    expect(computeThreatBudget(authoredArchetypeComposition(mixed))).toEqual(
      computeThreatBudget(authoredArchetypeComposition(allFire))
    );
  });
});
