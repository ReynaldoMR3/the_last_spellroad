import { describe, expect, it } from "vitest";
import type { Element, SpellDefinition } from "../data/types";
import * as elementalDamage from "./elementalDamage";
import { calculateElementalDamage, getElementalMultiplier } from "./elementalDamage";

interface TestTarget {
  id: string;
  x: number;
  y: number;
  spawnOrder: number;
  element: Element;
  resistantElements: readonly Element[];
}

interface TestResolvedHit {
  target: TestTarget;
  directDamage: number;
  effectDamage: number;
  totalDamage: number;
  outcome: "advantage" | "disadvantage" | "neutral" | "resistance";
  statusEffect?:
    | { kind: "weaken"; outgoingDamageMultiplier: number; durationMs: number }
    | { kind: "stun"; durationMs: number; reapplyLockoutMs: number };
}

type ResolveElementalCast = (input: {
  spell: Pick<SpellDefinition, "element" | "base_power" | "effect">;
  masteryPowerBonus: number;
  maxTargets: number;
  caster: { x: number; y: number };
  primaryOrigin: { x: number; y: number };
  targets: readonly TestTarget[];
}) => TestResolvedHit[];

type SnapshotEnemyElementalState = (entry: {
  element: Element;
  resistant_elements?: Element[];
}) => { element: Element; resistantElements: readonly Element[] };

function resolveElementalCast(): ResolveElementalCast {
  const candidate = elementalDamage as typeof elementalDamage & {
    resolveElementalCast?: ResolveElementalCast;
  };
  expect(candidate.resolveElementalCast).toBeTypeOf("function");
  return candidate.resolveElementalCast!;
}

function snapshotEnemyElementalState(): SnapshotEnemyElementalState {
  const candidate = elementalDamage as typeof elementalDamage & {
    snapshotEnemyElementalState?: SnapshotEnemyElementalState;
  };
  expect(candidate.snapshotEnemyElementalState).toBeTypeOf("function");
  return candidate.snapshotEnemyElementalState!;
}

function target(
  id: string,
  element: Element,
  x: number,
  y: number,
  spawnOrder: number,
  resistantElements: readonly Element[] = []
): TestTarget {
  return { id, element, x, y, spawnOrder, resistantElements };
}

describe("getElementalMultiplier", () => {
  it.each([
    ["fire", "fire", 1], ["fire", "ice", 1.25], ["fire", "earth", 1], ["fire", "lightning", 0.75],
    ["ice", "fire", 0.75], ["ice", "ice", 1], ["ice", "earth", 1.25], ["ice", "lightning", 1],
    ["earth", "fire", 1], ["earth", "ice", 0.75], ["earth", "earth", 1], ["earth", "lightning", 1.25],
    ["lightning", "fire", 1.25], ["lightning", "ice", 1], ["lightning", "earth", 0.75], ["lightning", "lightning", 1]
  ] as const)("uses the fixed %s spell versus %s monster multiplier", (spellElement, monsterElement, expected) => {
    expect(getElementalMultiplier(spellElement, monsterElement)).toBe(expected);
  });
});

describe("calculateElementalDamage", () => {
  it("adds the Mastery power bonus before applying an advantageous elemental scalar", () => {
    expect(calculateElementalDamage(3, "fire", "ice", 1)).toBe(5);
  });

  it("uses resistance instead of, rather than alongside, the ordinary matchup", () => {
    expect(calculateElementalDamage(7, "ice", "fire", 2, 0.5)).toBe(5);
  });

  it("rounds once after the Mastery bonus and elemental scalar have both been applied", () => {
    expect(calculateElementalDamage(2, "fire", "ice", 1)).toBe(4);
  });

  it("preserves neutral unmodified damage", () => {
    expect(calculateElementalDamage(7, "earth", "earth")).toBe(7);
  });
});

