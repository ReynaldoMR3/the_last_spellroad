import Phaser from "phaser";
import type { SpellDefinition } from "../data/types";
import { WEIGHT_CLASS } from "../systems/ManaSystem";
import type { ManaSystem } from "../systems/ManaSystem";
import type { MasterySystem } from "../systems/MasterySystem";

export type ShapeHitTest = (enemyX: number, enemyY: number) => boolean;

export interface CastResult {
  spellId: string;
  power: number;
  maxTargets: number;
  hitTest: ShapeHitTest;
}

const LINE_LENGTH = 220;
const LINE_WIDTH = 26;
const CONE_RADIUS = 180;
const CONE_HALF_ANGLE_DEG = 35;
const CIRCLE_RADIUS = 90;
const CIRCLE_MAX_PLACEMENT_RANGE = 250;

/**
 * Executes a validated cast: spends Mana (with the Master-tier discount already folded
 * in via MasterySystem), starts the per-spell cooldown, and builds a geometry hit-test
 * for the confirmed shape/placement — engine-contract.md's three shapes (line, cone,
 * circle), each per Frieren's authored spells.
 */
export class SpellCaster {
  private readonly cooldownsMs = new Map<string, number>();

  constructor(private readonly mana: ManaSystem, private readonly mastery: MasterySystem) {}

  isOnCooldown(spellId: string): boolean {
    return (this.cooldownsMs.get(spellId) ?? 0) > 0;
  }

  cooldownRemaining(spellId: string): number {
    return this.cooldownsMs.get(spellId) ?? 0;
  }

  tickCooldowns(deltaMs: number): void {
    for (const [id, remaining] of this.cooldownsMs) {
      this.cooldownsMs.set(id, Math.max(0, remaining - deltaMs));
    }
  }

  tryCast(
    spell: SpellDefinition,
    casterX: number,
    casterY: number,
    targetX: number,
    targetY: number
  ): CastResult | null {
    if (this.isOnCooldown(spell.id)) {
      return null;
    }
    const base = WEIGHT_CLASS[spell.weight];
    const scaling = this.mastery.getScaling(spell.id);
    const cost = Math.round(base.cost * scaling.costCooldownMultiplier);
    if (!this.mana.spend(cost)) {
      return null;
    }
    const cooldownMs = Math.round(base.cooldownMs * scaling.costCooldownMultiplier);
    this.cooldownsMs.set(spell.id, cooldownMs);

    return {
      spellId: spell.id,
      power: spell.base_power + scaling.powerBonus,
      maxTargets: spell.base_targets + scaling.targetsBonus,
      hitTest: this.buildHitTest(spell, casterX, casterY, targetX, targetY)
    };
  }

  private buildHitTest(
    spell: SpellDefinition,
    casterX: number,
    casterY: number,
    targetX: number,
    targetY: number
  ): ShapeHitTest {
    const toTarget = new Phaser.Math.Vector2(targetX - casterX, targetY - casterY);
    const direction = toTarget.length() === 0 ? new Phaser.Math.Vector2(1, 0) : toTarget.clone().normalize();

    if (spell.shape === "line") {
      const angle = Math.atan2(direction.y, direction.x);
      return (enemyX, enemyY) => {
        const relative = new Phaser.Math.Vector2(enemyX - casterX, enemyY - casterY).rotate(-angle);
        return relative.x >= 0 && relative.x <= LINE_LENGTH && Math.abs(relative.y) <= LINE_WIDTH / 2;
      };
    }

    if (spell.shape === "cone") {
      const facingDeg = Phaser.Math.RadToDeg(Math.atan2(direction.y, direction.x));
      return (enemyX, enemyY) => {
        const toEnemy = new Phaser.Math.Vector2(enemyX - casterX, enemyY - casterY);
        const dist = toEnemy.length();
        if (dist === 0 || dist > CONE_RADIUS) {
          return false;
        }
        const enemyDeg = Phaser.Math.RadToDeg(Math.atan2(toEnemy.y, toEnemy.x));
        const delta = Math.abs(Phaser.Math.Angle.ShortestBetween(facingDeg, enemyDeg));
        return delta <= CONE_HALF_ANGLE_DEG;
      };
    }

    // circle: centered on the confirmed placement point, clamped to a max range from the caster.
    const distance = Math.min(toTarget.length(), CIRCLE_MAX_PLACEMENT_RANGE);
    const center = new Phaser.Math.Vector2(casterX, casterY).add(direction.clone().scale(distance));
    return (enemyX, enemyY) => Phaser.Math.Distance.Between(enemyX, enemyY, center.x, center.y) <= CIRCLE_RADIUS;
  }
}

export const SHAPE_GEOMETRY = {
  LINE_LENGTH,
  LINE_WIDTH,
  CONE_RADIUS,
  CONE_HALF_ANGLE_DEG,
  CIRCLE_RADIUS,
  CIRCLE_MAX_PLACEMENT_RANGE
};
