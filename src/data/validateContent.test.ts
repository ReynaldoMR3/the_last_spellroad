import { describe, expect, it } from "vitest";
import { validateSpells, validateWaves } from "./validateContent";
import { MONSTER_REGISTRY } from "./monsterRegistry";
import type { SpellDefinition, WaveDefinition } from "./types";
import spells from "./spells/spells.json";
import level1 from "./waves/level-1.json";
import level2 from "./waves/level-2.json";
import level3 from "./waves/level-3.json";
import level4 from "./waves/level-4.json";
import level5 from "./waves/level-5.json";
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
    effect: { kind: "adjacent_pressure", range_tiles: 1, bonus_damage: 2, max_applications_per_target: 1 },
    ...overrides
  };
}

function wave(overrides: Partial<WaveDefinition> = {}): WaveDefinition {
  return {
    level: 1,
    wave_index: 0,
    enemies: [{ type: "monster_m01", archetype: "melee", element: "fire", count: 1, spawn_delay_ms: 0 }],
    hp_modifier: 1,
    damage_modifier: 1,
    ...overrides
  };
}

describe("validateSpells", () => {
  it("accepts a well-formed spell", () => {
    expect(validateSpells([spell()])).toEqual([]);
  });

  it("rejects a missing element in the current spell schema", () => {
    expect(
      validateSpells([spell({ element: undefined as unknown as SpellDefinition["element"] })])
    ).toEqual(['Spell test_spell: unknown element "undefined"']);
  });

  it("rejects a missing, mismatched, malformed, or extra spell effect", () => {
    const errors = validateSpells([
      spell({ id: "missing", effect: undefined }),
      spell({ id: "mismatched", effect: { kind: "stun", duration_ms: 500, reapply_lockout_ms: 1500, max_stacks: 1 } }),
      spell({ id: "malformed", effect: { kind: "adjacent_pressure", range_tiles: 2, bonus_damage: 2, max_applications_per_target: 1 } as never }),
      spell({ id: "extra", effect: { kind: "adjacent_pressure", range_tiles: 1, bonus_damage: 2, max_applications_per_target: 1, extra: true } as never })
    ]);

    expect(errors).toEqual([
      "Spell missing: effect is required",
      'Spell mismatched: effect kind "stun" does not match element "fire"',
      "Spell malformed: fire effect range_tiles must be 1",
      "Spell extra: fire effect has unknown key \"extra\""
    ]);
  });

  it("rejects null and non-object required effect payloads without throwing", () => {
    const validate = () => validateSpells([
      spell({ id: "null-effect", effect: null as never }),
      spell({ id: "string-effect", effect: "stun" as never })
    ]);
    expect(validate).not.toThrow();
    expect(validate()).toEqual([
      "Spell null-effect: effect must be an object",
      "Spell string-effect: effect must be an object"
    ]);
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

  it("rejects non-finite, non-positive, or fractional combat numbers", () => {
    expect(validateSpells([
      spell({ id: "nan-power", base_power: Number.NaN }),
      spell({ id: "infinite-power", base_power: Number.POSITIVE_INFINITY }),
      spell({ id: "zero-power", base_power: 0 }),
      spell({ id: "fractional-targets", base_targets: 1.5 })
    ])).toEqual([
      "Spell nan-power: base_power must be a finite positive number",
      "Spell infinite-power: base_power must be a finite positive number",
      "Spell zero-power: base_power must be a finite positive number",
      "Spell fractional-targets: base_targets must be a positive integer"
    ]);
  });

  it("requires the shipped fixed loadout to occupy exactly slots 1 through 6", () => {
    const sparse = [1, 2, 3, 4, 5, 7].map((slot) =>
      spell({ id: `slot-${slot}`, default_loadout_slot: slot })
    );
    expect(validateSpells(sparse, { requireFixedDefaultLoadout: true })).toContain(
      "Default loadout slots must be exactly 1, 2, 3, 4, 5, 6; found 1, 2, 3, 4, 5, 7"
    );
  });
});

describe("validateWaves", () => {
  it("accepts a well-formed wave using a registered enemy", () => {
    expect(validateWaves([wave()], MONSTER_REGISTRY)).toEqual([]);
  });

  it("rejects an enemy type that is not a monster-registry ID", () => {
    const errors = validateWaves(
      [wave({ enemies: [{ type: "not_a_real_enemy", archetype: "melee", element: "fire", count: 1, spawn_delay_ms: 0 }] })],
      MONSTER_REGISTRY
    );
    expect(errors).toEqual([
      'Wave level 1 wave 0 (file position 0): enemy type "not_a_real_enemy" is not in MONSTER_REGISTRY — every instance will be silently skipped at spawn'
    ]);
  });

  it("rejects a missing or invalid active element", () => {
    const errors = validateWaves([
      wave({ enemies: [{ type: "monster_m01", archetype: "melee", element: undefined as never, count: 1, spawn_delay_ms: 0 }] }),
      wave({ wave_index: 1, enemies: [{ type: "monster_m01", archetype: "melee", element: "poison" as never, count: 1, spawn_delay_ms: 0 }] })
    ], MONSTER_REGISTRY);
    expect(errors).toEqual([
      'Wave level 1 wave 0 (file position 0): enemy "monster_m01" must have exactly one valid element',
      'Wave level 1 wave 1 (file position 1): enemy "monster_m01" must have exactly one valid element'
    ]);
  });

  it("rejects an authored archetype that disagrees with the monster registry", () => {
    expect(validateWaves([
      wave({ enemies: [{ type: "monster_m01", archetype: "ranged", element: "fire", count: 1, spawn_delay_ms: 0 }] })
    ], MONSTER_REGISTRY)).toEqual([
      'Wave level 1 wave 0 (file position 0): enemy "monster_m01" archetype "ranged" does not match registry archetype "melee"'
    ]);
  });

  it("rejects player-facing name fields on authored enemy entries", () => {
    expect(validateWaves([
      wave({ enemies: [{ type: "monster_m01", archetype: "melee", element: "fire", count: 1, spawn_delay_ms: 0, name: "Ash Footman" } as never] })
    ], MONSTER_REGISTRY)).toEqual([
      'Wave level 1 wave 0 (file position 0): enemy "monster_m01" must not author a player-facing name field'
    ]);
  });

  it("rejects a boss outside the final Level 5 wave", () => {
    expect(validateWaves([
      wave({ level: 4, wave_index: 2, is_boss: true, enemies: [{ type: "monster_boss_01", archetype: "melee", element: "fire", resistant_elements: ["ice", "lightning"], count: 1, spawn_delay_ms: 0 }] }),
      wave({ level: 5, wave_index: 3 })
    ], MONSTER_REGISTRY)).toEqual([
      "Wave level 4 wave 2 (file position 0): is_boss phases may appear only in Level 5",
      'Wave level 4 wave 2 (file position 0): monster_boss_01 may appear only in Level 5\'s final wave'
    ]);
  });

  it("accepts ordered unique Level 5 phases with the boss in the final runtime position", () => {
    const regular = wave({ level: 5, wave_index: 0 });
    const phaseOne = wave({ level: 5, wave_index: 1, is_boss: true });
    const finalPhase = wave({
      level: 5,
      wave_index: 2,
      is_boss: true,
      enemies: [{ type: "monster_boss_01", archetype: "melee", element: "fire", resistant_elements: ["ice", "lightning"], count: 1, spawn_delay_ms: 0 }]
    });

    expect(validateWaves([regular, phaseOne, finalPhase], MONSTER_REGISTRY, { requireFinalBoss: true })).toEqual([]);
  });

  it("rejects duplicate and out-of-order wave indices within a level", () => {
    expect(validateWaves([
      wave({ level: 2, wave_index: 0 }),
      wave({ level: 2, wave_index: 2 }),
      wave({ level: 2, wave_index: 2 }),
      wave({ level: 2, wave_index: 1 })
    ], MONSTER_REGISTRY)).toEqual([
      "Wave level 2 wave 2 (file position 2): duplicate wave_index 2 for level 2",
      "Wave level 2 wave 1 (file position 3): wave_index must be strictly ordered within level 2; previous index was 2"
    ]);
  });

  it("rejects a numerically final boss when a later runtime entry follows it", () => {
    const boss = wave({
      level: 5,
      wave_index: 2,
      is_boss: true,
      enemies: [{ type: "monster_boss_01", archetype: "melee", element: "fire", resistant_elements: ["ice", "lightning"], count: 1, spawn_delay_ms: 0 }]
    });
    const followingRuntimeWave = wave({ level: 4, wave_index: 0 });

    expect(validateWaves([boss, followingRuntimeWave], MONSTER_REGISTRY)).toContain(
      "Wave level 5 wave 2 (file position 0): monster_boss_01 must appear in the final campaign array position"
    );
  });

  it("rejects a boss entry whose containing final wave is not a boss phase", () => {
    const boss = wave({
      level: 5,
      wave_index: 0,
      is_boss: false,
      enemies: [{ type: "monster_boss_01", archetype: "melee", element: "fire", resistant_elements: ["ice", "lightning"], count: 1, spawn_delay_ms: 0 }]
    });

    expect(validateWaves([boss], MONSTER_REGISTRY)).toContain(
      "Wave level 5 wave 0 (file position 0): monster_boss_01 must be contained by an is_boss wave"
    );
  });

  it("rejects duplicate boss instances in the final Level 5 wave", () => {
    expect(validateWaves([
      wave({ level: 5, wave_index: 3, is_boss: true, enemies: [{ type: "monster_boss_01", archetype: "melee", element: "fire", resistant_elements: ["ice", "lightning"], count: 2, spawn_delay_ms: 0 }] })
    ], MONSTER_REGISTRY)).toEqual([
      "Shipped waves must contain exactly one monster_boss_01 instance; found 2"
    ]);
  });

  it("rejects shipped content with no final boss", () => {
    expect(validateWaves([wave({ level: 5, wave_index: 0 })], MONSTER_REGISTRY, { requireFinalBoss: true })).toEqual([
      "Shipped waves must contain exactly one monster_boss_01 instance; found 0"
    ]);
  });

  it("rejects the shipped boss when its required resistance pair is missing", () => {
    expect(validateWaves([
      wave({ level: 5, wave_index: 3, is_boss: true, enemies: [{ type: "monster_boss_01", archetype: "melee", element: "fire", count: 1, spawn_delay_ms: 0 }] })
    ], MONSTER_REGISTRY)).toEqual([
      'Wave level 5 wave 3 (file position 0): monster_boss_01 must be active fire with resistant_elements ["ice","lightning"]'
    ]);
  });

  it("rejects a non-positive enemy count or negative spawn_delay_ms", () => {
    const errors = validateWaves(
      [
        wave({
          enemies: [
            { type: "monster_m01", archetype: "melee", element: "fire", count: 0, spawn_delay_ms: -5 }
          ]
        })
      ],
      MONSTER_REGISTRY
    );
    expect(errors).toEqual([
      'Wave level 1 wave 0 (file position 0): enemy "monster_m01" count must be a finite positive integer',
      'Wave level 1 wave 0 (file position 0): enemy "monster_m01" spawn_delay_ms must be a finite non-negative number'
    ]);
  });

  it("rejects fractional counts and non-finite wave numbers before they can soft-lock progression", () => {
    const errors = validateWaves([wave({
      level: Number.POSITIVE_INFINITY,
      wave_index: 0.5,
      hp_modifier: Number.NaN,
      damage_modifier: 0,
      enemies: [{ type: "monster_m01", archetype: "melee", element: "fire", count: 1.5, spawn_delay_ms: Number.POSITIVE_INFINITY }]
    })], MONSTER_REGISTRY);
    expect(errors).toEqual([
      "Wave level Infinity wave 0.5 (file position 0): level must be a finite positive integer",
      "Wave level Infinity wave 0.5 (file position 0): wave_index must be a finite non-negative integer",
      "Wave level Infinity wave 0.5 (file position 0): hp_modifier must be a finite positive number",
      "Wave level Infinity wave 0.5 (file position 0): damage_modifier must be a finite positive number",
      'Wave level Infinity wave 0.5 (file position 0): enemy "monster_m01" count must be a finite positive integer',
      'Wave level Infinity wave 0.5 (file position 0): enemy "monster_m01" spawn_delay_ms must be a finite non-negative number'
    ]);
  });

  it("rejects boss flags outside Level 5 and ordinary waves after the boss-phase suffix starts", () => {
    const errors = validateWaves([
      wave({ level: 4, wave_index: 0, is_boss: true }),
      wave({ level: 5, wave_index: 0, is_boss: true }),
      wave({ level: 5, wave_index: 1 })
    ], MONSTER_REGISTRY);
    expect(errors).toContain("Wave level 4 wave 0 (file position 0): is_boss phases may appear only in Level 5");
    expect(errors).toContain("Wave level 5 wave 1 (file position 2): ordinary waves cannot follow the Level 5 boss-phase suffix");
  });

  it("rejects defined non-boolean is_boss values before runtime truthiness can activate trial behavior", () => {
    const errors = validateWaves([
      wave({ level: 2, wave_index: 0, is_boss: "true" as never }),
      wave({ level: 2, wave_index: 1, is_boss: 1 as never })
    ], MONSTER_REGISTRY);
    expect(errors).toEqual([
      "Wave level 2 wave 0 (file position 0): is_boss must be a boolean when defined",
      "Wave level 2 wave 1 (file position 1): is_boss must be a boolean when defined"
    ]);
  });

  it("rejects malformed resistance values without throwing", () => {
    for (const resistant_elements of [{ length: 2 }, "ice,lightning", null]) {
      const validate = () => validateWaves([wave({
        level: 5,
        wave_index: 3,
        is_boss: true,
        enemies: [{ type: "monster_boss_01", archetype: "melee", element: "fire", resistant_elements, count: 1, spawn_delay_ms: 0 } as never]
      })], MONSTER_REGISTRY);
      expect(validate).not.toThrow();
      expect(validate()).toContain(
        'Wave level 5 wave 3 (file position 0): monster_boss_01 must be active fire with resistant_elements ["ice","lightning"]'
      );
    }
  });

  it("rejects a wave with an empty enemies array", () => {
    expect(validateWaves([wave({ enemies: [] })], MONSTER_REGISTRY)).toEqual([
      "Wave level 1 wave 0 (file position 0): enemies must be a non-empty array"
    ]);
  });

  it("rejects non-numeric level/wave_index/hp_modifier/damage_modifier", () => {
    const errors = validateWaves(
      [wave({ level: "one" as unknown as number, hp_modifier: "1" as unknown as number })],
      MONSTER_REGISTRY
    );
    expect(errors).toEqual([
      "Wave level one wave 0 (file position 0): level must be a number",
      "Wave level one wave 0 (file position 0): hp_modifier must be a number"
    ]);
  });
});

describe("shipped content passes its own schema/build gate (issue #71)", () => {
  it("every spell in spells.json is structurally valid", () => {
    expect(validateSpells(spells as SpellDefinition[], { requireFixedDefaultLoadout: true })).toEqual([]);
  });

  it("every shipped wave satisfies the elemental monster contract", () => {
    const allWaves = [...level1, ...level2, ...level3, ...level4, ...level5, ...boss1] as WaveDefinition[];
    expect(validateWaves(allWaves, MONSTER_REGISTRY, { requireFinalBoss: true })).toEqual([]);
  });
});
