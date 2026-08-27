import { describe, expect, it } from "vitest";
import { createCoverState } from "./destructibleCover";
import {
  RANGED_HIT_RADIUS,
  isStillInRangedImpactZone,
  resolveCoverImpactOnPath,
  type CoverPathCandidate
} from "./rangedImpact";

describe("isStillInRangedImpactZone", () => {
  it("returns true when the player never moved from the fired-at point", () => {
    expect(isStillInRangedImpactZone(100, 100, 100, 100)).toBe(true);
  });

  it("returns false when the player has moved well outside the hit radius by impact time", () => {
    // Issue #47's exact bug: an archer fires at (100, 100); the player dodges far away
    // during the travel window. This must NOT still count as a hit.
    expect(isStillInRangedImpactZone(400, 400, 100, 100)).toBe(false);
  });

  it("returns true when the player has only moved a small amount, still within the hit radius", () => {
    expect(isStillInRangedImpactZone(100 + RANGED_HIT_RADIUS - 1, 100, 100, 100)).toBe(true);
  });

  it("treats the hit radius boundary as inclusive", () => {
    expect(isStillInRangedImpactZone(100 + RANGED_HIT_RADIUS, 100, 100, 100)).toBe(true);
  });

  it("returns false just outside the hit radius boundary", () => {
    expect(isStillInRangedImpactZone(100 + RANGED_HIT_RADIUS + 1, 100, 100, 100)).toBe(false);
  });

  it("accepts a caller-supplied hit radius instead of the default", () => {
    expect(isStillInRangedImpactZone(150, 100, 100, 100, 60)).toBe(true);
    expect(isStillInRangedImpactZone(150, 100, 100, 100, 40)).toBe(false);
  });
});

describe("resolveCoverImpactOnPath", () => {
  const cover = (
    objectId: number,
    x: number,
    hp: number = 50
  ): CoverPathCandidate => ({
    objectId,
    rect: { x, y: -5, width: 10, height: 10 },
    state: createCoverState(String(objectId), hp)
  });

  it("applies spell power to the first intact cover before a target", () => {
    const impact = resolveCoverImpactOnPath({
      from: { x: 0, y: 0 },
      to: { x: 100, y: 0 },
      covers: [cover(2, 60), cover(1, 20)],
      damage: 15,
      source: "spell"
    });

    expect(impact).toEqual({
      objectId: 1,
      state: { id: "1", hp: 35, maxHp: 50, destroyed: false },
      damageApplied: 15,
      destroyed: false
    });
  });

  it("applies ranged damage and lets later shots travel through destroyed cover", () => {
    const intact = cover(1, 20, 4);
    const firstImpact = resolveCoverImpactOnPath({
      from: { x: 0, y: 0 },
      to: { x: 100, y: 0 },
      covers: [intact],
      damage: 4,
      source: "ranged"
    });

    expect(firstImpact).toEqual({
      objectId: 1,
      state: { id: "1", hp: 0, maxHp: 4, destroyed: true },
      damageApplied: 4,
      destroyed: true
    });
    expect(
      resolveCoverImpactOnPath({
        from: { x: 0, y: 0 },
        to: { x: 100, y: 0 },
        covers: [{ ...intact, state: firstImpact!.state }],
        damage: 4,
        source: "ranged"
      })
    ).toBeNull();
  });

  it("does not route melee attacks into cover", () => {
    expect(
      resolveCoverImpactOnPath({
        from: { x: 0, y: 0 },
        to: { x: 100, y: 0 },
        covers: [cover(1, 20)],
        damage: 50,
        source: "melee"
      })
    ).toBeNull();
  });

  it("ignores cover rectangles that the travel segment misses", () => {
    expect(
      resolveCoverImpactOnPath({
        from: { x: 0, y: 20 },
        to: { x: 100, y: 20 },
        covers: [cover(1, 20)],
        damage: 15,
        source: "spell"
      })
    ).toBeNull();
  });
});
