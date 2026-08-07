import type { DebuffVariant } from "../data/types";

/** hp-template.md, "Debuffer Magnitudes" — additive, hard-capped at 2 applications. */
export const SPEED_DRAIN_PER_APPLICATION = 0.12;
/**
 * Retuned 1.5 -> 2.4 (backlog 2.39 / issue #88) to restore the original 60%-max-cut/
 * floor-coincidence relationship against 2.34's MANA_REGEN_PER_SEC retune (5 -> 8/sec) — at
 * the old 5/sec base, the 2-stack cap (3.0/sec drain) landed exactly on the old 2/sec floor;
 * unchanged, that same drain against the new 8/sec base would land at 5/sec, well above the
 * floor, proportionally weakening the debuff. Pre-derived by Pato (`pato/log.md`, 2026-08-03),
 * applied once 2.34's 8/sec base cleared its developer-playtest gate (2026-08-06).
 */
export const MANA_REGEN_DRAIN_PER_APPLICATION = 2.4;
export const MAX_STACKS = 2;
/** Retuned 2 -> 3.2 alongside MANA_REGEN_DRAIN_PER_APPLICATION above, same backlog item. */
export const MANA_REGEN_FLOOR = 3.2;

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

  /** backlog 2.31 / issue #57 — read-only accessors so the HUD can display the actual
   * applied magnitude (stack counts feed `debuffDisplay.ts`'s pure arithmetic) instead of
   * a HUD element re-deriving or guessing at state this class already owns. */
  get speedStackCount(): number {
    return this.speedStacks;
  }

  get manaRegenStackCount(): number {
    return this.manaRegenStacks;
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
