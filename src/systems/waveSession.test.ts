import { describe, expect, it } from "vitest";
import { WaveSession, canResolvePhaseChoice, shouldAutoAdvance } from "./waveSession";
import type { WavePhase } from "./waveSession";

const ALL_PHASES: WavePhase[] = [
  "idle",
  "running",
  "advancing",
  "awaiting-phase-choice",
  "dead",
  "complete"
];

describe("WaveSession generations", () => {
  it("starts idle at generation 0", () => {
    const session = new WaveSession();
    expect(session.phase).toBe("idle");
    expect(session.generation).toBe(0);
  });

  it("beginWave bumps the generation, returns the new token, and marks the wave running", () => {
    const session = new WaveSession();
    const token = session.beginWave();
    expect(token).toBe(1);
    expect(session.generation).toBe(1);
    expect(session.phase).toBe("running");
    expect(session.isCurrent(token)).toBe(true);
    expect(session.isCurrent(0)).toBe(false);
  });

  it("beginDeath bumps the generation and invalidates every token taken before it", () => {
    // Issue #48's core race: the wave-complete auto-advance schedules its 1200ms
    // `delayedCall` with the running wave's token; a ranged shot already in flight then
    // kills the player at ~450ms. The advance callback must be inert when it finally fires.
    const session = new WaveSession();
    const advanceToken = session.beginWave();
    session.beginAdvance();
    const deathToken = session.beginDeath();

    expect(session.isCurrent(advanceToken)).toBe(false);
    expect(session.isCurrent(deathToken)).toBe(true);
    expect(session.phase).toBe("dead");
  });

  it("beginAdvance does not bump the generation (it defers, it does not invalidate)", () => {
    const session = new WaveSession();
    const token = session.beginWave();
    session.beginAdvance();
    expect(session.generation).toBe(token);
    expect(session.isCurrent(token)).toBe(true);
  });

  it("never reuses a generation, so stale spawn tokens stay stale forever", () => {
    // Per-enemy spawn `delayedCall`s (WaveLoader.spawnWave) queued for the wave in progress
    // at death must never be revived by any later transition.
    const session = new WaveSession();
    const deadWaveToken = session.beginWave();
    session.beginDeath();
    const seen = new Set<number>([deadWaveToken]);
    for (let i = 0; i < 10; i++) {
      const token = i % 2 === 0 ? session.beginWave() : session.beginDeath();
      expect(seen.has(token)).toBe(false);
      seen.add(token);
      expect(session.isCurrent(deadWaveToken)).toBe(false);
    }
  });

  it("leaves an in-flight boss phase-break token current when nothing else has happened", () => {
    // The fix must NOT invalidate the unrelated phase-break timer: a blanket
    // `time.removeAllEvents()` would, a generation check only does so once the world
    // actually moved on (a new wave started, or the player died).
    const session = new WaveSession();
    const phaseToken = session.beginWave();
    session.beginPhaseChoice();
    expect(session.phase).toBe("awaiting-phase-choice");
    expect(session.isCurrent(phaseToken)).toBe(true);
  });

  it("invalidates a pending phase-break resolution once the player dies during the break", () => {
    const session = new WaveSession();
    const phaseToken = session.beginWave();
    session.beginPhaseChoice();
    session.beginDeath();
    expect(session.isCurrent(phaseToken)).toBe(false);
  });

  it("markComplete parks the session without bumping the generation", () => {
    const session = new WaveSession();
    const token = session.beginWave();
    session.markComplete();
    expect(session.phase).toBe("complete");
    expect(session.isCurrent(token)).toBe(true);
  });
});