describe("resolveElementalCast", () => {
  it("calculates every AoE target against that target's own element", () => {
    const hits = resolveElementalCast()({
      spell: {
        element: "fire",
        base_power: 3,
        effect: { kind: "adjacent_pressure", range_tiles: 1, bonus_damage: 2, max_applications_per_target: 1 }
      },
      masteryPowerBonus: 1,
      maxTargets: 3,
      caster: { x: 0, y: 0 },
      primaryOrigin: { x: 0, y: 0 },
      targets: [
        target("same", "fire", 80, 0, 1),
        target("advantage", "ice", 80, 0, 2),
        target("disadvantage", "lightning", 80, 0, 3)
      ]
    });

    expect(hits.map(({ target: hitTarget, directDamage, outcome }) => [hitTarget.id, directDamage, outcome])).toEqual([
      ["same", 4, "neutral"],
      ["advantage", 5, "advantage"],
      ["disadvantage", 3, "disadvantage"]
    ]);
  });

  it("replaces the ordinary matchup only when the target resists the spell element", () => {
    const hits = resolveElementalCast()({
      spell: {
        element: "ice",
        base_power: 7,
        effect: { kind: "weaken", outgoing_damage_multiplier: 0.8, duration_ms: 3000, max_stacks: 1 }
      },
      masteryPowerBonus: 2,
      maxTargets: 2,
      caster: { x: 0, y: 0 },
      primaryOrigin: { x: 0, y: 0 },
      targets: [
        target("ordinary-fire", "fire", 40, 0, 1),
        target("resistant-fire", "fire", 60, 0, 2, ["ice", "lightning"])
      ]
    });

    expect(hits.map(({ directDamage, outcome }) => ({ directDamage, outcome }))).toEqual([
      { directDamage: 7, outcome: "disadvantage" },
      { directDamage: 5, outcome: "resistance" }
    ]);
  });

  it("adds fire pressure once after direct damage without remultiplying the bonus", () => {
    const hits = resolveElementalCast()({
      spell: {
        element: "fire",
        base_power: 3,
        effect: { kind: "adjacent_pressure", range_tiles: 1, bonus_damage: 2, max_applications_per_target: 1 }
      },
      masteryPowerBonus: 1,
      maxTargets: 2,
      caster: { x: 0, y: 0 },
      primaryOrigin: { x: 0, y: 0 },
      targets: [target("adjacent", "ice", 16, 0, 1), target("distant", "ice", 17, 0, 2)]
    });

    expect(hits.map(({ directDamage, effectDamage, totalDamage }) => ({ directDamage, effectDamage, totalDamage }))).toEqual([
      { directDamage: 5, effectDamage: 2, totalDamage: 7 },
      { directDamage: 5, effectDamage: 0, totalDamage: 5 }
    ]);
  });

  it("gives earth burst to one nearest primary target with stable spawn-order ties", () => {
    const hits = resolveElementalCast()({
      spell: {
        element: "earth",
        base_power: 5,
        effect: { kind: "single_target_burst", bonus_damage: 3, max_targets: 1 }
      },
      masteryPowerBonus: 0,
      maxTargets: 3,
      caster: { x: 0, y: 0 },
      primaryOrigin: { x: 100, y: 100 },
      targets: [
        target("later-spawn", "earth", 90, 100, 9),
        target("first-spawn", "earth", 110, 100, 2),
        target("farther", "earth", 130, 100, 1)
      ]
    });

    expect(hits.map(({ target: hitTarget, effectDamage }) => [hitTarget.id, effectDamage])).toEqual([
      ["later-spawn", 0],
      ["first-spawn", 3],
      ["farther", 0]
    ]);
  });

  it("returns the authored ice and lightning status payloads without expanding target count", () => {
    const common = {
      masteryPowerBonus: 0,
      maxTargets: 1,
      caster: { x: 0, y: 0 },
      primaryOrigin: { x: 0, y: 0 },
      targets: [target("first", "fire", 40, 0, 1), target("second", "fire", 50, 0, 2)]
    };
    const iceHits = resolveElementalCast()({
      ...common,
      spell: {
        element: "ice",
        base_power: 4,
        effect: { kind: "weaken", outgoing_damage_multiplier: 0.8, duration_ms: 3000, max_stacks: 1 }
      }
    });
    const lightningHits = resolveElementalCast()({
      ...common,
      spell: {
        element: "lightning",
        base_power: 3,
        effect: { kind: "stun", duration_ms: 500, reapply_lockout_ms: 1500, max_stacks: 1 }
      }
    });

    expect(iceHits).toHaveLength(1);
    expect(iceHits[0].statusEffect).toEqual({ kind: "weaken", outgoingDamageMultiplier: 0.8, durationMs: 3000 });
    expect(lightningHits).toHaveLength(1);
    expect(lightningHits[0].statusEffect).toEqual({ kind: "stun", durationMs: 500, reapplyLockoutMs: 1500 });
  });
});

describe("snapshotEnemyElementalState", () => {
  it("copies explicit wave element/resistance without deriving either from monster identity", () => {
    const bossResistance: Element[] = ["ice", "lightning"];
    const boss = snapshotEnemyElementalState()({ element: "fire", resistant_elements: bossResistance });
    const ordinary = snapshotEnemyElementalState()({ element: "lightning" });
    bossResistance[0] = "earth";

    expect(boss).toEqual({ element: "fire", resistantElements: ["ice", "lightning"] });
    expect(Object.isFrozen(boss.resistantElements)).toBe(true);
    expect(ordinary).toEqual({ element: "lightning", resistantElements: [] });
  });
});
