import { describe, expect, it } from "vitest";
import {
  ENEMY_SEPARATION_DISTANCE,
  ENEMY_SEPARATION_SPEED,
  addSeparationVelocity,
  computeSeparationNudge,
  type Point
} from "./enemySeparation";

/**
 * Issue #167 — mirrors `ARCHETYPE_SPEED.melee` in `Enemy.ts`, which cannot be imported here (it
 * pulls in Phaser, and no test in this repo does). Kept in sync by the note on that constant.
 * This is the force separation has to beat: every enemy steers at the mage's single point, so a
 * chase converges continuously and at full strength.
 */
const MELEE_CHASE_SPEED = 90;
/** `Enemy.ensureTexture` generates a 26x26 texture for every archetype. */
const SPRITE_FOOTPRINT_PX = 26;

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

/**
 * Issue #167 regression suite. `computeSettledEnemyVelocity` used to be tested here; it was
 * removed with the fix (see this module's own comment). The tests it had — and every test above —
 * asserted that a separation push *exists* and points the right way. None asserted that it
 * *wins*, and none fed it an opposing chase vector at all. That is precisely how the developer
 * could watch Nearblades and Farlances stack while this file stayed green.
 *
 * These tests close that gap by asserting the force-balance contract directly, and by
 * integrating the real velocity model (base steering + separation) over many ticks the way
 * `Enemy.update` actually does, rather than checking one frame's vector in isolation.
 */
