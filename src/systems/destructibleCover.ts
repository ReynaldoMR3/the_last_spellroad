export type CoverDamageSource = "spell" | "ranged" | "melee";

export interface CoverState {
  id: string;
  hp: number;
  maxHp: number;
  destroyed: boolean;
}

export interface CoverDamageResult {
  state: CoverState;
  damageApplied: number;
  destroyed: boolean;
}

export function createCoverState(id: string, maxHp: number): CoverState {
  const clampedMaxHp = Math.max(0, maxHp);

  return {
    id,
    hp: clampedMaxHp,
    maxHp: clampedMaxHp,
    destroyed: clampedMaxHp === 0
  };
}

export function damageCover(
  state: CoverState,
  damage: number,
  source: CoverDamageSource
): CoverDamageResult {
  if (source === "melee" || state.destroyed) {
    return {
      state,
      damageApplied: 0,
      destroyed: state.destroyed
    };
  }

  const clampedDamage = Math.max(0, damage);
  const nextHp = Math.max(0, state.hp - clampedDamage);
  const nextState: CoverState = {
    ...state,
    hp: nextHp,
    destroyed: nextHp === 0
  };

  return {
    state: nextState,
    damageApplied: state.hp - nextHp,
    destroyed: nextState.destroyed
  };
}

export function coverBlocksMovement(state: CoverState): boolean {
  return !state.destroyed && state.hp > 0;
}

export function coverBlocksProjectile(state: CoverState): boolean {
  return !state.destroyed && state.hp > 0;
}
