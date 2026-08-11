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

/**
 * Issue #167 — these two live here, next to the arithmetic they tune, rather than in `Enemy.ts`
 * where they started. They were moved because the bug they caused was a *tuning* bug, not a
 * logic bug, and no test could reach them while they sat inside a Phaser-importing module (no
 * test in this repo imports Phaser — see the pure-seam convention in this file's header). The
 * force-balance contract in `enemySeparation.test.ts` now asserts them directly.
 *
 * See `Enemy.ts`'s `ENEMY_SEPARATION_SPEED` comment for the full derivation and the measured
 * before/after. Both remain explicit engine-feel numbers, not Pato's economy values.
 */
/** How close two enemies (any archetype) may get before pushing apart. Sized above the 26x26
 * sprite footprint (`Enemy.ensureTexture`) so the push fires before sprites visibly overlap,
 * and still below the ~50px gap between the ranged/debuffer preferred-range bands so it can
 * never reach across them. */
export const ENEMY_SEPARATION_DISTANCE = 40;
/** Must exceed the fastest chase speed that opposes it (`ARCHETYPE_SPEED.melee` = 90 in
 * `Enemy.ts`) — see `MELEE_CHASE_SPEED` in this module's test. */
export const ENEMY_SEPARATION_SPEED = 140;

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
 * Issue #167 — `computeSettledEnemyVelocity(archetype, ...)` used to sit here: an exhaustive
 * switch over the three archetypes whose every arm returned the identical
 * `addSeparationVelocity` call, fed a parameter literally named `sameArchetypeEnemies`. It was
 * removed rather than renamed, because its shape encoded the very bug #167 reports. Separation
 * is anti-overlap geometry between two 26x26 sprite footprints — it has nothing to say about
 * what archetype either sprite is, and nothing to say about whether that sprite has "settled".
 * `Enemy.ts` now calls `addSeparationVelocity` directly, against every nearby enemy regardless
 * of archetype, on every movement branch rather than only the hold-range ones. See
 * `Enemy.update`'s own comment for why that cannot disturb the per-archetype preferred-range
 * bands.
 */
