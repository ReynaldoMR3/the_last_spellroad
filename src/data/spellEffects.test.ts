import { describe, expect, it } from "vitest";
import { calculateElementalDamage } from "../systems/elementalDamage";
import { computeCastCooldownMs, computeCastManaCost } from "../systems/spellCost";
import spellsData from "./spells/spells.json";
import type { Element, SpellDefinition, SpellEffect } from "./types";

const spells = spellsData as SpellDefinition[];

/** Pato's approved Task 1 submission. This is deliberately literal rather than derived from
 * the JSON under test: a content edit now has to explicitly re-open the balance decision. */
const APPROVED_ROSTER = [
  { id: "arc_lance", element: "lightning", shape: "line", weight: "light", base_power: 3, base_targets: 2, master_discount: "cooldown" },
  { id: "flame_sweep", element: "fire", shape: "cone", weight: "standard", base_power: 5, base_targets: 2, master_discount: "cost" },
  { id: "frost_nova", element: "ice", shape: "circle", weight: "heavy", base_power: 7, base_targets: 3, master_discount: "cooldown" },
  { id: "stone_spike", element: "earth", shape: "line", weight: "light", base_power: 4, base_targets: 1, master_discount: "cooldown" },
  { id: "flare_jab", element: "fire", shape: "cone", weight: "light", base_power: 2, base_targets: 2, master_discount: "cost" },
  { id: "spark_ring", element: "lightning", shape: "circle", weight: "light", base_power: 2, base_targets: 4, master_discount: "cooldown" },
  { id: "glacial_shard", element: "ice", shape: "line", weight: "standard", base_power: 4, base_targets: 3, master_discount: "cost" },
  { id: "rubble_burst", element: "earth", shape: "cone", weight: "standard", base_power: 3, base_targets: 3, master_discount: "cost" },
  { id: "thunder_dome", element: "lightning", shape: "circle", weight: "standard", base_power: 5, base_targets: 4, master_discount: "cooldown" },
  { id: "magma_lance", element: "fire", shape: "line", weight: "heavy", base_power: 9, base_targets: 1, master_discount: "cost" },
  { id: "frost_breath", element: "ice", shape: "cone", weight: "heavy", base_power: 6, base_targets: 4, master_discount: "cooldown" },
  { id: "tremor_field", element: "earth", shape: "circle", weight: "heavy", base_power: 5, base_targets: 6, master_discount: "cost" }
] as const;

const EXPECTED_EFFECT_BY_ELEMENT = {
  fire: { kind: "adjacent_pressure", range_tiles: 1, bonus_damage: 2, max_applications_per_target: 1 },
  ice: { kind: "weaken", outgoing_damage_multiplier: 0.8, duration_ms: 3000, max_stacks: 1 },
  lightning: { kind: "stun", duration_ms: 500, reapply_lockout_ms: 1500, max_stacks: 1 },
  earth: { kind: "single_target_burst", bonus_damage: 3, max_targets: 1 }
} as const;

interface HeavyScenario {
  heavyId: "frost_nova" | "magma_lance" | "frost_breath" | "tremor_field";
  monsterElement: Element;
  targetsAvailable: number;
  adjacentTargets: number;
  expected: {
    shape: SpellDefinition["shape"];
    manaCost: number;
    cooldownMs: number;
    coveredTargets: number;
    directDamage: number;
    primaryDamage: number;
    effectTargets: number;
    effect: SpellEffect;
  };
}

/**
 * Representative favorable engagements. A lower-tier spell strictly dominates only when it can
 * serve the same geometry, enemy count, matchup, and element-specific utility at no higher
 * Novice Mana/cooldown while matching every literal outcome below and improving at least one.
 * We deliberately do not compare unlike control durations (for example stun vs. weaken): those
 * are different tactical jobs, not interchangeable milliseconds.
 */
const HEAVY_SCENARIOS: readonly HeavyScenario[] = [
  {
    heavyId: "frost_nova", monsterElement: "earth", targetsAvailable: 3, adjacentTargets: 0,
    expected: {
      shape: "circle", manaCost: 35, cooldownMs: 8000, coveredTargets: 3, directDamage: 9, primaryDamage: 9, effectTargets: 3,
      effect: { kind: "weaken", outgoing_damage_multiplier: 0.8, duration_ms: 3000, max_stacks: 1 }
    }
  },
  {
    heavyId: "magma_lance", monsterElement: "ice", targetsAvailable: 1, adjacentTargets: 1,
    expected: {
      shape: "line", manaCost: 35, cooldownMs: 8000, coveredTargets: 1, directDamage: 11, primaryDamage: 13, effectTargets: 1,
      effect: { kind: "adjacent_pressure", range_tiles: 1, bonus_damage: 2, max_applications_per_target: 1 }
    }
  },
  {
    heavyId: "frost_breath", monsterElement: "earth", targetsAvailable: 4, adjacentTargets: 0,
    expected: {
      shape: "cone", manaCost: 35, cooldownMs: 8000, coveredTargets: 4, directDamage: 8, primaryDamage: 8, effectTargets: 4,
      effect: { kind: "weaken", outgoing_damage_multiplier: 0.8, duration_ms: 3000, max_stacks: 1 }
    }
  },
  {
    heavyId: "tremor_field", monsterElement: "lightning", targetsAvailable: 6, adjacentTargets: 0,
    expected: {
      shape: "circle", manaCost: 35, cooldownMs: 8000, coveredTargets: 6, directDamage: 6, primaryDamage: 9, effectTargets: 1,
      effect: { kind: "single_target_burst", bonus_damage: 3, max_targets: 1 }
    }
  }
];

