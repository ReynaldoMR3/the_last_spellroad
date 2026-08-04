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
  /** Issue #71's decision — the default hotbar loadout is now data-driven: a spell with this
   * field present is equipped at run start, in ascending slot order (1-based). Absent/undefined
   * means "not in the default loadout" (still loaded, just not initially equipped — see
   * `systems/defaultLoadout.ts`). Replaces the previous code-owned `DEFAULT_LOADOUT_IDS` array
   * in `SpellroadScene.ts`, so Frieren can curate the default loadout without an engine change.
   * Full player-facing loadout *swapping* between expeditions is still separate future work. */
  default_loadout_slot?: number;
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
  /** Multiplier on every spawned enemy's base HP/damage this wave (`Enemy.ts`'s
   * `PLACEHOLDER_ENEMY_HP`/`ARCHETYPE_DAMAGE`) — issue #71's decision to wire up what was
   * previously an authored-but-unread field, so Warden/Pato can scale an existing archetype
   * ("tougher melee this wave") without a new archetype or an engine change. 1.0 = unscaled. */
  hp_modifier: number;
  damage_modifier: number;
  /** True for every phase of a mini-boss/Director trial (backlog 3.4) — distinguishes a
   * multi-phase boss fight (no free HP reset between phases, per hp-template.md's cumulative
   * damage-threat budget) from a regular wave (full HP reset each time). */
  is_boss?: boolean;
  /** Present only on Level 1 Wave 0 (backlog 2.21 / issue #20) — states its deliberate
   * below-standard-band onboarding grace period in-file, so it survives independent of
   * hp-template.md's or the agent logs' own record of the same exception. Not read by any
   * engine system; documentation only. */
  _onboarding_exception?: string;
}
