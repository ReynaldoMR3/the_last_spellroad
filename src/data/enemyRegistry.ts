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
  storm_lancer: { archetype: "ranged" },
  voidfang_stalker: { archetype: "melee" },
  // Issue #162 -- new archetype-flavored variants on a defined per-level schedule (Level 1
  // onward, not clustered at the tail like the three names above). Each is a reskin/name
  // variant of an existing closed-vocabulary mechanical archetype (issue #71's decision) --
  // no new archetype, no new stat line; see warden/log.md's 2026-08-12 entry for the schedule.
  ash_footman: { archetype: "melee" },
  glint_archer: { archetype: "ranged" },
  bonecage_brute: { archetype: "melee" },
  thistle_marksman: { archetype: "ranged" }
};
