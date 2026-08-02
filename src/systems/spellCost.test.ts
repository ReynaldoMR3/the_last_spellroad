import { describe, expect, it } from "vitest";
import { computeCastManaCost } from "./spellCost";
import type { SpellDefinition } from "../data/types";

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
    weight: "standard",
    base_power: 10,
    base_targets: 1,
    master_discount: "cooldown",
    ...overrides
  } as SpellDefinition;
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
