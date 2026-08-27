import { describe, expect, it } from "vitest";
import { RANGED_HIT_RADIUS, isStillInRangedImpactZone } from "./rangedImpact";

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