interface ScenarioOutcome {
  shape: SpellDefinition["shape"];
  manaCost: number;
  cooldownMs: number;
  coveredTargets: number;
  directDamage: number;
  primaryDamage: number;
  effectTargets: number;
  effect: SpellEffect;
}

function outcomeFor(spell: SpellDefinition, scenario: HeavyScenario): ScenarioOutcome {
  const coveredTargets = Math.min(spell.base_targets, scenario.targetsAvailable);
  const directDamage = calculateElementalDamage(spell.base_power, spell.element, scenario.monsterElement);
  const pressureTargets = Math.min(coveredTargets, scenario.adjacentTargets);
  const bonusDamage = spell.effect.kind === "adjacent_pressure" && pressureTargets > 0
    ? spell.effect.bonus_damage
    : spell.effect.kind === "single_target_burst" && coveredTargets > 0
      ? spell.effect.bonus_damage
      : 0;
  const effectTargets = spell.effect.kind === "adjacent_pressure"
    ? pressureTargets
    : spell.effect.kind === "single_target_burst"
      ? Math.min(coveredTargets, spell.effect.max_targets)
      : coveredTargets;

  return {
    shape: spell.shape,
    manaCost: computeCastManaCost(spell, "novice"),
    cooldownMs: computeCastCooldownMs(spell, "novice"),
    coveredTargets,
    directDamage,
    primaryDamage: directDamage + bonusDamage,
    effectTargets,
    effect: spell.effect
  };
}

function strictlyDominates(outcome: ScenarioOutcome, expected: HeavyScenario["expected"]): boolean {
  const noWorse = outcome.shape === expected.shape
    && outcome.manaCost <= expected.manaCost
    && outcome.cooldownMs <= expected.cooldownMs
    && outcome.coveredTargets >= expected.coveredTargets
    && outcome.directDamage >= expected.directDamage
    && outcome.primaryDamage >= expected.primaryDamage
    && outcome.effectTargets >= expected.effectTargets
    && JSON.stringify(outcome.effect) === JSON.stringify(expected.effect);
  const strictlyBetter = outcome.manaCost < expected.manaCost
    || outcome.cooldownMs < expected.cooldownMs
    || outcome.coveredTargets > expected.coveredTargets
    || outcome.directDamage > expected.directDamage
    || outcome.primaryDamage > expected.primaryDamage
    || outcome.effectTargets > expected.effectTargets;
  return noWorse && strictlyBetter;
}

describe("shipped elemental spell effects", () => {
  it("matches Pato's literal approved roster contract for all twelve authored fields", () => {
    expect(spells.map(({ id, element, shape, weight, base_power, base_targets, master_discount }) => ({
      id, element, shape, weight, base_power, base_targets, master_discount
    }))).toEqual(APPROVED_ROSTER);
  });

  it("gives every spell the exact payload required by its element", () => {
    expect(spells).toHaveLength(12);
    for (const spell of spells) {
      expect(spell.effect, spell.id).toEqual(EXPECTED_EFFECT_BY_ELEMENT[spell.element]);
    }
  });

  it("keeps each effect's duration, target scope, and reapplication caps bounded by its elemental contract", () => {
    for (const spell of spells) {
      switch (spell.effect.kind) {
        case "adjacent_pressure":
          expect(spell.effect.range_tiles).toBe(1);
          expect(spell.effect.max_applications_per_target).toBe(1);
          break;
        case "weaken":
          expect(spell.effect.duration_ms).toBe(3000);
          expect(spell.effect.max_stacks).toBe(1);
          break;
        case "stun":
          expect(spell.effect.duration_ms).toBe(500);
          expect(spell.effect.reapply_lockout_ms).toBe(1500);
          expect(spell.effect.max_stacks).toBe(1);
          break;
        case "single_target_burst":
          expect(spell.effect.max_targets).toBe(1);
          break;
      }
    }
  });

  it("covers every shipped heavy spell exactly once with a nondominance scenario", () => {
    expect(HEAVY_SCENARIOS.map((scenario) => scenario.heavyId).sort()).toEqual(
      spells.filter((spell) => spell.weight === "heavy").map((spell) => spell.id).sort()
    );
  });

  it("keeps every heavy spell nondominated in a representative geometry, matchup, and utility scenario", () => {
    for (const scenario of HEAVY_SCENARIOS) {
      const heavy = spells.find((spell) => spell.id === scenario.heavyId);
      expect(heavy, scenario.heavyId).toBeDefined();
      expect(outcomeFor(heavy!, scenario), scenario.heavyId).toEqual(scenario.expected);

      const lowerTierOptions = spells.filter((spell) => spell.weight !== "heavy");
      for (const option of lowerTierOptions) {
        expect(strictlyDominates(outcomeFor(option, scenario), scenario.expected), `${option.id} dominates ${scenario.heavyId}`).toBe(false);
      }
    }
  });
});
