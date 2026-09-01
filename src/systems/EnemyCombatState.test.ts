import { describe, expect, it } from "vitest";
import type { ResolvedElementalHit } from "./elementalDamage";
import { EnemyCombatState } from "./EnemyCombatState";

type Hit = Omit<ResolvedElementalHit, "target">;

function hit(overrides: Partial<Hit> = {}): Hit {
  return {
    directDamage: 3,
    effectDamage: 0,
    totalDamage: 3,
    outcome: "neutral",
    ...overrides
  };
}

describe("EnemyCombatState", () => {
  it("applies one resolved synchronous player-spell hit atomically", () => {
    const state = new EnemyCombatState(10);
    const resolvedHit = hit({ directDamage: 5, effectDamage: 2, totalDamage: 7 });

    const result = state.applyElementalHit(resolvedHit);

    expect(result).toEqual({
      applied: true,
      killed: false,
      effectApplied: false,
      cancelledDebuffTelegraph: false
    });
    expect(state.hp).toBe(3);
  });

  it("makes overkill/death one-shot and never applies a status after death", () => {
    const state = new EnemyCombatState(5);
    const killingHit = hit({
      directDamage: 5,
      totalDamage: 5,
      statusEffect: { kind: "weaken", outgoingDamageMultiplier: 0.8, durationMs: 3000 }
    });

    expect(state.applyElementalHit(killingHit)).toEqual({
      applied: true,
      killed: true,
      effectApplied: false,
      cancelledDebuffTelegraph: false
    });
    expect(state.hp).toBe(0);
    expect(state.defeated).toBe(true);
    expect(state.isWeakened).toBe(false);
    expect(state.applyElementalHit(killingHit)).toEqual({
      applied: false,
      killed: false,
      effectApplied: false,
      cancelledDebuffTelegraph: false
    });
    expect(state.hp).toBe(0);
  });

  it("keeps one ice weaken stack, refreshes its 3000ms duration, and restores authored damage", () => {
    const state = new EnemyCombatState(20);
    const weakenHit = hit({
      directDamage: 1,
      totalDamage: 1,
      statusEffect: { kind: "weaken", outgoingDamageMultiplier: 0.8, durationMs: 3000 }
    });

    expect(state.applyElementalHit(weakenHit).effectApplied).toBe(true);
    expect(state.isWeakened).toBe(true);
    expect(state.outgoingDamageMultiplier).toBe(0.8);
    expect(state.outgoingDamage(7, 1)).toBe(6);
    state.tick(2500);
    expect(state.applyElementalHit(weakenHit).effectApplied).toBe(true);
    expect(state.outgoingDamageMultiplier).toBe(0.8);
    state.tick(2999);
    expect(state.isWeakened).toBe(true);
    state.tick(1);
    expect(state.isWeakened).toBe(false);
    expect(state.outgoingDamage(7, 1)).toBe(7);
  });

  it("stuns for 500ms, then enforces a non-extending 1500ms reapply lockout", () => {
    const state = new EnemyCombatState(20);
    const stunHit = hit({
      directDamage: 1,
      totalDamage: 1,
      statusEffect: { kind: "stun", durationMs: 500, reapplyLockoutMs: 1500 }
    });

    expect(state.applyElementalHit(stunHit).effectApplied).toBe(true);
    state.tick(250);
    expect(state.applyElementalHit(stunHit).effectApplied).toBe(false);
    state.tick(250);
    expect(state.isStunned).toBe(false);
    expect(state.applyElementalHit(stunHit).effectApplied).toBe(false);
    state.tick(1499);
    expect(state.applyElementalHit(stunHit).effectApplied).toBe(false);
    state.tick(1);
    expect(state.applyElementalHit(stunHit).effectApplied).toBe(true);
    expect(state.isStunned).toBe(true);
  });

  it("cancels a committed Debuffer wind-up on stun without a later invisible fire", () => {
    const state = new EnemyCombatState(20);
    const stunHit = hit({
      directDamage: 1,
      totalDamage: 1,
      statusEffect: { kind: "stun", durationMs: 500, reapplyLockoutMs: 1500 }
    });

    expect(state.beginDebuffTelegraph(450)).toBe(true);
    expect(state.tick(200).debuffTelegraphCompleted).toBe(false);
    expect(state.applyElementalHit(stunHit)).toEqual({
      applied: true,
      killed: false,
      effectApplied: true,
      cancelledDebuffTelegraph: true
    });

    // The old split timer/tween behavior completed the visual at 450ms, then fired an
    // invisible projectile after stun ended. A cancelled commitment never completes later.
    expect(state.tick(300).debuffTelegraphCompleted).toBe(false);
    expect(state.beginDebuffTelegraph(450)).toBe(false);
    expect(state.tick(200).debuffTelegraphCompleted).toBe(false);

    // Cancellation is per-attack: once stun ends, the enemy can make a later commitment with
    // a full, visible tell. The 1500ms lockout prevents only another stun, not enemy actions.
    expect(state.beginDebuffTelegraph(450)).toBe(true);
    expect(state.tick(449).debuffTelegraphCompleted).toBe(false);
    expect(state.tick(1).debuffTelegraphCompleted).toBe(true);
  });

  it("leaves melee/ranged authored damage unchanged without ice weaken", () => {
    const state = new EnemyCombatState(20);

    expect(state.outgoingDamage(7, 1)).toBe(7);
    expect(state.outgoingDamage(4, 1.1)).toBe(4);
  });
});
