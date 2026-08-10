import { describe, expect, it } from "vitest";
import { addSeparationVelocity, computeSeparationNudge, computeSettledEnemyVelocity, type Point } from "./enemySeparation";
import type { EnemyArchetype } from "../data/types";

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

describe("addSeparationVelocity", () => {
  it("pushes co-traveling ranged enemies apart without replacing their strafe velocity", () => {
    const velocity = addSeparationVelocity(
      { x: 0, y: 45 },
      { x: 100, y: 100 },
      [{ x: 110, y: 100 }],
      32,
      40
    );

    expect(velocity.x).toBeLessThan(0);
    expect(velocity.y).toBe(45);
  });

  it("caps the added separation speed when several allies crowd one enemy", () => {
    const velocity = addSeparationVelocity(
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      [
        { x: 101, y: 100 },
        { x: 102, y: 100 },
        { x: 103, y: 100 }
      ],
      32,
      40
    );

    expect(Math.hypot(velocity.x, velocity.y)).toBeCloseTo(40, 10);
  });

  it("gives exactly coincident enemies equal and opposite deterministic pushes", () => {
    const lowerId = addSeparationVelocity(
      { x: 0, y: 0 },
      { x: 100, y: 100, separationId: 1 },
      [{ x: 100, y: 100, separationId: 2 }],
      32,
      40
    );
    const higherId = addSeparationVelocity(
      { x: 0, y: 0 },
      { x: 100, y: 100, separationId: 2 },
      [{ x: 100, y: 100, separationId: 1 }],
      32,
      40
    );

    expect(lowerId.x).toBe(-40);
    expect(higherId.x).toBe(40);
    expect(lowerId.y).toBe(0);
    expect(higherId.y).toBe(0);
  });
});

describe("computeSettledEnemyVelocity", () => {
  it.each([
    ["melee", { x: 18, y: 0 }],
    ["ranged", { x: 0, y: 45 }],
    ["debuffer", { x: 0, y: 0 }]
  ] satisfies Array<[EnemyArchetype, Point]>)
  ("separates four coincident %s enemies over multiple ticks while retaining base movement", (archetype, base) => {
    let enemies: Point[] = [1, 2, 3, 4].map((separationId) => ({ x: 100, y: 100, separationId }));

    for (let tick = 0; tick < 3; tick += 1) {
      const velocities = enemies.map((enemy) =>
        computeSettledEnemyVelocity(archetype, base, enemy, enemies, 32, 40)
      );
      enemies = enemies.map((enemy, index) => ({
        ...enemy,
        x: enemy.x + velocities[index].x * 0.016,
        y: enemy.y + velocities[index].y * 0.016
      }));
    }

    const xPositions = enemies.map((enemy) => enemy.x).sort((a, b) => a - b);
    for (let index = 1; index < xPositions.length; index += 1) {
      expect(xPositions[index] - xPositions[index - 1]).toBeGreaterThan(0);
    }
    const averageX = enemies.reduce((sum, enemy) => sum + enemy.x, 0) / enemies.length;
    const averageY = enemies.reduce((sum, enemy) => sum + enemy.y, 0) / enemies.length;
    expect(averageX).toBeCloseTo(100 + base.x * 0.016 * 3, 10);
    expect(averageY).toBeCloseTo(100 + base.y * 0.016 * 3, 10);
  });
});
