/** Fee 1 (hexcoin-template.md): choose which equipped spell takes the Mastery-tier loss on death. */
export const FEE_MASTERY_CHOICE = 100;
/** Fee 2 (hp-template.md, "Phase-Transition Partial HP Recovery"): flat cost per phase-break recovery. */
export const FEE_PHASE_RECOVERY = 30;
/** Fraction of MAX_HP restored per Fee 2 payment. */
export const PHASE_RECOVERY_HP_FRACTION = 0.1;
/** Hard ceiling on recoveries per fight, independent of a boss's own phase-break-derived cap. */
export const MAX_RECOVERIES_HARD_CAP = 2;

export interface HexcoinState {
  balance: number;
  levelStartBalance: number;
}

/**
 * Hexcoin: 1 per kill, expedition-scoped (resets at every checkpoint), never lost to death.
 * Fee 2's eligible balance is frozen at boss-fight start per hp-template.md's mid-fight-kill
 * freeze — Loomwright must call `startBossFight()` the instant a boss/trial encounter begins.
 */
export class HexcoinSystem {
  private expeditionTotal = 0;
  private levelStartBalance = 0;
  private fightSnapshot: number | null = null;
  private recoveriesUsedThisFight = 0;

  constructor(initialState: HexcoinState = { balance: 0, levelStartBalance: 0 }) {
    this.expeditionTotal = initialState.balance;
    this.levelStartBalance = initialState.levelStartBalance;
  }

  get balance(): number {
    return this.expeditionTotal;
  }

  snapshot(): HexcoinState {
    return {
      balance: this.expeditionTotal,
      levelStartBalance: this.levelStartBalance,
    };
  }

  earn(amount = 1): void {
    this.expeditionTotal += amount;
  }

  /** Called at every road-segment/expedition checkpoint. */
  resetExpedition(): void {
    this.expeditionTotal = 0;
    this.levelStartBalance = 0;
    this.fightSnapshot = null;
    this.recoveriesUsedThisFight = 0;
  }

  /**
   * Call exactly once, the first time a new level (by level number) is reached — records
   * the floor a death within that level rolls back to. Heckler's 2026-08-01 critique of
   * backlog 0.2's first pass found that zeroing the balance to 0 on every death, combined
   * with forward-only progression, permanently locks a player out of Fee 2 (30 Hexcoin)
   * the instant they die anywhere in or after Level 4 — that level's own kill budget (25)
   * is below the fee, and forward-only means earlier levels' banked income can never be
   * re-earned to make up the gap. This floor mechanism fixes that: a death rolls back
   * only THIS level's in-progress attempt, never below what was already banked by the
   * time the level began. Earnings from levels already cleared are permanent.
   */
  markLevelStart(): void {
    this.levelStartBalance = this.expeditionTotal;
  }

  /** backlog 1.6 — seeds the balance from a loaded save. Same internal shape as
   * `resetExpedition`, but to the restored value instead of 0, and marking that value as
   * this level's own floor (a checkpoint load IS the start of that level's attempt, so
   * `markLevelStart`'s existing floor semantics apply unchanged). */
  restoreBalance(amount: number): void {
    this.expeditionTotal = amount;
    this.levelStartBalance = amount;
    this.fightSnapshot = null;
    this.recoveriesUsedThisFight = 0;
  }

  /** Call on death: undo this attempt's partial gains within the current level, but never
   * below the floor `markLevelStart()` recorded when the level began. */
  rollbackToLevelStart(): void {
    this.expeditionTotal = this.levelStartBalance;
    this.fightSnapshot = null;
    this.recoveriesUsedThisFight = 0;
  }

  /** Call the instant a boss/trial encounter starts — freezes the balance Fee 2 checks against. */
  startBossFight(): void {
    this.fightSnapshot = this.expeditionTotal;
    this.recoveriesUsedThisFight = 0;
  }

  endBossFight(): void {
    this.fightSnapshot = null;
  }

  /** @param bossMaxRecoveries the specific boss's own cap: min(phase_breaks - 1, MAX_RECOVERIES_HARD_CAP), computed by whoever loads the boss's wave.json. */
  canUsePhaseRecovery(bossMaxRecoveries: number): boolean {
    if (this.recoveriesUsedThisFight >= bossMaxRecoveries) {
      return false;
    }
    const eligible = this.fightSnapshot ?? this.expeditionTotal;
    return eligible >= FEE_PHASE_RECOVERY;
  }

  usePhaseRecovery(bossMaxRecoveries: number): boolean {
    if (!this.canUsePhaseRecovery(bossMaxRecoveries)) {
      return false;
    }
    this.expeditionTotal -= FEE_PHASE_RECOVERY;
    if (this.fightSnapshot !== null) {
      this.fightSnapshot -= FEE_PHASE_RECOVERY;
    }
    this.recoveriesUsedThisFight += 1;
    return true;
  }

  canAffordMasteryChoice(): boolean {
    return this.expeditionTotal >= FEE_MASTERY_CHOICE;
  }

  payMasteryChoice(): boolean {
    if (!this.canAffordMasteryChoice()) {
      return false;
    }
    this.expeditionTotal -= FEE_MASTERY_CHOICE;
    return true;
  }
}
