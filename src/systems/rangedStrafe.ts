/**
 * Backlog/issue #95 — developer playtest: "the archers are always at the same spot, so its
 * easier to kill them". Root cause (confirmed by reading `Enemy.ts`'s kiting math): once a
 * ranged enemy reaches its preferred range band it stops dead (`body.setVelocity(0, 0)`), and
 * since it always approaches from the same fixed spawn point along a purely radial line, it
 * settles on the same relative bearing from the player almost every encounter — fully
 * deterministic, zero angular movement.
 *
 * Fix: instead of stopping, a ranged enemy in-band strafes perpendicular to the hold-range line
 * at `RANGED_STRAFE_SPEED`, bouncing off the lane's top/bottom edges rather than pinning against
 * them. This is the one genuinely pure piece of that behavior — the bounce/flip decision — pulled
 * out for direct testing, same seam convention as `rangedImpact.ts`/`pointerActivity.ts`. The
 * actual per-frame `body.setVelocity` call stays in `Enemy.ts`, which owns the Phaser wiring.
 */

export const RANGED_STRAFE_SPEED = 45;

/**
 * `currentDirection` is `1` (drifting toward `laneBottom`) or `-1` (drifting toward `laneTop`).
 * Flips only when the *current* direction's own margin is crossed — a downward drift starting
 * near the top wall keeps heading down; it doesn't flip until it later approaches the bottom.
 */
export function computeStrafeDirection(
  y: number,
  laneTop: number,
  laneBottom: number,
  margin: number,
  currentDirection: 1 | -1
): 1 | -1 {
  if (currentDirection > 0 && y >= laneBottom - margin) {
    return -1;
  }
  if (currentDirection < 0 && y <= laneTop + margin) {
    return 1;
  }
  return currentDirection;
}
