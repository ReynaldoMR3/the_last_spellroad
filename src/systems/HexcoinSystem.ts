/** Fee 1 (hexcoin-template.md): choose which equipped spell takes the Mastery-tier loss on death. */
export const FEE_MASTERY_CHOICE = 100;
/** Fee 2 (hp-template.md, "Phase-Transition Partial HP Recovery"): flat cost per phase-break recovery. */
export const FEE_PHASE_RECOVERY = 30;
/** Fraction of MAX_HP restored per Fee 2 payment. */
export const PHASE_RECOVERY_HP_FRACTION = 0.1;
/** Hard ceiling on recoveries per fight, independent of a boss's own phase-break-derived cap. */
export const MAX_RECOVERIES_HARD_CAP = 2;

/**
 * Hexcoin: 1 per kill, expedition-scoped (resets at every checkpoint), never lost to death.
 * Fee 2's eligible balance is frozen at boss-fight start per hp-template.md's mid-fight-kill
 * freeze — Loomwright must call `startBossFight()` the instant a boss/trial encounter begins.
 */
export class HexcoinSystem {
  private expeditionTotal = 0;
  private fightSnapshot: number | null = null;
  private recoveriesUsedThisFight = 0;

  get balance(): number {
    return this.expeditionTotal;
  }

  earn(amount = 1): void {
    this.expeditionTotal += amount;
  }

  /** Called at every road-segment/expedition checkpoint. */
  resetExpedition(): void {
    this.expeditionTotal = 0;
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
