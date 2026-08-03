import type { EnemyArchetype } from "../data/types";

/**
 * Pure, Phaser-free logic backing the live per-enemy name+HP-bar overlay (backlog 2.19 /
 * issue #26) — same seam convention as `waveThreatBudget.ts`: the actual testable
 * arithmetic/lookup lives here; the Phaser GameObject wiring (positioning a Text + Graphics
 * pair above a moving sprite every frame, attaching/destroying them on despawn) has no
 * meaningful Vitest seam in this project and is verified via typecheck/build/dev-server
 * instead, per `docs/agents/_reference/docker-testing-contract.md`.
 */

/** "melee" and "ranged" have no richer lore-name yet — the backlog explicitly defers naming
 * enemies to Lorena, out of scope for this ticket, so those two stay the capitalized archetype
 * string ("Melee"/"Ranged") as a display-name stand-in. "debuffer" is the one archetype Lorena
 * has since named (backlog 4.2 / issue #57): "the Tarrywright", per `lore-premise.md`'s
 * Established Named Facts. Display-cased to "The Tarrywright" here — same capitalization
 * convention this function already applies to every other archetype string — since this one
 * value feeds both a standalone name label above the enemy sprite and the lead-in of a HUD
 * sentence (`debuffDisplay.ts`'s `formatDebuffHudLines`), and a capitalized proper noun reads
 * correctly in both places. */
export function archetypeDisplayName(archetype: EnemyArchetype): string {
  if (archetype === "debuffer") {
    return "The Tarrywright";
  }
  return archetype.charAt(0).toUpperCase() + archetype.slice(1);
}

/** Remaining-HP fraction, clamped to [0, 1] so an overkill hit (hp driven negative) or a
 * malformed non-positive maxHp never renders a negative-width or overflowing bar. */
export function computeHpFraction(hp: number, maxHp: number): number {
  if (maxHp <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(1, hp / maxHp));
}

/** Same three-band convention `SpellroadScene.spawnDamageNumber` already uses for its
 * floating damage numbers (backlog 2.9), reused verbatim (>80% healthy, 30-80% wounded,
 * <30% critical) so the HP bar and the damage-number color agree instead of inventing a
 * second, subtly different banding scheme for the same underlying HP%. Numeric (0xRRGGBB)
 * rather than the CSS-string form `DAMAGE_NUMBER_COLOR` uses, since this feeds a Phaser
 * `Graphics.fillStyle` call, not a `Text` style object. */
export const HP_BAR_COLOR = {
  healthy: 0x4caf50,
  wounded: 0xf4c430,
  critical: 0xe05252
} as const;

export function computeHpBarColor(fraction: number): number {
  if (fraction > 0.8) {
    return HP_BAR_COLOR.healthy;
  }
  if (fraction > 0.3) {
    return HP_BAR_COLOR.wounded;
  }
  return HP_BAR_COLOR.critical;
}
