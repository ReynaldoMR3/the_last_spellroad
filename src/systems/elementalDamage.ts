import type { Element, SpellDefinition, WaveEnemyEntry } from "../data/types";

const ELEMENTAL_MULTIPLIERS: Record<Element, Record<Element, number>> = {
  fire: { fire: 1, ice: 1.25, earth: 1, lightning: 0.75 },
  ice: { fire: 0.75, ice: 1, earth: 1.25, lightning: 1 },
  earth: { fire: 1, ice: 0.75, earth: 1, lightning: 1.25 },
  lightning: { fire: 1.25, ice: 1, earth: 0.75, lightning: 1 }
};

export function getElementalMultiplier(spellElement: Element, monsterElement: Element): number {
  return ELEMENTAL_MULTIPLIERS[spellElement][monsterElement];
}

export function calculateElementalDamage(
  basePower: number,
  spellElement: Element,
  monsterElement: Element,
  masteryPowerBonus = 0,
  resistanceMultiplier?: number
): number {
  const elementalMultiplier = resistanceMultiplier ?? getElementalMultiplier(spellElement, monsterElement);
  return Math.round((basePower + masteryPowerBonus) * elementalMultiplier);
}

/** elemental-template.md's replacement scalar for direct hits on a resistant boss. */
export const BOSS_RESISTANCE_MULTIPLIER = 0.5;

/** The shipped Tiled maps use native 16px tiles (`levelArt.ts`); fire's one-tile pressure
 * therefore compares caster/target centres against this explicit engine-space distance. */
export const ELEMENTAL_EFFECT_TILE_SIZE_PX = 16;

export type ElementalOutcome = "advantage" | "disadvantage" | "neutral" | "resistance";

export type ResolvedStatusEffect =
  | { kind: "weaken"; outgoingDamageMultiplier: number; durationMs: number }
  | { kind: "stun"; durationMs: number; reapplyLockoutMs: number };

export interface ElementalCombatTarget {
  x: number;
  y: number;
  /** Monotonic wave-spawn order. Used only after distance ties. */
  spawnOrder: number;
  element: Element;
  resistantElements: readonly Element[];
}

export interface EnemyElementalState {
  element: Element;
  resistantElements: readonly Element[];
}

/** Converts validated authored field names to explicit runtime state and defensively copies
 * the resistance list so a later cache mutation cannot rewrite a live enemy. */
export function snapshotEnemyElementalState(
  entry: Pick<WaveEnemyEntry, "element" | "resistant_elements">
): EnemyElementalState {
  return {
    element: entry.element,
    resistantElements: Object.freeze([...(entry.resistant_elements ?? [])])
  };
}

export interface ResolvedElementalHit<TTarget extends ElementalCombatTarget = ElementalCombatTarget> {
  target: TTarget;
  directDamage: number;
  effectDamage: number;
  totalDamage: number;
  outcome: ElementalOutcome;
  statusEffect?: ResolvedStatusEffect;
}

export interface ResolveElementalCastInput<TTarget extends ElementalCombatTarget> {
  spell: Pick<SpellDefinition, "element" | "base_power" | "effect">;
  masteryPowerBonus: number;
  maxTargets: number;
  caster: { x: number; y: number };
  /** Caster for line/cone; the clamped cast centre for circle. */
  primaryOrigin: { x: number; y: number };
  /** Targets already accepted by the authored line/cone/circle hit test, in spawn order. */
  targets: readonly TTarget[];
}

function outcomeFor(
  spellElement: Element,
  targetElement: Element,
  isResistant: boolean
): ElementalOutcome {
  if (isResistant) {
    return "resistance";
  }
  const multiplier = getElementalMultiplier(spellElement, targetElement);
  if (multiplier > 1) {
    return "advantage";
  }
  if (multiplier < 1) {
    return "disadvantage";
  }
  return "neutral";
}

function distanceSquared(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Pure per-cast combat resolution. Geometry remains owned by `SpellCaster`; this function only
 * consumes its valid targets, applies the additive Mastery/direct-damage contract independently
 * per target, and attaches the one authored elemental secondary effect without expanding shape.
 */
export function resolveElementalCast<TTarget extends ElementalCombatTarget>(
  input: ResolveElementalCastInput<TTarget>
): ResolvedElementalHit<TTarget>[] {
  const targets = input.targets.slice(0, input.maxTargets);
  const earthPrimary = input.spell.effect.kind === "single_target_burst"
    ? targets.reduce<TTarget | undefined>((nearest, candidate) => {
        if (!nearest) {
          return candidate;
        }
        const candidateDistance = distanceSquared(candidate, input.primaryOrigin);
        const nearestDistance = distanceSquared(nearest, input.primaryOrigin);
        if (candidateDistance < nearestDistance) {
          return candidate;
        }
        if (candidateDistance === nearestDistance && candidate.spawnOrder < nearest.spawnOrder) {
          return candidate;
        }
        return nearest;
      }, undefined)
    : undefined;

  return targets.map((target) => {
    const isResistant = target.resistantElements.includes(input.spell.element);
    const directDamage = calculateElementalDamage(
      input.spell.base_power,
      input.spell.element,
      target.element,
      input.masteryPowerBonus,
      isResistant ? BOSS_RESISTANCE_MULTIPLIER : undefined
    );
    let effectDamage = 0;
    let statusEffect: ResolvedStatusEffect | undefined;

    switch (input.spell.effect.kind) {
      case "adjacent_pressure": {
        const rangePx = input.spell.effect.range_tiles * ELEMENTAL_EFFECT_TILE_SIZE_PX;
        if (distanceSquared(target, input.caster) <= rangePx * rangePx) {
          effectDamage = input.spell.effect.bonus_damage;
        }
        break;
      }
      case "single_target_burst":
        if (target === earthPrimary) {
          effectDamage = input.spell.effect.bonus_damage;
        }
        break;
      case "weaken":
        statusEffect = {
          kind: "weaken",
          outgoingDamageMultiplier: input.spell.effect.outgoing_damage_multiplier,
          durationMs: input.spell.effect.duration_ms
        };
        break;
      case "stun":
        statusEffect = {
          kind: "stun",
          durationMs: input.spell.effect.duration_ms,
          reapplyLockoutMs: input.spell.effect.reapply_lockout_ms
        };
        break;
    }

    return {
      target,
      directDamage,
      effectDamage,
      totalDamage: directDamage + effectDamage,
      outcome: outcomeFor(input.spell.element, target.element, isResistant),
      ...(statusEffect ? { statusEffect } : {})
    };
  });
}
