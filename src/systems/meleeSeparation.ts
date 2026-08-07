/**
 * Issue #110 — developer playtest: "the melee units are always in the same spot so its easy
 * to kill them." Root cause (same class as the already-fixed ranged archer complaint, #95):
 * melee enemies spawn from the same fixed point (`ENEMY_SPAWN_X`, `SpellroadScene.ts`) and
 * approach the player along a purely radial line (`Enemy.ts`'s melee branch), then hold dead
 * still once in range — fully deterministic, and with more than one melee alive at once, they
 * stack on top of each other rather than surrounding the player.
 *
 * This is the pure "how hard should this enemy push away from a too-close ally" arithmetic,
 * pulled out for direct testing — same seam convention as `rangedStrafe.ts`. `Enemy.ts` owns
 * combining this per-pair push into one final velocity vector alongside its own movement.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Sums a push-away vector from every `other` closer than `minDistance`, scaled 0 (at exactly
 * `minDistance`) to 1 (coincident) by how much the gap is violated — so a barely-too-close
 * ally nudges gently and a fully-overlapping one nudges hardest. Not normalized: the caller
 * scales the result to whatever speed fits its own movement model. Two enemies at the exact
 * same point contribute nothing for that pair (no direction is definable) rather than NaN.
 */
export function computeSeparationNudge(self: Point, others: Point[], minDistance: number): Point {
  let nudgeX = 0;
  let nudgeY = 0;
  for (const other of others) {
    const dx = self.x - other.x;
    const dy = self.y - other.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 0 && distance < minDistance) {
      const strength = (minDistance - distance) / minDistance;
      nudgeX += (dx / distance) * strength;
      nudgeY += (dy / distance) * strength;
    }
  }
  return { x: nudgeX, y: nudgeY };
}
