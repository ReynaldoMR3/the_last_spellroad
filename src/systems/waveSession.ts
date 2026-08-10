/**
 * Pure, Phaser-free wave/run state machine backing issue #48's fix (a death-restart
 * inheriting the in-flight wave's monster count). Same seam convention as
 * `rangedImpact.ts`/`autoAim.ts`/`waveThreatBudget.ts`/`enemyStatusOverlay.ts`: the decision
 * logic — "is this callback still talking about the world that scheduled it?" and "may the
 * scene auto-advance right now?" — is testable in isolation here; the actual
 * `Phaser.Time.delayedCall` scheduling stays in `SpellroadScene`.
 *
 * Root cause (see `docs/agents/loomwright/log.md` / issue #48), two independent defects that
 * compounded:
 *
 * 1. **Nothing invalidated a scheduled callback when the world moved on.** `updateEnemies`'s
 *    1200ms wave-advance timer, `handleDeath`'s 1500ms restart timer, `startPhaseBreak`'s
 *    resolution timer, and every per-enemy spawn timer `WaveLoader.spawnWave` queues were all
 *    fire-and-forget. A wave-complete advance scheduled just before a delayed ranged hit
 *    killed the player would still fire, starting the *next* wave ~300ms before the death
 *    restart replayed the level from wave 1 — and that next wave's spawn timers (plus the
 *    dead wave's own not-yet-fired ones) then spawned into the "restarted" wave 1.
 * 2. **The auto-advance trigger was purely numeric.** `enemiesRemainingToSpawn === 0 &&
 *    enemies.length === 0` is exactly the state `handleDeath` itself creates, so the death
 *    path re-satisfied the trigger and defeated the `-1` sentinel it was guarded by,
 *    scheduling a *bonus* advance during the death window on every single death.
 *
 * Fix shape: a monotonic generation counter (every wave start and every death takes a new
 * one) plus an explicit phase, so "may I auto-advance" is a state question rather than an
 * inference from two counters that death happens to reproduce.
 */

/**
 * What the run is doing right now. Only `running` permits the wave-complete auto-advance —
 * every other phase means some transition is already pending or the run is parked.
 *
 * - `idle` — constructed, no wave started yet (before `SpellroadScene.startWave(0)`).
 * - `running` — a wave is in progress; clearing it advances.
 * - `advancing` — a wave-advance `delayedCall` is pending (replaces the old
 *   `enemiesRemainingToSpawn = -1` sentinel).
 * - `awaiting-phase-choice` — a boss phase-break Y/N prompt is up.
 * - `awaiting-encounter-choice` — issue #157: a Side-Pocket Lore Encounter's in-world
 *   Explore/Continue prompt is up, after the final regular wave of a level 1-4 cleared.
 *   Unlike a phase-break, Explore does not resolve the phase — only Continue does (Explore
 *   reveals lore/awards Hexcoin and returns to this same prompt, per the ticket's "Explore
 *   returns to the Continue choice" decision).
 * - `dead` — the player died; the restart `delayedCall` is pending.
 * - `complete` — the last wave in the sequence cleared; nothing further to advance to.
 */
export type WavePhase =
  | "idle"
  | "running"
  | "advancing"
  | "awaiting-phase-choice"
  | "awaiting-encounter-choice"
  | "dead"
  | "complete";

/**
 * The wave-complete auto-advance gate. Deliberately takes the phase as a parameter rather
 * than reading it off a session, so both halves of the condition (state and counts) are
 * visible and testable together — the numeric half alone is what issue #48 proved is not
 * sufficient, since `handleDeath` reproduces it exactly.
 */
export function shouldAutoAdvance(
  phase: WavePhase,
  enemiesRemainingToSpawn: number,
  activeEnemyCount: number
): boolean {
  return phase === "running" && enemiesRemainingToSpawn === 0 && activeEnemyCount === 0;
}

/**
 * Monotonic generation counter + phase for one playthrough.
 *
 * Every deferred callback the scene schedules captures the generation current at schedule
 * time and checks `isCurrent(token)` before acting. A generation is taken (bumped) at exactly
 * the two points that make everything scheduled earlier meaningless:
 *
 * - `beginWave()` — a new wave's enemies/timers replace the previous wave's.
 * - `beginDeath()` — the run is being rewound to the current level's first wave.
 *
 * Transitions that only *defer* (`beginAdvance`, `beginPhaseChoice`, `markComplete`)
 * deliberately do NOT bump: the timer they are about to schedule belongs to the same world,
 * and bumping would invalidate legitimately-pending work such as a boss phase-break
 * resolution. That selectivity is the whole reason this is a counter rather than a blanket
 * `scene.time.removeAllEvents()`.
 *
 * Generations are never reused, so a stale token can never be revived by a later transition.
 */
