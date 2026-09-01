/**
 * Pure, Phaser-free logic backing the live per-enemy HP bar — same seam convention as
 * `waveThreatBudget.ts`: the arithmetic lives here while the Phaser drawing stays in Enemy.
 */

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
