import Phaser from "phaser";
import type { WaveDefinition } from "../data/types";
import { ENEMY_REGISTRY } from "../data/enemyRegistry";
import { Enemy } from "../entities/Enemy";

/**
 * Spawns a wave's enemies on their staggered spawn_delay_ms timers — Engine Integration
 * step 5: "the encounter system reads a wave.json entry to call Loomwright's spawn API."
 *
 * `isStillCurrent` (issue #48) is checked inside every one of those staggered timers, right
 * before the enemy is constructed. Without it, a wave the player died in (or that a stale
 * auto-advance started) kept spawning its remaining enemies into whatever wave came next,
 * inflating that wave's count — the timers outlive the wave that queued them, so the callback
 * has to ask whether its wave is still the live one. Required, not defaulted: a new call site
 * must decide what "still current" means for it rather than silently inheriting the old
 * fire-unconditionally behaviour. See `systems/waveSession.ts`.
 */
export function spawnWave(
  scene: Phaser.Scene,
  wave: WaveDefinition,
  spawnPoint: { x: number; y: number },
  laneRect: Phaser.Geom.Rectangle,
  onSpawn: (enemy: Enemy) => void,
  isStillCurrent: () => boolean
): void {
  for (const entry of wave.enemies) {
    const registryEntry = ENEMY_REGISTRY[entry.type];
    if (!registryEntry) {
      console.warn(`Unknown enemy type "${entry.type}" — not in ENEMY_REGISTRY, skipping.`);
      continue;
    }
    for (let i = 0; i < entry.count; i++) {
      scene.time.delayedCall(entry.spawn_delay_ms + i * 250, () => {
        if (!isStillCurrent()) {
          return;
        }
        const jitterX = Phaser.Math.Between(-40, 40);
        const jitterY = Phaser.Math.Between(-30, 30);
        const enemy = new Enemy(
          scene,
          spawnPoint.x + jitterX,
          spawnPoint.y + jitterY,
          registryEntry.archetype,
          registryEntry.debuffVariant ?? "speed",
          laneRect,
          wave.hp_modifier,
          wave.damage_modifier
        );
        onSpawn(enemy);
      });
    }
  }
}
