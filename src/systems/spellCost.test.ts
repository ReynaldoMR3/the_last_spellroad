import { describe, expect, it } from "vitest";
import { computeCastCooldownMs, computeCastManaCost } from "./spellCost";
import type { SpellDefinition } from "../data/types";
import spellsData from "../data/spells/spells.json";

/**
 * backlog 2.28 / issue #54 — `computeCastManaCost` is the Mana-cost formula
 * `SpellCaster.tryCast` already computed inline, extracted so `handleHotbarPress`'s new
 * pre-check (SpellroadScene.ts) and `tryCast` itself share one source of truth instead of
 * two copies of the same weight-class-base-cost-minus-Master-discount arithmetic that could
 * silently drift apart.
 */
function makeSpell(overrides: Partial<SpellDefinition> = {}): SpellDefinition {
  return {
    id: "test_spell",
    shape: "circle",
    element: "fire",
    weight: "standard",
    base_power: 10,
    base_targets: 1,
    master_discount: "cooldown",
    effect: { kind: "adjacent_pressure", range_tiles: 1, bonus_damage: 2, max_applications_per_target: 1 },
    ...overrides
  };
}

describe("computeCastManaCost", () => {
  it("returns the weight class's base cost at novice/adept tiers, regardless of master_discount", () => {
    expect(computeCastManaCost(makeSpell({ weight: "light", master_discount: "cost" }), "novice")).toBe(10);
    expect(computeCastManaCost(makeSpell({ weight: "standard", master_discount: "cost" }), "adept")).toBe(20);
    expect(computeCastManaCost(makeSpell({ weight: "heavy", master_discount: "cost" }), "adept")).toBe(35);
  });

  it("applies the -10% Master discount only when master_discount is 'cost'", () => {
    // heavy base 35 * 0.9 = 31.5 -> rounds to 32
    expect(computeCastManaCost(makeSpell({ weight: "heavy", master_discount: "cost" }), "master")).toBe(32);
    // light base 10 * 0.9 = 9
    expect(computeCastManaCost(makeSpell({ weight: "light", master_discount: "cost" }), "master")).toBe(9);
  });

  it("leaves cost at the full base when master_discount is 'cooldown', even at Master tier", () => {
    expect(computeCastManaCost(makeSpell({ weight: "standard", master_discount: "cooldown" }), "master")).toBe(20);
  });
});

/**
 * backlog 2.29 / issue #55 — `computeCastCooldownMs` is the cooldown-duration formula
 * `SpellCaster.tryCast` already computed inline, extracted the same way `computeCastManaCost`
 * was for the cost side (backlog 2.28 / issue #54) so `tryCast` and the hotbar's new
 * cooldown-fraction display (`SpellCaster.cooldownDurationMs` -> `computeCooldownDisplay`,
 * hotbarLayout.ts) share one source of truth instead of two copies of the same ternary.
 */
describe("computeCastCooldownMs", () => {
  it("returns the weight class's base cooldown at novice/adept tiers, regardless of master_discount", () => {
    expect(computeCastCooldownMs(makeSpell({ weight: "light", master_discount: "cooldown" }), "novice")).toBe(2000);
    expect(computeCastCooldownMs(makeSpell({ weight: "standard", master_discount: "cooldown" }), "adept")).toBe(4000);
    expect(computeCastCooldownMs(makeSpell({ weight: "heavy", master_discount: "cooldown" }), "adept")).toBe(8000);
  });

  it("applies the -10% Master discount only when master_discount is 'cooldown'", () => {
    // heavy base 8000 * 0.9 = 7200
    expect(computeCastCooldownMs(makeSpell({ weight: "heavy", master_discount: "cooldown" }), "master")).toBe(7200);
    // light base 2000 * 0.9 = 1800
    expect(computeCastCooldownMs(makeSpell({ weight: "light", master_discount: "cooldown" }), "master")).toBe(1800);
  });

  it("leaves cooldown at the full base when master_discount is 'cost', even at Master tier", () => {
    expect(computeCastCooldownMs(makeSpell({ weight: "standard", master_discount: "cost" }), "master")).toBe(4000);
  });
});

describe("shipped spell economy remains independent of elemental effects", () => {
  const spells = spellsData as SpellDefinition[];
  const expectedByWeight = {
    light: { cost: 10, cooldownMs: 2000 },
    standard: { cost: 20, cooldownMs: 4000 },
    heavy: { cost: 35, cooldownMs: 8000 }
  } as const;

  it("keeps every authored spell on its Pato weight-class Mana and cooldown baseline", () => {
    for (const spell of spells) {
      expect(computeCastManaCost(spell, "novice"), `${spell.id} Mana`).toBe(expectedByWeight[spell.weight].cost);
      expect(computeCastCooldownMs(spell, "novice"), `${spell.id} cooldown`).toBe(expectedByWeight[spell.weight].cooldownMs);
    }
  });

  it("applies the unchanged Master discount to exactly the authored stat", () => {
    for (const spell of spells) {
      const baseline = expectedByWeight[spell.weight];
      expect(computeCastManaCost(spell, "master"), `${spell.id} Mana`).toBe(
        spell.master_discount === "cost" ? Math.round(baseline.cost * 0.9) : baseline.cost
      );
      expect(computeCastCooldownMs(spell, "master"), `${spell.id} cooldown`).toBe(
        spell.master_discount === "cooldown" ? Math.round(baseline.cooldownMs * 0.9) : baseline.cooldownMs
      );
    }
  });
});
