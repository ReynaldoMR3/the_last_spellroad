export type Element = "fire" | "ice" | "earth" | "lightning";
export type AoEShape = "line" | "cone" | "circle";
export type Weight = "light" | "standard" | "heavy";
export type MasteryTier = "novice" | "adept" | "master";
export type EnemyArchetype = "melee" | "ranged" | "debuffer";
export type DebuffVariant = "speed" | "mana_regen";

/**
 * Engine Integration schema (GDD) — one entry per spell, authored by Frieren, validated by Pato.
 * `master_discount` records which stat this spell's Master-tier -10% applies to — mana-template.md:
 * "cost or cooldown... whichever the spell's design leans on more" is a per-spell choice, never both.
 */
export interface SpellDefinition {
  id: string;
  element: Element;
  shape: AoEShape;
  weight: Weight;
  base_power: number;
  base_targets: number;
  master_discount: "cost" | "cooldown";
}

/** Engine Integration schema (GDD) — one enemy line within a wave, authored by Warden. */
export interface WaveEnemyEntry {
  type: string;
  count: number;
  spawn_delay_ms: number;
}

/** Engine Integration schema (GDD) — one entry per wave or boss phase, authored by Warden, validated by Pato. */
export interface WaveDefinition {
  level: number;
  wave_index: number;
  enemies: WaveEnemyEntry[];
  hp_modifier: number;
  damage_modifier: number;
}