export class WaveSession {
  private currentGeneration = 0;
  private currentPhase: WavePhase = "idle";

  get generation(): number {
    return this.currentGeneration;
  }

  get phase(): WavePhase {
    return this.currentPhase;
  }

  /** Starts a wave: takes a fresh generation and returns it as the token to tag that wave's
   * spawn timers (and anything else scoped to this wave) with. */
  beginWave(): number {
    this.currentGeneration += 1;
    this.currentPhase = "running";
    return this.currentGeneration;
  }

  /** The player died: takes a fresh generation (invalidating every callback the dead wave
   * scheduled, including a wave-advance that may already be pending) and returns the token
   * for the restart timer itself. */
  beginDeath(): number {
    this.currentGeneration += 1;
    this.currentPhase = "dead";
    return this.currentGeneration;
  }

  /** A wave-advance `delayedCall` is now pending — blocks re-triggering it, without
   * invalidating anything (the advance timer itself belongs to this same generation). */
  beginAdvance(): void {
    this.currentPhase = "advancing";
  }

  /** A boss phase-break prompt is up; its resolution timer stays valid for this generation. */
  beginPhaseChoice(): void {
    this.currentPhase = "awaiting-phase-choice";
  }

  /** Issue #157 — a Side-Pocket Lore Encounter's Explore/Continue prompt is up for the level
   * just cleared. Deliberately does not bump the generation, same reasoning as
   * `beginPhaseChoice`: the prompt belongs to the wave/level that just cleared, and an
   * Explore action must be able to resolve against this same generation without the
   * resulting reveal/award being treated as stale. */
  beginEncounterChoice(): void {
    this.currentPhase = "awaiting-encounter-choice";
  }

  /** The wave sequence ran out — park the session so nothing tries to advance past the end. */
  markComplete(): void {
    this.currentPhase = "complete";
  }

  /** True only if `token` came from the generation still in force. */
  isCurrent(token: number): boolean {
    return token === this.currentGeneration;
  }
}

/**
 * Guards a boss phase-break's `resolve()` callback (`SpellroadScene.startPhaseBreak`).
 *
 * Heckler critique, 2026-08-02 (6): the original #52 fix guarded `resolve()` on phase
 * alone (`phase === "awaiting-phase-choice"`), never on the generation token the closure
 * captured when it was armed. `beginPhaseChoice()` deliberately does not bump the
 * generation (its resolution timer must survive), but `beginDeath()` does — so a death
 * that interrupts an unresolved phase-break, followed by a retry reaching another
 * phase-break, leaves the *interrupted* attempt's `keydown-Y`/`keydown-N` listeners still
 * registered (if nothing deregisters them) while a fresh pair also gets armed. A single
 * keypress then invokes both closures: the stale one's phase-only guard passes (the
 * session genuinely is `awaiting-phase-choice` again, just for a *different* attempt),
 * so it silently runs `beginAdvance()` plus its Hexcoin/HP side effects against live
 * state — and then the fresh, legitimate closure's identical guard reads
 * `phase !== "awaiting-phase-choice"` as true (already flipped by the stale one) and
 * bails, so the real advance is never scheduled. Permanent freeze, same failure #52 was
 * meant to close, reached via a different path.
 *
 * "Resolve is only valid once, for the current phase-break attempt": phase must still be
 * `awaiting-phase-choice` AND the token this attempt was armed with must still be the
 * session's live generation. A death (or any later wave start) always bumps the
 * generation, so any attempt still holding an older token is provably stale and must be
 * a no-op before it does anything — including its side effects.
 */
export function canResolvePhaseChoice(
  phase: WavePhase,
  currentGeneration: number,
  token: number
): boolean {
  return phase === "awaiting-phase-choice" && token === currentGeneration;
}

/**
 * Guards a Side-Pocket Lore Encounter's Explore/Continue resolution (issue #157), the exact
 * same shape as `canResolvePhaseChoice` and for the same reason: phase alone would let a
 * stale attempt interrupted by a death resolve again once a retry reaches another
 * `awaiting-encounter-choice` prompt with a fresh token. Both the Explore action (reveal +
 * award) and the Continue action (advance) must check this before doing anything, including
 * side effects — this is what makes a duplicate/stale Explore call a no-op per the ticket's
 * idempotency requirement, in addition to the controller's own flag check.
 */
export function canResolveEncounterChoice(
  phase: WavePhase,
  currentGeneration: number,
  token: number
): boolean {
  return phase === "awaiting-encounter-choice" && token === currentGeneration;
}
