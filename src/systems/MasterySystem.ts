import type { MasteryTier } from "../data/types";

const TIER_ORDER: MasteryTier[] = ["novice", "adept", "master"];

/**
 * backlog item 0.4, closed 2026-07-25: sized by Pato against the full 3-level Level 1-3
 * wave data (60 enemies total, clearing the developer's 40-60+ threshold). 20 puts the
 * 2-tier climb to Master (40 casts) at ~1.9x the largest single level's enemy count (21),
 * avoiding the exact failure mode flagged when only Level 1's 18-enemy sample existed
 * ("a naive rate sized off it alone would cap most of the spellbook at Master within a
 * single level") while staying reachable for one focused spell across a full playthrough.
 * See mastery-template.md and pato/log.md (2026-07-25 (3)) for the full arithmetic.
 */
const LANDED_CASTS_PER_TIER = 20;

export interface MasteryState {
  tier: MasteryTier;
  landedCasts: number;
}

export interface MasteryScaling {
  powerBonus: number;
  targetsBonus: number;
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
    if (entry.landedCasts >= LANDED_CASTS_PER_TIER) {
      entry.landedCasts = 0;
      entry.tier = TIER_ORDER[TIER_ORDER.indexOf(entry.tier) + 1];
      onTierUp?.(spellId, entry.tier);
    }
  }

  getScaling(spellId: string): MasteryScaling {
    const tier = this.getTier(spellId);
    if (tier === "novice") {
      return { powerBonus: 0, targetsBonus: 0 };
    }
    if (tier === "adept") {
      return { powerBonus: 1, targetsBonus: 1 };
    }
    return { powerBonus: 2, targetsBonus: 2 };
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
