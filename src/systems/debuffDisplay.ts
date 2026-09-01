import {
  MANA_REGEN_DRAIN_PER_APPLICATION,
  MANA_REGEN_FLOOR,
  MAX_STACKS,
  SPEED_DRAIN_PER_APPLICATION
} from "./DebuffSystem";

/**
 * Pure, Phaser-free logic backing the debuff HUD readout (backlog 2.31 / issue #57) — same
 * seam convention as `enemyStatusOverlay.ts`: the testable arithmetic lives here; the actual
 * Phaser Text wiring (`SpellroadScene.updateHud`) just calls this and sets a string.
 *
 * Root cause this closes: the Debuffer archetype (`ARCHETYPE_DAMAGE.debuffer: 0`) already had
 * a visual pulse (`SpellroadScene.spawnDebuffPulse`) but nothing told the player *how much* it
 * was draining or that the drain was, in fact, the entire point of the encounter.
 *
 * Deliberately does NOT report a countdown/remaining-duration number: `DebuffSystem` has no
 * duration/expiry field at all (verified by reading it) — a stack, once applied, persists for
 * the rest of the current wave, cleared only by `DebuffSystem.clear()` (wave start or player
 * death). Inventing a fake per-stack timer here would misrepresent the actual mechanic (and
 * would be inventing a new number, which is explicitly out of scope — Loomwright runs Pato's
 * numbers, it doesn't invent them). `active` plus this scoping note is the truthful
 * "how long" answer.
 */

export interface DebuffMagnitude {
  /** True if any stack (either variant) is currently applied. */
  active: boolean;
  speedStacks: number;
  manaRegenStacks: number;
  /** Whole-percent movement-speed reduction currently applied (0 if no speed stacks). */
  speedDrainPercent: number;
  /** Effective Mana regen/sec with the current mana-regen stacks applied, floored per
   * `DebuffSystem.effectiveManaRegen` — mirrors that method's own arithmetic exactly so the
   * HUD number can never drift from what the player's Mana bar is actually doing. */
  effectiveManaRegenPerSec: number;
}

export function computeDebuffMagnitude(
  speedStacks: number,
  manaRegenStacks: number,
  baseManaRegenPerSec: number
): DebuffMagnitude {
  const speedDrainPercent = Math.round(speedStacks * SPEED_DRAIN_PER_APPLICATION * 100);
  const drainedManaRegen = baseManaRegenPerSec - manaRegenStacks * MANA_REGEN_DRAIN_PER_APPLICATION;
  const effectiveManaRegenPerSec = Math.max(MANA_REGEN_FLOOR, drainedManaRegen);
  return {
    active: speedStacks > 0 || manaRegenStacks > 0,
    speedStacks,
    manaRegenStacks,
    speedDrainPercent,
    effectiveManaRegenPerSec
  };
}

/**
 * Formats the HUD lines for the current debuff state, or `[]` when inactive. It intentionally
 * reports the mechanic without identifying the enemy that applied it: silhouettes and their
 * wave element communicate combat readability, while the HUD stays nameless.
 */
export function formatDebuffHudLines(magnitude: DebuffMagnitude): string[] {
  if (!magnitude.active) {
    return [];
  }
  // The lead-in makes the persistence clear without turning the source into a player-facing
  // named identity. Killing the visible source does not end the drain —
  // `removeEnemy` never touches `this.debuff`, and `DebuffSystem` has no per-source tracking at
  // all, only two aggregate counters zeroed exclusively by `clear()` (wave start or player
  // death, see this file's header comment). Naming the timing avoids a stale/broken readout.
  const lines = ["Debuff active (outlives the source — until wave clears)"];
  if (magnitude.speedStacks > 0) {
    lines.push(`  Speed -${magnitude.speedDrainPercent}%  (${magnitude.speedStacks}/${MAX_STACKS} stacks)`);
  }
  if (magnitude.manaRegenStacks > 0) {
    lines.push(
      `  Mana regen ${magnitude.effectiveManaRegenPerSec.toFixed(1)}/s  (floor ${MANA_REGEN_FLOOR}, ${magnitude.manaRegenStacks}/${MAX_STACKS} stacks)`
    );
  }
  return lines;
}