describe("separation force balance (issue #167)", () => {
  it("pushes harder than the fastest chase that opposes it", () => {
    // The root cause: 40px/s of separation against 90px/s of melee chase. Convergence always
    // won, so enemies funnelled onto the mage's single point and therefore onto each other.
    expect(ENEMY_SEPARATION_SPEED).toBeGreaterThan(MELEE_CHASE_SPEED);
  });

  it("triggers before sprites overlap but cannot reach across the ranged/debuffer bands", () => {
    expect(ENEMY_SEPARATION_DISTANCE).toBeGreaterThan(SPRITE_FOOTPRINT_PX);
    // Ranged holds [220,260] and debuffer [130,170] (`Enemy.ts`) — a 50px gap. A separation
    // radius at or above that would start shoving archetypes out of their own hold bands.
    expect(ENEMY_SEPARATION_DISTANCE).toBeLessThan(50);
  });

  /**
   * Integrates the actual thing that was broken, mirroring `Enemy.update`'s melee branch: chase
   * the target at full speed outside `MELEE_RANGE`, strafe perpendicular to the hold line inside
   * it, and layer separation on top of *whichever* of those two the enemy is doing. Both halves
   * matter — the strafe is what keeps a settled enemy moving (so the pair never just parks on
   * opposite sides of the target and trivially satisfies the gap), and the chase is the 90px/s
   * force that the old 40px/s separation could not beat.
   */
  const MELEE_RANGE = 34;
  /** `MELEE_STRAFE_SPEED` in `Enemy.ts`. */
  const MELEE_STRAFE_SPEED = 18;

  function simulateConvergingChase(count: number, chaseSpeed: number): Point[] {
    const target = { x: 0, y: 0 };
    // Spawned clustered around one point, as `WaveLoader.spawnWave` does (one spawn point plus
    // +/-40 / +/-30 jitter) — deterministic offsets so this test never flakes.
    let enemies: Point[] = Array.from({ length: count }, (_, index) => ({
      x: 600 + ((index * 17) % 40) - 20,
      y: 40 - ((index * 23) % 40),
      separationId: index + 1
    }));
    // `Enemy.strafeDirection` is randomized per enemy; alternate it deterministically here.
    const strafeDirections = enemies.map((_, index) => (index % 2 === 0 ? 1 : -1));

    const deltaSeconds = 0.016;
    for (let tick = 0; tick < 1200; tick += 1) {
      const snapshot = enemies.map((enemy) => ({ ...enemy }));
      enemies = enemies.map((enemy, index) => {
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const distance = Math.hypot(dx, dy);
        const dirX = distance === 0 ? 0 : dx / distance;
        const dirY = distance === 0 ? 0 : dy / distance;
        const base =
          distance > MELEE_RANGE
            ? { x: dirX * chaseSpeed, y: dirY * chaseSpeed }
            : {
                // Perpendicular to the hold-range line, as `Enemy.strafeVelocity` computes it.
                x: dirY * MELEE_STRAFE_SPEED * strafeDirections[index],
                y: -dirX * MELEE_STRAFE_SPEED * strafeDirections[index]
              };
        const velocity = addSeparationVelocity(
          base,
          enemy,
          snapshot,
          ENEMY_SEPARATION_DISTANCE,
          ENEMY_SEPARATION_SPEED
        );
        return {
          ...enemy,
          x: enemy.x + velocity.x * deltaSeconds,
          y: enemy.y + velocity.y * deltaSeconds
        };
      });
    }
    return enemies;
  }

  function minimumPairGap(enemies: Point[]): number {
    let min = Infinity;
    for (let i = 0; i < enemies.length; i += 1) {
      for (let j = i + 1; j < enemies.length; j += 1) {
        min = Math.min(min, Math.hypot(enemies[i].x - enemies[j].x, enemies[i].y - enemies[j].y));
      }
    }
    return min;
  }

  it.each([2, 3, 5])(
    "keeps %i enemies converging on one target from ending up stacked",
    (count) => {
      const settled = simulateConvergingChase(count, MELEE_CHASE_SPEED);
      // Sprites are 26x26; anything under that reads as visibly overlapping on screen. The
      // pre-fix tuning settles these at well under 5px apart.
      expect(minimumPairGap(settled)).toBeGreaterThan(SPRITE_FOOTPRINT_PX * 0.75);
    }
  );

  it("still lets a crowded chaser close on its target", () => {
    // Separation must not be so strong that it stalls the approach — enemies that never arrive
    // are as broken as enemies that stack. All 5 should reach the hold band.
    const settled = simulateConvergingChase(5, MELEE_CHASE_SPEED);
    for (const enemy of settled) {
      expect(Math.hypot(enemy.x, enemy.y)).toBeLessThan(120);
    }
  });

  it("separates a mixed-archetype pair, not just same-archetype peers", () => {
    // The second structural cause: `Enemy.update` was only ever handed same-archetype peers, so
    // a Nearblade standing inside a Farlance produced no push at all. `addSeparationVelocity` is
    // archetype-blind by construction — this test pins the contract that callers must pass every
    // nearby enemy, whatever its archetype, which is what `SpellroadScene.updateEnemies` now does.
    const nearblade: Point = { x: 100, y: 100, separationId: 1 };
    const farlance: Point = { x: 106, y: 100, separationId: 2 };

    // A settled Farlance strafing vertically, overlapped by a Nearblade that ran into it.
    const farlanceVelocity = addSeparationVelocity(
      { x: 0, y: 45 },
      farlance,
      [nearblade, farlance],
      ENEMY_SEPARATION_DISTANCE,
      ENEMY_SEPARATION_SPEED
    );
    // Pushed away from the Nearblade (to the right), strafe preserved.
    expect(farlanceVelocity.x).toBeGreaterThan(0);
    expect(farlanceVelocity.y).toBe(45);

    // And a chasing Nearblade is still pushed off the Farlance despite its 90px/s chase.
    const nearbladeVelocity = addSeparationVelocity(
      { x: MELEE_CHASE_SPEED, y: 0 },
      nearblade,
      [nearblade, farlance],
      ENEMY_SEPARATION_DISTANCE,
      ENEMY_SEPARATION_SPEED
    );
    expect(nearbladeVelocity.x).toBeLessThan(0);
  });

  it("ignores the enemy's own entry when the caller passes the whole roster", () => {
    // `SpellroadScene.updateEnemies` snapshots every active enemy once and hands the same array
    // to each of them, so every enemy sees itself. Matching separation ids at zero distance must
    // contribute nothing rather than tripping the coincident-overlap tie-break.
    const self: Point = { x: 50, y: 50, separationId: 7 };
    expect(computeSeparationNudge(self, [self], ENEMY_SEPARATION_DISTANCE)).toEqual({ x: 0, y: 0 });
  });
});
