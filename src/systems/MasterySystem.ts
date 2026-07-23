import type { MasteryTier } from "../data/types";
import { MASTER_DISCOUNT } from "./ManaSystem";

const TIER_ORDER: MasteryTier[] = ["novice", "adept", "master"];

/**
 * TODO(Pato, backlog item 0.4): the landed-casts-per-tier growth rate is not yet a
 * finalized design number — the developer's explicit call (2026-07-22) was to wait
 * for Warden's real regular-wave data before sizing it, rather than guess. This value
 * is an engine-testing placeholder only, so Mastery tier-ups are visible/verifiable
 * during development; it must not be read as a shipped design decision.
 */
const PLACEHOLDER_LANDED_CASTS_PER_TIER = 5;

export interface MasteryState {
  tier: MasteryTier;
  landedCasts: number;
}

export interface MasteryScaling {
  powerBonus: number;
  targetsBonus: number;
  costCooldownMultiplier: number;
}

/** Per-spell Mastery tracking. Scaling is identical for every spell (mastery-template.md) — never authored per spell. */
export class MasterySystem {
  private readonly state = new Map<string, MasteryState>();

  private ensure(spellId: string): MasteryState {
    let entry = this.state.get(spellId);
    if (!entry) {
      entry = { tier: "novice", landedCasts: 0 };
      this.state.set(spellId, entry);
    }
    return entry;
  }

  getTier(spellId: string): MasteryTier {
    return this.ensure(spellId).tier;
  }

  recordLandedCast(spellId: string, onTierUp?: (spellId: string, tier: MasteryTier) => void): void {
    const entry = this.ensure(spellId);
    if (entry.tier === "master") {
      return;
    }
    entry.landedCasts += 1;
    if (entry.landedCasts >= PLACEHOLDER_LANDED_CASTS_PER_TIER) {
      entry.landedCasts = 0;
      entry.tier = TIER_ORDER[TIER_ORDER.indexOf(entry.tier) + 1];
      onTierUp?.(spellId, entry.tier);
    }
  }

  getScaling(spellId: string): MasteryScaling {
    const tier = this.getTier(spellId);
    if (tier === "novice") {
      return { powerBonus: 0, targetsBonus: 0, costCooldownMultiplier: 1 };
    }
    if (tier === "adept") {
      return { powerBonus: 1, targetsBonus: 1, costCooldownMultiplier: 1 };
    }
    return { powerBonus: 2, targetsBonus: 2, costCooldownMultiplier: 1 - MASTER_DISCOUNT };
  }

  /**
   * Death penalty: drop one tier on a random equipped spell above Novice. Novice-tier
   * spells are excluded from the roll pool (mastery-template.md, resolved 2026-07-22) —
   * if every equipped spell is Novice, this returns null and costs nothing, by design.
   */
  applyRandomDeathPenalty(equippedSpellIds: string[]): string | null {
    const eligible = equippedSpellIds.filter((id) => this.getTier(id) !== "novice");
    if (eligible.length === 0) {
      return null;
    }
    const pick = eligible[Math.floor(Math.random() * eligible.length)];
    const entry = this.ensure(pick);
    entry.tier = TIER_ORDER[TIER_ORDER.indexOf(entry.tier) - 1];
    entry.landedCasts = 0;
    return pick;
  }
}
