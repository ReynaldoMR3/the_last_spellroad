/**
 * Wall-slide direction lock — fixes a real oscillation bug found 2026-08-06 during a
 * developer playtest: "the ranged monster can get trapped and stop moving up or down
 * even if they have the space, and seems like it starts shaking."
 *
 * Root cause, confirmed by direct simulation of `Enemy.ts`'s own vector math before
 * touching any code: the wall-slide branch (backlog 2.10, added 2026-07-25) recomputed
 * "which way is toward the lane's centerline" fresh every single frame from the enemy's
 * live y position vs the fixed centerline. The instant the enemy's own corrective slide
 * crossed that exact centerline, the target flipped again, driving it back across — a
 * per-frame limit cycle exactly at `y === laneCenterY` (velocity flipping +/-60 every
 * frame, net displacement ~0) that reads as "shaking" and reads as "stuck" near a wall
 * corner instead of genuinely sliding away from it. Pre-existing bug, independent of the
 * ranged-strafe fix (backlog/issue #95) shipped the same day — that fix only touches the
 * separate in-band branch, never the retreat/wall-slide branch this fixes.
 *
 * Fix: decide the slide direction once per wall-slide *episode* (persisted on the Enemy
 * instance via the `currentLock` parameter, cleared by the caller the moment the retreat
 * is no longer wall-blocked) instead of re-deciding it every frame. Pure, testable
 * decision extracted here — same seam convention as `rangedStrafe.ts`'s
 * `computeStrafeDirection`.
 */
export function resolveWallSlideWantsNegativeY(
  y: number,
  centerY: number,
  currentLock: boolean | null
): boolean {
  return currentLock === null ? y >= centerY : currentLock;
}
