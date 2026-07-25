import type { DebuffVariant, EnemyArchetype } from "./types";

/**
 * Maps Warden's invented enemy type names to the archetype (and, for Debuffers, the
 * drain variant) that actually determines in-engine behavior and damage — the wave.json
 * schema itself only carries `type`, `count`, `spawn_delay_ms` (Engine Integration), so
 * this registry is the "which archetype does this name mean" lookup the loader needs.
 * Sourced from Warden's log.md entries — Loomwright never invents this mapping itself.
 */
export interface EnemyRegistryEntry {
  archetype: EnemyArchetype;
  debuffVariant?: DebuffVariant;
}

export const ENEMY_REGISTRY: Record<string, EnemyRegistryEntry> = {
  spellbound_thug: { archetype: "melee" },
  hexbow_skirmisher: { archetype: "ranged" },
  murmur_wisp: { archetype: "debuffer", debuffVariant: "mana_regen" },
  creeping_bramble: { archetype: "debuffer", debuffVariant: "speed" },
  dread_reaver: { archetype: "melee" },
  storm_lancer: { archetype: "ranged" }
};
