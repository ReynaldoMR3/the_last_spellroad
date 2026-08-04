import { describe, expect, it } from "vitest";
import { validateSpells, validateWaves } from "./validateContent";
import { ENEMY_REGISTRY } from "./enemyRegistry";
import type { SpellDefinition, WaveDefinition } from "./types";
import spells from "./spells/spells.json";
import level1 from "./waves/level-1.json";
import level2 from "./waves/level-2.json";
import level3 from "./waves/level-3.json";
import level4 from "./waves/level-4.json";
import boss1 from "./waves/boss-1.json";

function spell(overrides: Partial<SpellDefinition> = {}): SpellDefinition {
  return {
    id: "test_spell",
    element: "fire",
    shape: "circle",
    weight: "light",
    base_power: 1,
    base_targets: 1,
    master_discount: "cost",
    ...overrides
  };
}

function wave(overrides: Partial<WaveDefinition> = {}): WaveDefinition {
  return {
    level: 1,
    wave_index: 0,
    enemies: [{ type: "spellbound_thug", count: 1, spawn_delay_ms: 0 }],
    hp_modifier: 1,
    damage_modifier: 1,
    ...overrides
  };
}

describe("validateSpells", () => {
  it("accepts a well-formed spell", () => {
    expect(validateSpells([spell()])).toEqual([]);
  });

  it("rejects an unknown element/shape/weight/master_discount", () => {
    const errors = validateSpells([
      spell({ id: "a", element: "poison" as SpellDefinition["element"] }),
      spell({ id: "b", shape: "square" as SpellDefinition["shape"] }),
      spell({ id: "c", weight: "medium" as SpellDefinition["weight"] }),
      spell({ id: "d", master_discount: "mana" as SpellDefinition["master_discount"] })
    ]);
    expect(errors).toHaveLength(4);
    expect(errors[0]).toMatch(/unknown element/);
    expect(errors[1]).toMatch(/unknown shape/);
    expect(errors[2]).toMatch(/unknown weight/);
    expect(errors[3]).toMatch(/unknown master_discount/);
  });

  it("rejects a missing or duplicate id", () => {
    const errors = validateSpells([
      spell({ id: "" }),
      spell({ id: "dup" }),
      spell({ id: "dup" })
    ]);
    expect(errors).toEqual([
      "Spell <missing id>: id must be a non-empty string",
      "Spell dup: duplicate id"
    ]);
  });

  it("rejects two spells sharing the same default_loadout_slot", () => {
    const errors = validateSpells([
      spell({ id: "a", default_loadout_slot: 1 }),
      spell({ id: "b", default_loadout_slot: 1 })
    ]);
    expect(errors).toEqual(["Spell b: default_loadout_slot 1 duplicates a"]);
  });

  it("rejects a non-positive or non-integer default_loadout_slot", () => {
    expect(validateSpells([spell({ default_loadout_slot: 0 })])).toEqual([
      "Spell test_spell: default_loadout_slot must be a positive integer"
    ]);
    expect(validateSpells([spell({ default_loadout_slot: 1.5 })])).toEqual([
      "Spell test_spell: default_loadout_slot must be a positive integer"
    ]);
  });

  it("rejects more slotted spells than the hotbar has room for (6 slots)", () => {
    const spells = Array.from({ length: 7 }, (_, i) => spell({ id: `s${i}`, default_loadout_slot: i + 1 }));
    const errors = validateSpells(spells);
    expect(errors).toEqual([
      "7 spells carry a default_loadout_slot, but only 6 hotbar slots exist — the rest would never render"
    ]);
  });
});

describe("validateWaves", () => {
  it("accepts a well-formed wave using a registered enemy", () => {
    expect(validateWaves([wave()], ENEMY_REGISTRY)).toEqual([]);
  });

  it("flags an enemy type not present in the registry — the audit's soft-lock finding", () => {
    const errors = validateWaves(
      [wave({ enemies: [{ type: "not_a_real_enemy", count: 1, spawn_delay_ms: 0 }] })],
      ENEMY_REGISTRY
    );
    expect(errors).toEqual([
      'Wave level 1 wave 0 (file position 0): enemy type "not_a_real_enemy" is not in ENEMY_REGISTRY — every instance will be silently skipped at spawn'
    ]);
  });

  it("rejects a non-positive enemy count or negative spawn_delay_ms", () => {
    const errors = validateWaves(
      [
        wave({
          enemies: [
            { type: "spellbound_thug", count: 0, spawn_delay_ms: -5 }
          ]
        })
      ],
      ENEMY_REGISTRY
    );
    expect(errors).toEqual([
      'Wave level 1 wave 0 (file position 0): enemy "spellbound_thug" count must be a positive number',
      'Wave level 1 wave 0 (file position 0): enemy "spellbound_thug" spawn_delay_ms must be a non-negative number'
    ]);
  });

  it("rejects a wave with an empty enemies array", () => {
    expect(validateWaves([wave({ enemies: [] })], ENEMY_REGISTRY)).toEqual([
      "Wave level 1 wave 0 (file position 0): enemies must be a non-empty array"
    ]);
  });

  it("rejects non-numeric level/wave_index/hp_modifier/damage_modifier", () => {
    const errors = validateWaves(
      [wave({ level: "one" as unknown as number, hp_modifier: "1" as unknown as number })],
      ENEMY_REGISTRY
    );
    expect(errors).toEqual([
      "Wave level one wave 0 (file position 0): level must be a number",
      "Wave level one wave 0 (file position 0): hp_modifier must be a number"
    ]);
  });
});

describe("shipped content passes its own schema/build gate (issue #71)", () => {
  it("every spell in spells.json is structurally valid", () => {
    expect(validateSpells(spells as SpellDefinition[])).toEqual([]);
  });

  it("every wave file's enemies reference a registered ENEMY_REGISTRY type", () => {
    const allWaves = [...level1, ...level2, ...level3, ...level4, ...boss1] as WaveDefinition[];
    expect(validateWaves(allWaves, ENEMY_REGISTRY)).toEqual([]);
  });
});
