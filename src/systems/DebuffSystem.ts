import type { DebuffVariant } from "../data/types";

/** hp-template.md, "Debuffer Magnitudes" — additive, hard-capped at 2 applications. */
export const SPEED_DRAIN_PER_APPLICATION = 0.12;
export const MANA_REGEN_DRAIN_PER_APPLICATION = 1.5;
export const MAX_STACKS = 2;
export const MANA_REGEN_FLOOR = 2;

/**
 * Tracks the player's active Debuffer stacks. Never both variants from the same
 * instance (Warden's choice per encounter), but the two variants stack independently
 * of each other here since nothing in hp-template.md says otherwise.
 */
export class DebuffSystem {
  private speedStacks = 0;
  private manaRegenStacks = 0;

  applyStack(variant: DebuffVariant): void {
    if (variant === "speed") {
      this.speedStacks = Math.min(MAX_STACKS, this.speedStacks + 1);
    } else {
      this.manaRegenStacks = Math.min(MAX_STACKS, this.manaRegenStacks + 1);
    }
  }

  clear(): void {
    this.speedStacks = 0;
    this.manaRegenStacks = 0;
  }

  /** Multiplier to apply to base movement speed (1 = no drain, floors toward 0.76 at 2 stacks). */
  get speedMultiplier(): number {
    return 1 - this.speedStacks * SPEED_DRAIN_PER_APPLICATION;
  }

  /** Effective Mana regen/sec, floored per hp-template.md regardless of stack count. */
  effectiveManaRegen(baseRegenPerSec: number): number {
    const drained = baseRegenPerSec - this.manaRegenStacks * MANA_REGEN_DRAIN_PER_APPLICATION;
    return Math.max(MANA_REGEN_FLOOR, drained);
  }
}
