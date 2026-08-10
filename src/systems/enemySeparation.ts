/**
 * Issues #110/#138 — separation arithmetic shared by enemies that have settled into their
 * attack/hold band. It began as the melee overlap fix; #138 exposed the same missing behavior
 * for the 3-4 ranged enemies in the boss fight, where at least two necessarily choose the same
 * one of two strafe directions and can otherwise co-travel indefinitely.
 *
 * This is the pure "how hard should this enemy push away from a too-close ally" arithmetic,
 * pulled out for direct testing — same seam convention as `rangedStrafe.ts`. `Enemy.ts` owns
 * combining this per-pair push into one final velocity vector alongside its own movement.
 */

export interface Point {
  x: number;
  y: number;
  /** Stable per-enemy key used only to choose opposite directions for exact overlaps. */
  separationId?: number;
}

/**
 * Sums a push-away vector from every `other` closer than `minDistance`, scaled 0 (at exactly
 * `minDistance`) to 1 (coincident) by how much the gap is violated — so a barely-too-close
 * ally nudges gently and a fully-overlapping one nudges hardest. Not normalized: the caller
 * scales the result to whatever speed fits its own movement model. For exact overlaps, stable
 * separation ids choose equal-and-opposite horizontal directions; callers without ids retain
 * the older zero-vector fail-safe rather than producing NaN.
 */
export function computeSeparationNudge(self: Point, others: Point[], minDistance: number): Point {
  let nudgeX = 0;
  let nudgeY = 0;
  for (const other of others) {
    const dx = self.x - other.x;
    const dy = self.y - other.y;
    const distance = Math.hypot(dx, dy);
    if (
      distance === 0 &&
      self.separationId !== undefined &&
      other.separationId !== undefined &&
      self.separationId !== other.separationId
    ) {
      nudgeX += self.separationId < other.separationId ? -1 : 1;
      continue;
    }
    if (distance > 0 && distance < minDistance) {
      const strength = (minDistance - distance) / minDistance;
      nudgeX += (dx / distance) * strength;
      nudgeY += (dy / distance) * strength;
    }
  }
  return { x: nudgeX, y: nudgeY };
}

export function addSeparationVelocity(
  baseVelocity: Point,
  self: Point,
  others: Point[],
  minDistance: number,
  separationSpeed: number
): Point {
  const nudge = computeSeparationNudge(self, others, minDistance);
  const magnitude = Math.hypot(nudge.x, nudge.y);
  const scale = magnitude > 1 ? 1 / magnitude : 1;
  return {
    x: baseVelocity.x + nudge.x * scale * separationSpeed,
    y: baseVelocity.y + nudge.y * scale * separationSpeed
  };
}

/**
 * The one settled-movement boundary used by all three enemy archetypes. Keeping the
 * archetype exhaustive here lets the tests exercise the contract that melee, ranged, and
 * debuffer all retain their base velocity while receiving the same bounded separation.
 */
export function computeSettledEnemyVelocity(
  archetype: EnemyArchetype,
  baseVelocity: Point,
  self: Point,
  sameArchetypeEnemies: Point[],
  minDistance: number,
  separationSpeed: number
): Point {
  switch (archetype) {
    case "melee":
    case "ranged":
    case "debuffer":
      return addSeparationVelocity(baseVelocity, self, sameArchetypeEnemies, minDistance, separationSpeed);
  }
}
import type { EnemyArchetype } from "../data/types";