describe("shouldAutoAdvance", () => {
  it("is true exactly when a running wave has nothing left to spawn and nothing alive", () => {
    expect(shouldAutoAdvance("running", 0, 0)).toBe(true);
  });

  it("is false while enemies are still queued to spawn or still alive", () => {
    expect(shouldAutoAdvance("running", 3, 0)).toBe(false);
    expect(shouldAutoAdvance("running", 0, 2)).toBe(false);
    expect(shouldAutoAdvance("running", 3, 2)).toBe(false);
  });

  it("is false in the dead phase even though the counts look exactly like a cleared wave", () => {
    // Issue #48's second half: `handleDeath` sets `enemiesRemainingToSpawn = 0` and
    // `enemies = []`, which re-satisfies the old numeric-only trigger and defeated the
    // old `-1` sentinel guard, scheduling a bonus wave-advance during the death window.
    expect(shouldAutoAdvance("dead", 0, 0)).toBe(false);
  });

  it("is false in every phase other than running, for cleared-wave counts", () => {
    for (const phase of ALL_PHASES.filter((p) => p !== "running")) {
      expect(shouldAutoAdvance(phase, 0, 0)).toBe(false);
    }
  });

  it("is false once an advance is already pending, so it cannot double-schedule", () => {
    const session = new WaveSession();
    session.beginWave();
    expect(shouldAutoAdvance(session.phase, 0, 0)).toBe(true);
    session.beginAdvance();
    expect(shouldAutoAdvance(session.phase, 0, 0)).toBe(false);
  });

  it("replays issue #48's exact timeline: no stale advance survives the death restart", () => {
    const session = new WaveSession();

    // Wave 2 is running; the player clears it, so an advance is scheduled with wave 2's token.
    const wave2Token = session.beginWave();
    expect(shouldAutoAdvance(session.phase, 0, 0)).toBe(true);
    session.beginAdvance();
    const pendingAdvanceToken = wave2Token;

    // A ranged shot already in flight lands and kills the player before that advance fires.
    const deathToken = session.beginDeath();
    // ...and the death state must not itself re-trigger a fresh advance.
    expect(shouldAutoAdvance(session.phase, 0, 0)).toBe(false);

    // The wave-advance timer finally fires: inert.
    expect(session.isCurrent(pendingAdvanceToken)).toBe(false);

    // The death restart timer fires: still current, so it runs and starts wave 1.
    expect(session.isCurrent(deathToken)).toBe(true);
    const wave1Token = session.beginWave();

    // Wave 2's leftover per-enemy spawn timers fire into wave 1: inert.
    expect(session.isCurrent(wave2Token)).toBe(false);
    // Only wave 1's own spawn timers are honoured.
    expect(session.isCurrent(wave1Token)).toBe(true);
  });
});

describe("canResolvePhaseChoice", () => {
  it("is true while the same phase-break attempt is still awaiting its choice", () => {
    const session = new WaveSession();
    const phaseToken = session.beginWave();
    session.beginPhaseChoice();
    expect(canResolvePhaseChoice(session.phase, session.generation, phaseToken)).toBe(true);
  });

  it("is false once the attempt has already resolved (phase moved to advancing)", () => {
    const session = new WaveSession();
    const phaseToken = session.beginWave();
    session.beginPhaseChoice();
    session.beginAdvance();
    expect(canResolvePhaseChoice(session.phase, session.generation, phaseToken)).toBe(false);
  });

  it("is false for a stale attempt once death has interrupted it, even if the session later reaches awaiting-phase-choice again", () => {
    // Heckler, 2026-08-02 (6): the exact repro. A death interrupts phase-break A
    // (token = phaseTokenA), the retry replays the boss and reaches phase-break B, which
    // arms a fresh closure with a *new* token. The stale closure from A must not be able
    // to resolve just because the session is back in `awaiting-phase-choice` for B.
    const session = new WaveSession();
    const phaseTokenA = session.beginWave();
    session.beginPhaseChoice();
    session.beginDeath();
    session.beginWave(); // retry replays the boss's phase 0
    session.beginPhaseChoice(); // reaches phase-break B

    expect(session.phase).toBe("awaiting-phase-choice");
    // The phase-string-only guard would wrongly allow this — the token guard must not.
    expect(canResolvePhaseChoice(session.phase, session.generation, phaseTokenA)).toBe(false);

    const phaseTokenB = session.generation;
    expect(canResolvePhaseChoice(session.phase, session.generation, phaseTokenB)).toBe(true);
  });

  it("is false while idle/running/dead/complete regardless of token", () => {
    const session = new WaveSession();
    const token = session.beginWave();
    for (const phase of ALL_PHASES.filter((p) => p !== "awaiting-phase-choice")) {
      expect(canResolvePhaseChoice(phase, session.generation, token)).toBe(false);
    }
  });
});
