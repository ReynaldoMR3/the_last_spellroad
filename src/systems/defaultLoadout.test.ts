import { describe, expect, it } from "vitest";
import { selectDefaultLoadout } from "./defaultLoadout";
import type { SpellDefinition } from "../data/types";

function spell(id: string, default_loadout_slot?: number): SpellDefinition {
  return {
    id,
    element: "fire",
    shape: "circle",
    weight: "light",
    base_power: 1,
    base_targets: 1,
    master_discount: "cost",
    default_loadout_slot
  };
}

describe("selectDefaultLoadout", () => {
  it("selects only spells with a default_loadout_slot, in ascending slot order", () => {
    const spells = [spell("c", 3), spell("a", 1), spell("unequipped"), spell("b", 2)];
    expect(selectDefaultLoadout(spells).map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("matches the shipped 6-spell curated default loadout, in its original order", () => {
    const ids = ["arc_lance", "flame_sweep", "frost_nova", "stone_spike", "thunder_dome", "magma_lance"];
    const spells = ids.map((id, i) => spell(id, i + 1));
    // Also include unequipped spells to confirm they're excluded, not just ignored by luck.
    spells.push(spell("flare_jab"), spell("spark_ring"));
    expect(selectDefaultLoadout(spells).map((s) => s.id)).toEqual(ids);
  });

  it("returns an empty array when no spell has a default_loadout_slot", () => {
    expect(selectDefaultLoadout([spell("a"), spell("b")])).toEqual([]);
  });

  it("returns an empty array for an empty spell list", () => {
    expect(selectDefaultLoadout([])).toEqual([]);
  });
});
