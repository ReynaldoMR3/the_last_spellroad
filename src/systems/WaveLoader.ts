import Phaser from "phaser";
import type { WaveDefinition } from "../data/types";
import { ENEMY_REGISTRY } from "../data/enemyRegistry";
import { Enemy } from "../entities/Enemy";

/**
 * Spawns a wave's enemies on their staggered spawn_delay_ms timers — Engine Integration
 * step 5: "the encounter system reads a wave.json entry to call Loomwright's spawn API."
 */
export function spawnWave(
  scene: Phaser.Scene,
  wave: WaveDefinition,
  spawnPoint: { x: number; y: number },
  onSpawn: (enemy: Enemy) => void
): void {
  for (const entry of wave.enemies) {
    const registryEntry = ENEMY_REGISTRY[entry.type];
    if (!registryEntry) {
      console.warn(`Unknown enemy type "${entry.type}" — not in ENEMY_REGISTRY, skipping.`);
      continue;
    }
    for (let i = 0; i < entry.count; i++) {
      scene.time.delayedCall(entry.spawn_delay_ms + i * 250, () => {
        const jitterX = Phaser.Math.Between(-40, 40);
        const jitterY = Phaser.Math.Between(-30, 30);
        const enemy = new Enemy(
          scene,
          spawnPoint.x + jitterX,
          spawnPoint.y + jitterY,
          registryEntry.archetype,
          registryEntry.debuffVariant ?? "speed"
        );
        onSpawn(enemy);
      });
    }
  }
}
