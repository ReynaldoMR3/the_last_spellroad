import { describe, expect, it } from "vitest";
import { computeSeparationNudge } from "./meleeSeparation";

describe("computeSeparationNudge", () => {
  it("returns zero with no other enemies", () => {
    expect(computeSeparationNudge({ x: 0, y: 0 }, [], 40)).toEqual({ x: 0, y: 0 });
  });

  it("returns zero when every other enemy is at or beyond minDistance", () => {
    const nudge = computeSeparationNudge({ x: 0, y: 0 }, [{ x: 40, y: 0 }], 40);
    expect(nudge).toEqual({ x: 0, y: 0 });
  });

  it("pushes directly away from a single too-close ally", () => {
    // Other enemy is 10px to the right (positive x); self should be pushed left (negative x).
    const nudge = computeSeparationNudge({ x: 0, y: 0 }, [{ x: 10, y: 0 }], 40);
    expect(nudge.x).toBeLessThan(0);
    expect(nudge.y).toBeCloseTo(0, 10);
  });

  it("scales push strength by how much the gap is violated", () => {
    const barelyTooClose = computeSeparationNudge({ x: 0, y: 0 }, [{ x: 39, y: 0 }], 40);
    const nearlyCoincident = computeSeparationNudge({ x: 0, y: 0 }, [{ x: 1, y: 0 }], 40);
    expect(Math.abs(nearlyCoincident.x)).toBeGreaterThan(Math.abs(barelyTooClose.x));
  });

  it("sums pushes from multiple too-close allies", () => {
    const oneAlly = computeSeparationNudge({ x: 0, y: 0 }, [{ x: 10, y: 0 }], 40);
    const twoAlliesSameSide = computeSeparationNudge(
      { x: 0, y: 0 },
      [
        { x: 10, y: 0 },
        { x: 15, y: 0 }
      ],
      40
    );
    expect(Math.abs(twoAlliesSameSide.x)).toBeGreaterThan(Math.abs(oneAlly.x));
  });

  it("cancels out to zero for two allies equidistant on opposite sides", () => {
    const nudge = computeSeparationNudge(
      { x: 0, y: 0 },
      [
        { x: 10, y: 0 },
        { x: -10, y: 0 }
      ],
      40
    );
    expect(nudge.x).toBeCloseTo(0, 10);
    expect(nudge.y).toBeCloseTo(0, 10);
  });

  it("ignores an ally at the exact same position rather than producing NaN", () => {
    const nudge = computeSeparationNudge({ x: 5, y: 5 }, [{ x: 5, y: 5 }], 40);
    expect(nudge).toEqual({ x: 0, y: 0 });
  });

  it("ignores allies beyond minDistance while still reacting to a close one", () => {
    const nudge = computeSeparationNudge(
      { x: 0, y: 0 },
      [
        { x: 100, y: 100 },
        { x: 5, y: 0 }
      ],
      40
    );
    expect(nudge.x).toBeLessThan(0);
  });
});
