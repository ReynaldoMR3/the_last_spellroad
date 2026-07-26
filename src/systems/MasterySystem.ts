import type { MasteryTier } from "../data/types";

const TIER_ORDER: MasteryTier[] = ["novice", "adept", "master"];

/**
 * backlog item 0.4, closed 2026-07-25, corrected same-day: the first sizing (20/tier)
 * assumed 1 landed cast ~ 1 kill, which Heckler's critique disproved — a weak Novice spell
 * needs several casts per kill, so raw enemy-count doesn't bound achievable casts. Pato's
 * corrected derivation accounts for actual casts-to-kill (ceil(enemyHP/power)) against the
 * kit's weakest spell (power 2), including Mastery's own power step-up mid-grind, and
 * verified against Level 2's real 374 total enemy HP: ~185 casts are achievable spending
 * this spell against every enemy in the level, short of the 360 needed for full Master.
 * See mastery-template.md and pato/log.md (2026-07-25 (4), supersedes (3)'s Part 2).
 *
 * Known residual gap, not fixed here (tracked as a Phase 5 adversarial-QA item, not a
 * numeric-sizing question): `recordLandedCast` fires on any hit, not a kill, so this bound
 * only holds against "clear the level" play — a player who deliberately keeps landing
 * hits on a single enemy without killing it isn't bounded by level content at all, only by
 * real time. No finite per-tier number closes that on its own; it would need a mechanic
 * change (e.g. gating progress on kills, not hits), which is a design call, not a resize.
 */
const LANDED_CASTS_PER_TIER = 180;

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
