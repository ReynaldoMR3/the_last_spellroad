/**
 * Pure, Phaser-free logic backing auto-aim (backlog 2.22 / issue #44) -- same seam
 * convention as `waveThreatBudget.ts`/`enemyStatusOverlay.ts`: the testable
 * selection algorithm lives here; wiring it to a live `Enemy` list and the mage's
 * `lastFacing` vector is `SpellroadScene`'s job.
 */

export interface AutoAimCandidate {
  x: number;
  y: number;
}

/**
 * Design doc `2026-08-01-auto-aim-cone-targeting-design.md`, decision 1: "a wide
 * (~150-180deg) facing cone". 165deg full angle (82.5deg half-angle) sits in the
 * middle of that range -- wide enough to catch an enemy beside/slightly behind the
 * mage during a strafe (the exact "dodge and cast back" complaint this exists to fix)
 * without going all the way to a full circle, which would remove target selection
 * entirely per the doc's rejection of "nearest enemy anywhere".
 */
export const AUTO_AIM_CONE_HALF_ANGLE_DEG = 82.5;

function angleDegrees(x: number, y: number): number {
  return (Math.atan2(y, x) * 180) / Math.PI;
}

/** Smallest angle between two angles in degrees, always in [0, 180]. */
function shortestAngleBetween(a: number, b: number): number {
  const diff = ((a - b + 180) % 360 + 360) % 360 - 180;
  return Math.abs(diff);
}

/**
 * Decision 1/2: nearest candidate within the facing cone; if none qualify, falls back
 * to the globally nearest candidate regardless of angle. Returns null only when
 * `candidates` is empty.
 */
export function selectAutoAimTarget<T extends AutoAimCandidate>(
  candidates: readonly T[],
  originX: number,
  originY: number,
  facingX: number,
  facingY: number,
  coneHalfAngleDeg: number = AUTO_AIM_CONE_HALF_ANGLE_DEG
): T | null {
  if (candidates.length === 0) {
    return null;
  }

  // A zero facing vector (e.g. before the mage has ever moved) has no meaningful
  // direction -- default to +x rather than feeding atan2(0, 0) a degenerate case.
  const facingAngle = facingX === 0 && facingY === 0 ? 0 : angleDegrees(facingX, facingY);

  let nearestOverall: T | null = null;
  let nearestOverallDist = Infinity;
  let nearestInCone: T | null = null;
  let nearestInConeDist = Infinity;

  for (const candidate of candidates) {
    const dx = candidate.x - originX;
    const dy = candidate.y - originY;
    const dist = Math.hypot(dx, dy);

    if (dist < nearestOverallDist) {
      nearestOverallDist = dist;
      nearestOverall = candidate;
    }

    const candidateAngle = dist === 0 ? facingAngle : angleDegrees(dx, dy);
    const inCone = shortestAngleBetween(facingAngle, candidateAngle) <= coneHalfAngleDeg;
    if (inCone && dist < nearestInConeDist) {
      nearestInConeDist = dist;
      nearestInCone = candidate;
    }
  }

  return nearestInCone ?? nearestOverall;
}
