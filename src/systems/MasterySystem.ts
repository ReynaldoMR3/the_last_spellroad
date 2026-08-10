import type { MasteryTier } from "../data/types";

const TIER_ORDER: MasteryTier[] = ["novice", "adept", "master"];

/**
 * backlog item 0.5, resolved 2026-08-01: `recordLandedCast` now only fires on a cast that
 * lands a KILL (see SpellroadScene.confirmCast), closing the non-lethal-hit farming
 * exploit the 180-casts/tier number (see git history / mastery-template.md's superseded
 * 2026-07-25 entries) was explicitly unable to close on its own. This changes the unit
 * from "landed casts" to "landed kills," which resets the whole derivation — the old
 * casts-to-kill-ratio arithmetic no longer applies, since only the killing cast of a
 * multi-cast kill sequence counts at all.
 *
 * Under kill-gating, one `recordLandedCast` call happens per confirmCast that kills at
 * least one enemy, regardless of how many casts it took to land that kill — so the
 * worst case (fastest unwanted progression) is a player isolating one enemy at a time
 * with any spell, since an AoE cast that kills 3 clustered enemies at once still only
 * ticks once (the increment happens outside the per-enemy loop). The bound is therefore
 * total enemy COUNT per level, not total HP: Level 1 = 16, Level 2 = 21, Level 3 = 21,
 * Level 4 = 25 (see src/data/waves/level-*.json). Level 4 is now the single worst level.
 *
 * k = 24 kills/tier (48 kills to fully master one spell): margin vs. Level 4 alone is
 * 48/25 ≈ 1.92x — consistent with the ~1.9-2.2x margin standard the prior derivation
 * used, not a razor-thin pass. Across all 4 regular levels (83 total kills), 48/83 ≈ 58%
 * — a specialist masters one favored spell by roughly level 2-3 of 4 with total
 * dedication, matching the design intent the original (superseded) derivation stated.
 * See mastery-template.md, "Resolved 2026-08-01" for the full arithmetic.
 *
 * Residual, not fixed here (flagged for Phase 5, backlog 0.2's own entry): backlog 0.2's
 * resolution lets a player retry the CURRENT level indefinitely via repeated deaths, so
 * "one level's kill count" isn't a hard ceiling the way it was when death ended the run —
 * a patient player could out-grind Level 4's 25-kill cap across multiple attempts at it.
 * Death's own Mastery-tier-drop penalty partially self-limits this (an all-non-Novice
 * loadout risks losing exactly the spell being ground), but this isn't a airtight bound
 * and needs a probabilistic look, not another worst-case constant, if it matters later.
 */
const LANDED_CASTS_PER_TIER = 24;

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

  constructor(initialState: Record<string, MasteryState> = {}) {
    for (const [spellId, entry] of Object.entries(initialState)) {
      this.state.set(spellId, { ...entry });
    }
  }

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

  snapshot(): Record<string, MasteryState> {
    return Object.fromEntries(
      [...this.state.entries()].map(([spellId, entry]) => [spellId, { ...entry }]),
    );
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

  /** backlog 1.6 — the full per-spell tier/landed-cast map, for SaveSystem to persist.
   * Final branch review, 2026-08-09 (finding #9) — returns defensive copies of each
   * `MasteryState`, not the live objects `this.state` holds: `Object.fromEntries(this.state)`
   * previously handed out references a caller could mutate to silently corrupt this system's
   * internal tracking. Matches `importState`'s existing defensive-copy pattern below. */
  exportState(): Record<string, MasteryState> {
    return Object.fromEntries(Array.from(this.state, ([id, s]) => [id, { ...s }]));
  }

  /** backlog 1.6 — replaces all tracking with a loaded save's state. A spell absent from
   * `saved` simply hasn't been tracked before and starts fresh at Novice via `ensure()`,
   * same as any other never-before-seen spell id. */
  importState(saved: Record<string, MasteryState>): void {
    this.state.clear();
    for (const [spellId, entry] of Object.entries(saved)) {
      this.state.set(spellId, { tier: entry.tier, landedCasts: entry.landedCasts });
    }
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
