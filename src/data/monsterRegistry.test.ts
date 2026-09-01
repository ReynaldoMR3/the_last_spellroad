import { describe, expect, it } from "vitest";
import { MONSTER_REGISTRY, validateMonsterAssignment } from "./monsterRegistry";

const REGULAR_MONSTER_IDS = [
  "monster_m01", "monster_m02", "monster_m03", "monster_m04",
  "monster_r01", "monster_r02", "monster_r03", "monster_r04",
  "monster_d01", "monster_d02", "monster_d03", "monster_d04"
];

describe("MONSTER_REGISTRY", () => {
  it("gives every regular visual ID one sprite key, one archetype, and one asset record", () => {
    expect(REGULAR_MONSTER_IDS).toHaveLength(12);
    for (const id of REGULAR_MONSTER_IDS) {
      const monster = MONSTER_REGISTRY[id];
      expect(monster.kind).toBe("regular");
      expect(monster.spriteKey).toBe(`monster-${id}`);
      expect(["melee", "ranged", "debuffer"]).toContain(monster.archetype);
      expect(monster.asset).toEqual(expect.objectContaining({ id: id }));
    }
  });

  it("keeps the final boss as a distinct visual identity", () => {
    expect(MONSTER_REGISTRY.monster_boss_01).toMatchObject({
      kind: "boss",
      spriteKey: "monster-monster_boss_01",
      archetype: "melee",
      asset: { id: "monster_boss_01" }
    });
  });

  it("preserves both existing debuffer variants across the four debuffer visuals", () => {
    expect([
      MONSTER_REGISTRY.monster_d01.debuffVariant,
      MONSTER_REGISTRY.monster_d02.debuffVariant,
      MONSTER_REGISTRY.monster_d03.debuffVariant,
      MONSTER_REGISTRY.monster_d04.debuffVariant
    ]).toEqual(["speed", "mana_regen", "speed", "mana_regen"]);
  });
});

describe("validateMonsterAssignment", () => {
  it("rejects unknown IDs, omitted elements, and repeated active type/element assignments", () => {
    const issues = validateMonsterAssignment([
      { type: "unknown_monster", element: "fire" },
      { type: "monster_m01" },
      { type: "monster_m02", element: "ice" },
      { type: "monster_m02", element: "ice" }
    ]);

    expect(issues.map((issue) => issue.code)).toEqual([
      "unknown-monster",
      "missing-element",
      "duplicate-active-assignment"
    ]);
  });

  it("accepts only the fixed fire boss with its ice/lightning resistance pair", () => {
    expect(validateMonsterAssignment({ type: "monster_boss_01", element: "fire", resistant_elements: ["ice", "lightning"] })).toEqual([]);
  });

  it("requires the boss resistance pair instead of treating omission as valid", () => {
    expect(validateMonsterAssignment({ type: "monster_boss_01", element: "fire" })).toEqual([
      { code: "invalid-resistant-elements", message: 'Monster "monster_boss_01" has an invalid resistance pair' }
    ]);
  });

  it("rejects malformed boss resistance pairs and resistance declarations on regular monsters", () => {
    const invalidAssignments = [
      { type: "monster_boss_01", element: "fire", resistant_elements: ["ice"] },
      { type: "monster_boss_01", element: "fire", resistant_elements: ["ice", "poison"] },
      { type: "monster_boss_01", element: "fire", resistant_elements: ["fire", "ice"] },
      { type: "monster_boss_01", element: "ice", resistant_elements: ["fire", "lightning"] },
      { type: "monster_m01", element: "fire", resistant_elements: ["ice", "lightning"] }
    ];
    for (const assignment of invalidAssignments) {
      expect(validateMonsterAssignment(assignment as never).map((issue) => issue.code)).toEqual(["invalid-resistant-elements"]);
    }
  });

  it("fails closed for non-array resistance payloads", () => {
    for (const resistant_elements of [{ length: 2 }, "ice,lightning", null]) {
      const validate = () => validateMonsterAssignment({
        type: "monster_boss_01",
        element: "fire",
        resistant_elements
      } as never);
      expect(validate).not.toThrow();
      expect(validate()).toEqual([
        { code: "invalid-resistant-elements", message: 'Monster "monster_boss_01" has an invalid resistance pair' }
      ]);
    }
  });
});
