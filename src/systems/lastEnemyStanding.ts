import type { EnemyArchetype } from "../data/types";

/**
 * Backlog 2.38 / issue #87 — the Tarrywright (Debuffer archetype) deals 0 direct damage by
 * design (`ARCHETYPE_DAMAGE.debuffer === 0`, `Enemy.ts`), an intentional recovery beat. Developer
 * feedback (2026-08-03, reinforced 2026-08-05) called being left alone with one "risk-free"/
 * "doesn't do anything else". Developer's resolution (2026-08-06): keep the 0-damage design —
 * don't reopen that locked number — but a Debuffer left as the *only* thing standing, with
 * nothing left to protect, shouldn't force an indefinite pointless standoff. It yields instead.
 *
 * Pure, Phaser-free predicate so the trigger condition is testable without a running Scene —
 * same seam convention as `waveSession.ts`'s `shouldAutoAdvance`, which this deliberately mirrors
 * the shape of (it also gates on "nothing left to spawn").
 */

export interface EnemyLike {
  active: boolean;
  archetype: EnemyArchetype;
}

export function allRemainingAreYieldingDebuffers(
  enemies: readonly EnemyLike[],
  enemiesRemainingToSpawn: number
): boolean {
  if (enemiesRemainingToSpawn > 0) {
    return false;
  }
  const active = enemies.filter((e) => e.active);
  return active.length > 0 && active.every((e) => e.archetype === "debuffer");
}
