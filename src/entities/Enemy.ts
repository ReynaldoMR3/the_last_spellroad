import Phaser from "phaser";
import type { DebuffVariant, EnemyArchetype } from "../data/types";

/** hp-template.md, "Enemy Archetype Per-Hit Damage" — fixed, never invented per-encounter. */
export const ARCHETYPE_DAMAGE: Record<EnemyArchetype, number> = {
  melee: 7,
  ranged: 4,
  debuffer: 0
};

const ARCHETYPE_COLOR: Record<EnemyArchetype, number> = {
  melee: 0xb1443e,
  ranged: 0xd8a53d,
  debuffer: 0x6f4fa8
};

const ARCHETYPE_SPEED: Record<EnemyArchetype, number> = {
  melee: 90,
  ranged: 60,
  debuffer: 55
};

const MELEE_RANGE = 34;
const MELEE_COOLDOWN_MS = 1200;
const RANGED_PREFERRED_RANGE = 220;
const RANGED_COOLDOWN_MS = 1800;
const DEBUFFER_PREFERRED_RANGE = 200;
const DEBUFFER_COOLDOWN_MS = 2500;

/**
 * Enemy-side HP. hp-template.md only fixes the player's pool and the per-hit damage the
 * player takes — it does not define a base enemy-HP number (Warden's own log flags this
 * exact gap). This is an engine-testing placeholder, not a shipped design number; flag to
 * Pato/developer before a future boss needs individually tougher enemies.
 */
const PLACEHOLDER_ENEMY_HP: Record<EnemyArchetype, number> = {
  melee: 18,
  ranged: 14,
  debuffer: 22
};

export interface EnemyCallbacks {
  onMeleeHit?: () => void;
  onRangedFire?: (fromX: number, fromY: number, toX: number, toY: number) => void;
  onDebuffPulse?: (variant: DebuffVariant) => void;
}

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  public readonly archetype: EnemyArchetype;
  public readonly maxHp: number;
  public hp: number;
  private attackCooldownMs = 0;
  private readonly debuffVariant: DebuffVariant;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    archetype: EnemyArchetype,
    debuffVariant: DebuffVariant = "speed"
  ) {
    super(scene, x, y, Enemy.ensureTexture(scene, archetype));
    this.archetype = archetype;
    this.maxHp = PLACEHOLDER_ENEMY_HP[archetype];
    this.hp = this.maxHp;
    this.debuffVariant = debuffVariant;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
  }

  private static ensureTexture(scene: Phaser.Scene, archetype: EnemyArchetype): string {
    const key = `enemy-${archetype}`;
    if (scene.textures.exists(key)) {
      return key;
    }
    const graphics = scene.add.graphics();
    graphics.fillStyle(ARCHETYPE_COLOR[archetype], 1);
    graphics.fillRoundedRect(0, 0, 26, 26, 6);
    graphics.generateTexture(key, 26, 26);
    graphics.destroy();
    return key;
  }

  /** @returns true if this hit reduced the enemy to 0 HP or below. */
  takeDamage(amount: number): boolean {
    this.hp -= amount;
    return this.hp <= 0;
  }

  update(deltaMs: number, targetX: number, targetY: number, callbacks: EnemyCallbacks): void {
    this.attackCooldownMs = Math.max(0, this.attackCooldownMs - deltaMs);
    const body = this.body as Phaser.Physics.Arcade.Body;
    const toTarget = new Phaser.Math.Vector2(targetX - this.x, targetY - this.y);
    const distance = toTarget.length();
    const direction = distance === 0 ? new Phaser.Math.Vector2(0, 0) : toTarget.clone().normalize();

    if (this.archetype === "melee") {
      if (distance > MELEE_RANGE) {
        body.setVelocity(direction.x * ARCHETYPE_SPEED.melee, direction.y * ARCHETYPE_SPEED.melee);
      } else {
        body.setVelocity(0, 0);
        if (this.attackCooldownMs <= 0) {
          this.attackCooldownMs = MELEE_COOLDOWN_MS;
          callbacks.onMeleeHit?.();
        }
      }
      return;
    }

    const preferredRange = this.archetype === "ranged" ? RANGED_PREFERRED_RANGE : DEBUFFER_PREFERRED_RANGE;
    const speed = ARCHETYPE_SPEED[this.archetype];
    if (distance > preferredRange + 20) {
      body.setVelocity(direction.x * speed, direction.y * speed);
    } else if (distance < preferredRange - 20) {
      body.setVelocity(-direction.x * speed, -direction.y * speed);
    } else {
      body.setVelocity(0, 0);
    }

    if (distance <= preferredRange + 40 && this.attackCooldownMs <= 0) {
      if (this.archetype === "ranged") {
        this.attackCooldownMs = RANGED_COOLDOWN_MS;
        callbacks.onRangedFire?.(this.x, this.y, targetX, targetY);
      } else {
        this.attackCooldownMs = DEBUFFER_COOLDOWN_MS;
        callbacks.onDebuffPulse?.(this.debuffVariant);
      }
    }
  }
}
