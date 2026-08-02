/**
 * Pure, Phaser-free logic backing issue #47's fix (archer ranged attacks always hit).
 * Same seam convention as `autoAim.ts`/`waveThreatBudget.ts`/`enemyStatusOverlay.ts`: the
 * actual live-position recheck is testable in isolation here; wiring it to the mage's live
 * `x`/`y` and the scene's `RANGED_TRAVEL_MS` `delayedCall` timer is `SpellroadScene`'s job.
 *
 * Root cause (see `docs/agents/loomwright/log.md` / issue #47): `onRangedFire`'s delayed
 * damage callback applied `ARCHETYPE_DAMAGE.ranged` unconditionally, with no recheck of the
 * player's actual position at impact time — the visible projectile tween
 * (`spawnRangedProjectile`) was purely cosmetic, with no collision/overlap test backing it,
 * so movement during the travel window could never avoid the hit. This breaks the game's
 * stated core pillar ("tactical spell combat... over twitch reflexes").
 */

/**
 * How close the player must still be to the point an archer fired at, at impact time, to
 * count as hit. Not one of Pato's numeric templates (hp-template.md fixes the 4-damage
 * per-hit value, not a hit radius) — this is an engine-owned contact-distance constant, the
 * same kind `Enemy.ts`'s `MELEE_RANGE` already is: the mage's own 32x32 sprite's half-width
 * (16px) plus a small buffer, mirroring `MELEE_RANGE`'s own "half-footprint plus a few px of
 * slack" derivation rather than inventing an unrelated convention.
 */
export const RANGED_HIT_RADIUS = 20;

/**
 * Decision 47: at the delayed impact callback, only counts as a hit if the player's live
 * position is still within `hitRadius` of the point the shot was originally fired at
 * (`impactX`/`impactY` — the player's position snapshot at fire time, per
 * `EnemyCallbacks.onRangedFire`'s existing `toX`/`toY` args). A player who moved outside
 * that radius during the travel window dodged; boundary distance itself still counts as a
 * hit (inclusive `<=`), matching the inclusive-range convention `Enemy.ts`'s melee/kiting
 * range checks already use.
 */
export function isStillInRangedImpactZone(
  playerX: number,
  playerY: number,
  impactX: number,
  impactY: number,
  hitRadius: number = RANGED_HIT_RADIUS
): boolean {
  return Math.hypot(playerX - impactX, playerY - impactY) <= hitRadius;
}
