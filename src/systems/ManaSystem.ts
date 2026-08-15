import type { Weight } from "../data/types";

/**
 * Retuned 100 -> 130 (issue #235, replacing closed #200 — full triage/decision history there).
 * Root cause, independently re-derived against the shipped numbers (see
 * `docs/agents/pato/log.md`, this entry's date, and `mana-template.md` for the full arithmetic):
 * single-weight-class spam was never the problem — mana-template.md's existing 8/sec regen
 * derivation already shows every weight class regenerates its own cost well inside its own
 * cooldown window (Light 1.25s vs. 2s, Standard 2.5s vs. 4s, Heavy 4.375s vs. 8s), so that
 * steady-state math needed no change. The actual pressure is a *burst-depth* problem: reacting
 * to a mixed-archetype wave by firing 2-3 different weight-class spells in quick succession
 * (e.g. one Light + one Standard + one Heavy = 65 Mana) drains far faster than the flat 8/sec
 * regen replaces it, and by the wave sizes now shipped (Level 3's compositions run up to ~142
 * modifier-scaled enemy HP, vs. Level 1's onboarding-scale 50-126), a fight can run long enough
 * for this to happen more than once — worse still when a mana-regen-draining Debuffer
 * (`murmur_wisp`) is alive for the whole encounter, cutting effective regen to 5.6/sec per
 * `hp-template.md`'s Debuffer Magnitudes table (GDD's own issue #211 note already flags this
 * exact "Debuffer breaks the cast-freely framing" exception). This pool-depth-only lever
 * targets exactly that: it doesn't touch `MANA_REGEN_PER_SEC` (already-validated steady state,
 * issue #77, left alone), the weight-class cost/cooldown table (Mastery's `master_discount:
 * "cost"` payoff stays untouched), or any wave composition (Warden's already-validated
 * threat-budget curve, issue #162, stays untouched) — it only extends how many burst reactions
 * the pool can absorb before the (unchanged) regen has to catch up, which is the diagnosed
 * cause. 130 buys room for two full 3-spell (Light+Standard+Heavy) bursts back-to-back before
 * hitting empty, versus one-and-change at the old 100. Pending developer playtest to confirm
 * wave 3 pacing feels right (this retune's own gate, not self-verifiable by Pato).
 */
export const MAX_MANA = 130;
/** backlog 2.34 / issue #77 — developer full playtest of #30: "mana regen feels too slow at
 * the start, undercutting the intended learn-to-cast-fast opening rush." Tuning pass only, per
 * the ticket's own scope — the 100-pool/weight-class-cost table (mana-template.md) is
 * unchanged, only this regen figure.
 *
 * At the prior 5/sec, every weight class's own cost regenerated in almost exactly its own
 * cooldown (Light 10/5=2.0s vs. a 2s cooldown, Standard 20/5=4.0s vs. 4s, Heavy 35/5=7.0s vs.
 * 8s) — sustained single-spell spam broke roughly even against its own cooldown gate, but chained
 * casts of *different* spells during the opening minutes (before any Mastery discount exists)
 * had no regen surplus at all to draw on, reading as sluggish exactly where the design wants an
 * inviting first-minutes rush. Retuned 5 -> 8/sec (60% faster): Light 10/8=1.25s (comfortable
 * surplus under its 2s cooldown), Standard 20/8=2.5s (surplus under 4s), Heavy 35/8=4.375s
 * (surplus under 8s) — every weight class now regens its own cost well inside its own cooldown
 * window instead of merely breaking even, without changing any single spell's cost/cooldown/
 * power (Pato's locked template). Needs a real developer playtest to confirm the feel before
 * this counts as validated, same gate every other numeric retune in this backlog carries.
 * Confirmed still correct 2026-08-14 (issue #235) — the wave-3 pacing complaint re-diagnosed
 * as a burst-depth (pool size) problem, not a regen-rate problem, so this constant is
 * unchanged by that retune; see `MAX_MANA`'s own comment above. */
export const MANA_REGEN_PER_SEC = 8;

export const WEIGHT_CLASS: Record<Weight, { cost: number; cooldownMs: number }> = {
  light: { cost: 10, cooldownMs: 2000 },
  standard: { cost: 20, cooldownMs: 4000 },
  heavy: { cost: 35, cooldownMs: 8000 }
};

/** At Master Mastery, cost or cooldown drops 10% from weight-class baseline (mana-template.md). */
export const MASTER_DISCOUNT = 0.1;

/**
 * Mana pool. Regenerates passively at a constant rate in and out of combat — the
 * Debuffer archetype's regen-drain effect is applied externally by whatever holds
 * this instance (it lowers the effective regen rate passed into `update`), never
 * inside this class, so this class stays a pure pool with no archetype knowledge.
 */
export class ManaSystem {
  private mana = MAX_MANA;

  get current(): number {
    return this.mana;
  }

  /** Full refill on death/respawn, mirroring HealthSystem.reset() (backlog 2.12). */
  reset(): void {
    this.mana = MAX_MANA;
  }

  /** @param regenPerSec defaults to the base rate; pass a drained rate while Debuffer stacks are active. */
  update(deltaMs: number, regenPerSec: number = MANA_REGEN_PER_SEC): void {
    this.mana = Math.min(MAX_MANA, this.mana + (regenPerSec * deltaMs) / 1000);
  }

  canAfford(cost: number): boolean {
    return this.mana >= cost;
  }

  spend(cost: number): boolean {
    if (!this.canAfford(cost)) {
      return false;
    }
    this.mana -= cost;
    return true;
  }
}
