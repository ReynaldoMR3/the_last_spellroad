import { describe, expect, it } from "vitest";
import {
  coverBlocksMovement,
  coverBlocksProjectile,
  createCoverState,
  damageCover
} from "./destructibleCover";

describe("destructible cover", () => {
  it("creates intact cover that blocks movement and projectiles", () => {
    const state = createCoverState("pillar-a", 50);

    expect(state).toEqual({
      id: "pillar-a",
      hp: 50,
      maxHp: 50,
      destroyed: false
    });
    expect(coverBlocksMovement(state)).toBe(true);
    expect(coverBlocksProjectile(state)).toBe(true);
  });

  it("applies spell damage without mutating the previous state", () => {
    const state = createCoverState("pillar-a", 50);

    const result = damageCover(state, 15, "spell");

    expect(result).toEqual({
      state: { id: "pillar-a", hp: 35, maxHp: 50, destroyed: false },
      damageApplied: 15,
      destroyed: false
    });
    expect(state.hp).toBe(50);
  });

  it("applies ranged damage", () => {
    const result = damageCover(createCoverState("pillar-a", 50), 20, "ranged");

    expect(result.state.hp).toBe(30);
    expect(result.damageApplied).toBe(20);
    expect(result.destroyed).toBe(false);
  });

  it("makes melee attacks harmless to cover", () => {
    const state = createCoverState("pillar-a", 50);

    const result = damageCover(state, 50, "melee");

    expect(result).toEqual({
      state,
      damageApplied: 0,
      destroyed: false
    });
  });

  it("clamps maximum HP and damage to nonnegative values", () => {
    const state = createCoverState("pillar-a", -10);

    expect(state).toEqual({
      id: "pillar-a",
      hp: 0,
      maxHp: 0,
      destroyed: true
    });

    const result = damageCover(createCoverState("pillar-b", 20), -5, "spell");

    expect(result).toEqual({
      state: { id: "pillar-b", hp: 20, maxHp: 20, destroyed: false },
      damageApplied: 0,
      destroyed: false
    });
  });

  it("clamps overkill at zero and makes destroyed cover non-blocking", () => {
    const state = createCoverState("pillar-a", 25);

    const result = damageCover(state, 40, "ranged");

    expect(result).toEqual({
      state: { id: "pillar-a", hp: 0, maxHp: 25, destroyed: true },
      damageApplied: 25,
      destroyed: true
    });
    expect(coverBlocksMovement(result.state)).toBe(false);
    expect(coverBlocksProjectile(result.state)).toBe(false);
  });
});
