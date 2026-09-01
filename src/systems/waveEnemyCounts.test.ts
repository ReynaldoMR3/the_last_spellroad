import { describe, expect, it } from "vitest";
import { countSpawnableEnemies } from "./waveEnemyCounts";
import type { WaveDefinition } from "../data/types";
import { MONSTER_REGISTRY } from "../data/monsterRegistry";

const REGISTRY = MONSTER_REGISTRY;

function wave(enemies: WaveDefinition["enemies"]): WaveDefinition {
  return { level: 1, wave_index: 0, enemies, hp_modifier: 1, damage_modifier: 1 };
}

describe("countSpawnableEnemies", () => {
  it("sums every entry's count when all types are registered", () => {
    const w = wave([
      { type: "monster_m01", archetype: "melee", element: "fire", count: 3, spawn_delay_ms: 0 },
      { type: "monster_r01", archetype: "ranged", element: "fire", count: 2, spawn_delay_ms: 500 }
    ]);
    expect(countSpawnableEnemies(w, REGISTRY)).toBe(5);
  });

  it("excludes an unregistered type's count entirely, rather than soft-locking the wave on it", () => {
    const w = wave([
      { type: "monster_m01", archetype: "melee", element: "fire", count: 3, spawn_delay_ms: 0 },
      { type: "not_a_real_enemy", archetype: "melee", element: "fire", count: 4, spawn_delay_ms: 0 }
    ]);
    expect(countSpawnableEnemies(w, REGISTRY)).toBe(3);
  });

  it("returns 0 when every entry is unregistered", () => {
    const w = wave([{ type: "ghost", archetype: "melee", element: "fire", count: 2, spawn_delay_ms: 0 }]);
    expect(countSpawnableEnemies(w, REGISTRY)).toBe(0);
  });

  it("returns 0 for a wave with no enemies", () => {
    expect(countSpawnableEnemies(wave([]), REGISTRY)).toBe(0);
  });
});
