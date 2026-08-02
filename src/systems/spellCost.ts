import type { MasteryTier, SpellDefinition } from "../data/types";
import { MASTER_DISCOUNT, WEIGHT_CLASS } from "./ManaSystem";

/**
 * backlog 2.28 / issue #54 — the Mana-cost formula `SpellCaster.tryCast` already computed
 * inline (weight-class base cost, minus Master's -10% discount when the spell's own
 * `master_discount` field says "cost" rather than "cooldown"), pulled out into a pure,
 * Phaser-free function so `tryCast` (spends the Mana) and the new pre-check
 * `SpellCaster.canAffordCast` (SpellroadScene's `handleHotbarPress`, before entering preview
 * mode — never spends) share one source of truth instead of two copies of the same ternary
 * that could silently drift apart.
 */
export function computeCastManaCost(spell: SpellDefinition, masteryTier: MasteryTier): number {
  const base = WEIGHT_CLASS[spell.weight];
  const isMaster = masteryTier === "master";
  return isMaster && spell.master_discount === "cost"
    ? Math.round(base.cost * (1 - MASTER_DISCOUNT))
    : base.cost;
}
