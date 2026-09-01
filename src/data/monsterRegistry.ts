import type { DebuffVariant, Element, EnemyArchetype } from "./types";

export interface MonsterAssetRecord {
  id: string;
  source: "open-game-art-tiny-creatures";
  license: "CC0-1.0";
  url: string;
  tileNumber: number;
}

export interface MonsterRegistryEntry {
  kind: "regular" | "boss";
  archetype: EnemyArchetype;
  spriteKey: string;
  asset: MonsterAssetRecord;
  debuffVariant?: DebuffVariant;
}

export interface MonsterAssignment {
  type: string;
  element?: Element;
  resistant_elements?: Element[];
}

export interface ValidationIssue {
  code: "unknown-monster" | "missing-element" | "invalid-element" | "duplicate-active-assignment" | "invalid-resistant-elements";
  message: string;
}

function asset(id: string, tileNumber: number): MonsterAssetRecord {
  return {
    id,
    source: "open-game-art-tiny-creatures",
    license: "CC0-1.0",
    url: `assets/third-party/tiny-creatures/Tiles/tile_${String(tileNumber).padStart(4, "0")}.png`,
    tileNumber
  };
}

function regular(id: string, archetype: EnemyArchetype, tileNumber: number, debuffVariant?: DebuffVariant): MonsterRegistryEntry {
  return { kind: "regular", archetype, spriteKey: `monster-${id}`, asset: asset(id, tileNumber), debuffVariant };
}

export const MONSTER_REGISTRY: Record<string, MonsterRegistryEntry> = {
  monster_m01: regular("monster_m01", "melee", 128),
  monster_m02: regular("monster_m02", "melee", 141),
  monster_m03: regular("monster_m03", "melee", 142),
  monster_m04: regular("monster_m04", "melee", 143),
  monster_r01: regular("monster_r01", "ranged", 33),
  monster_r02: regular("monster_r02", "ranged", 37),
  monster_r03: regular("monster_r03", "ranged", 131),
  monster_r04: regular("monster_r04", "ranged", 169),
  monster_d01: regular("monster_d01", "debuffer", 5, "speed"),
  monster_d02: regular("monster_d02", "debuffer", 67, "mana_regen"),
  monster_d03: regular("monster_d03", "debuffer", 76, "speed"),
  monster_d04: regular("monster_d04", "debuffer", 87, "mana_regen"),
  monster_boss_01: {
    kind: "boss",
    archetype: "melee",
    spriteKey: "monster-monster_boss_01",
    asset: asset("monster_boss_01", 171)
  }
};

const ELEMENTS: readonly Element[] = ["fire", "ice", "earth", "lightning"];

export function validateMonsterAssignment(assignment: MonsterAssignment | MonsterAssignment[]): ValidationIssue[] {
  const assignments = Array.isArray(assignment) ? assignment : [assignment];
  const issues: ValidationIssue[] = [];
  const activeAssignments = new Set<string>();

  for (const entry of assignments) {
    const monster = MONSTER_REGISTRY[entry.type];
    if (!monster) {
      issues.push({ code: "unknown-monster", message: `Unknown monster type \"${entry.type}\"` });
      continue;
    }
    if (entry.element === undefined) {
      issues.push({ code: "missing-element", message: `Monster \"${entry.type}\" is missing an element` });
      continue;
    }
    if (!ELEMENTS.includes(entry.element)) {
      issues.push({ code: "invalid-element", message: `Monster \"${entry.type}\" has unknown element \"${entry.element}\"` });
      continue;
    }
    const activeKey = `${entry.type}:${entry.element}`;
    if (activeAssignments.has(activeKey)) {
      issues.push({ code: "duplicate-active-assignment", message: `Monster \"${entry.type}\" repeats active element \"${entry.element}\"` });
    } else {
      activeAssignments.add(activeKey);
    }

    if (monster.kind === "boss" || entry.resistant_elements !== undefined) {
      const validResistancePair = monster.kind === "boss"
        && entry.type === "monster_boss_01"
        && entry.element === "fire"
        && Array.isArray(entry.resistant_elements)
        && entry.resistant_elements.length === 2
        && entry.resistant_elements.includes("ice")
        && entry.resistant_elements.includes("lightning");
      if (!validResistancePair) {
        issues.push({ code: "invalid-resistant-elements", message: `Monster \"${entry.type}\" has an invalid resistance pair` });
      }
    }
  }

  return issues;
}
