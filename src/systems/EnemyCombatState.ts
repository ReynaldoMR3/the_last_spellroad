import type { ResolvedElementalHit } from "./elementalDamage";

export interface AppliedElementalHit {
  /** False when the target had already been defeated. */
  applied: boolean;
  /** True exactly once: the transition from positive HP to zero. */
  killed: boolean;
  /** Status effects apply only to a surviving target and honor their cap/lockout. */
  effectApplied: boolean;
  /** True when this hit cancelled a committed Debuffer wind-up. The Phaser scene consumes
   * this outcome to stop the matching visual tell in the same synchronous hit transaction. */
  cancelledDebuffTelegraph: boolean;
}

type ElementalHitPayload = Omit<ResolvedElementalHit, "target">;

/**
 * Pure enemy-side HP, elemental-status, and committed-attack state. `Enemy` remains responsible
 * for movement/rendering. Player spell hits are currently synchronous; keeping their resolved
 * payload application atomic and callback-safe avoids coupling this state to Phaser call sites.
 */
export class EnemyCombatState {
  private currentHp: number;
  private weakenRemainingMs = 0;
  private weakenMultiplier = 1;
  private stunRemainingMs = 0;
  private stunLockoutRemainingMs = 0;
  private pendingStunLockoutMs = 0;
  private debuffTelegraphRemainingMs: number | null = null;

  constructor(public readonly maxHp: number) {
    this.currentHp = maxHp;
  }

  get hp(): number {
    return this.currentHp;
  }

  get defeated(): boolean {
    return this.currentHp <= 0;
  }

  get isWeakened(): boolean {
    return this.weakenRemainingMs > 0;
  }

  get isStunned(): boolean {
    return this.stunRemainingMs > 0;
  }

  get outgoingDamageMultiplier(): number {
    return this.isWeakened ? this.weakenMultiplier : 1;
  }

  /** Starts one committed Debuffer tell. An active tell, stun, or defeated enemy cannot start
   * another; the caller resets the separately-authored attack cooldown only on true. */
  beginDebuffTelegraph(durationMs: number): boolean {
    if (this.defeated || this.isStunned || this.debuffTelegraphRemainingMs !== null) {
      return false;
    }
    this.debuffTelegraphRemainingMs = durationMs;
    return true;
  }

  private cancelDebuffTelegraph(): boolean {
    if (this.debuffTelegraphRemainingMs === null) {
      return false;
    }
    this.debuffTelegraphRemainingMs = null;
    return true;
  }

  applyElementalHit(hit: ElementalHitPayload): AppliedElementalHit {
    if (this.defeated) {
      return {
        applied: false,
        killed: false,
        effectApplied: false,
        cancelledDebuffTelegraph: false
      };
    }

    this.currentHp = Math.max(0, this.currentHp - hit.totalDamage);
    if (this.defeated) {
      return {
        applied: true,
        killed: true,
        effectApplied: false,
        cancelledDebuffTelegraph: this.cancelDebuffTelegraph()
      };
    }

    let effectApplied = false;
    if (hit.statusEffect?.kind === "weaken") {
      this.weakenMultiplier = hit.statusEffect.outgoingDamageMultiplier;
      this.weakenRemainingMs = hit.statusEffect.durationMs;
      effectApplied = true;
    } else if (
      hit.statusEffect?.kind === "stun" &&
      this.stunRemainingMs <= 0 &&
      this.stunLockoutRemainingMs <= 0
    ) {
      this.stunRemainingMs = hit.statusEffect.durationMs;
      this.pendingStunLockoutMs = hit.statusEffect.reapplyLockoutMs;
      effectApplied = true;
    }

    return {
      applied: true,
      killed: false,
      effectApplied,
      cancelledDebuffTelegraph:
        effectApplied && hit.statusEffect?.kind === "stun" ? this.cancelDebuffTelegraph() : false
    };
  }

  tick(deltaMs: number): { debuffTelegraphCompleted: boolean } {
    this.weakenRemainingMs = Math.max(0, this.weakenRemainingMs - deltaMs);

    let remainingDeltaMs = deltaMs;
    if (this.stunRemainingMs > 0) {
      const stunDelta = Math.min(this.stunRemainingMs, remainingDeltaMs);
      this.stunRemainingMs -= stunDelta;
      remainingDeltaMs -= stunDelta;
      if (this.stunRemainingMs === 0) {
        this.stunLockoutRemainingMs = this.pendingStunLockoutMs;
        this.pendingStunLockoutMs = 0;
      }
    }
    if (remainingDeltaMs > 0 && this.stunRemainingMs === 0) {
      this.stunLockoutRemainingMs = Math.max(0, this.stunLockoutRemainingMs - remainingDeltaMs);
    }

    if (this.debuffTelegraphRemainingMs === null) {
      return { debuffTelegraphCompleted: false };
    }
    this.debuffTelegraphRemainingMs -= deltaMs;
    if (this.debuffTelegraphRemainingMs > 0) {
      return { debuffTelegraphCompleted: false };
    }
    this.debuffTelegraphRemainingMs = null;
    return { debuffTelegraphCompleted: true };
  }

  /** Preserves the existing wave-modified authored damage, with ice's single multiplier as
   * the only extra factor and one final rounding step. */
  outgoingDamage(authoredDamage: number, waveDamageModifier: number): number {
    return Math.round(authoredDamage * waveDamageModifier * this.outgoingDamageMultiplier);
  }
}
