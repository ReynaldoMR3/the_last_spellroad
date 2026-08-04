import type { WaveDefinition } from "../data/types";
import type { EnemyRegistryEntry } from "../data/enemyRegistry";

/**
 * Pure, Phaser-free logic backing the wave-completion spawn count (issue #71's soft-lock
 * fix) — same seam convention as `waveThreatBudget.ts`/`autoAim.ts`: the actual testable
 * arithmetic lives here; `WaveLoader.spawnWave`'s own skip (unknown `type`, not in
 * `ENEMY_REGISTRY`) and `SpellroadScene`'s `enemiesRemainingToSpawn` field are the Phaser-side
 * wiring around it.
 *
 * The audit (`docs/audits/2026-08-02-json-content-architecture.md`, finding #3) found
 * `enemiesRemainingToSpawn` was initialized from every authored entry's `count`, including
 * entries `spawnWave` silently skips for an unregistered `type` — since a skipped entry never
 * calls `onSpawn`, the counter could never reach zero and the wave soft-locked permanently,
 * even after every spawnable enemy died. Counting only registered entries here means an
 * unregistered name becomes a visibly-missing enemy (fewer than the file lists) instead of an
 * unrecoverable freeze, without needing a second "decrement on skip" code path to stay in
 * sync with this one.
 */
export function countSpawnableEnemies(
  wave: WaveDefinition,
  registry: Record<string, EnemyRegistryEntry>
): number {
  return wave.enemies.reduce((sum, entry) => (registry[entry.type] ? sum + entry.count : sum), 0);
}
