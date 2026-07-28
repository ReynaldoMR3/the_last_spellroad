import type { Weight } from "../data/types";

export const MAX_MANA = 100;
export const MANA_REGEN_PER_SEC = 5;

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
