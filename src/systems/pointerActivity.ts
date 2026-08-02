/**
 * Pure, Phaser-free logic backing issue #49's fix (auto-aim never re-engages after
 * mouse/trackpad use, even once idle). Same seam convention as
 * `rangedImpact.ts`/`autoAim.ts`/`waveSession.ts`/`waveThreatBudget.ts`/`enemyStatusOverlay.ts`:
 * the actual "is this recent enough to still count as mouse-aiming intent" decision is
 * testable in isolation here; capturing `this.time.now` at each real `pointermove`/`pointerdown`
 * and reading it every frame stays `SpellroadScene`'s job.
 *
 * Root cause (see `docs/agents/loomwright/log.md` / issue #49): `SpellroadScene.ts` tracked
 * `pointerHasMoved` as a one-way boolean -- set `true` on a `pointermove` past the existing
 * jitter threshold or on `pointerdown`, never reset back to `false` anywhere in the file. It
 * was meant to represent "recent mouse activity" but actually meant "mouse moved at least once
 * this session" -- both `currentAimPoint()` and the auto-aim soft-lock decision in
 * `handleHotbarPress` read it and permanently deferred to `this.input.activePointer` once
 * tripped, regardless of idle time. Fix shape: a last-pointer-moved timestamp instead of a
 * boolean, gated on "moved within the last `POINTER_ACTIVE_WINDOW_MS`" instead of "ever moved".
 */

/**
 * How recently the pointer must have moved (or been clicked) to still count as active mouse
 * aiming, in milliseconds. Chosen on the same order of magnitude as this game's own combat
 * pacing, not an arbitrary guess:
 *
 * - Player spell cooldowns (`ManaSystem.WEIGHT_CLASS`): light 2000ms, standard 4000ms, heavy
 *   8000ms -- the fastest complete "aim, cast, wait to recast" cycle in the game is 2000ms.
 * - Enemy attack cooldowns (`Enemy.ts`'s `ATTACK_COOLDOWN_MS`): melee 1200ms, ranged 1800ms,
 *   debuffer 2500ms -- confirming the whole combat loop's deliberate-action cadence sits in the
 *   same 1.2s-8s band.
 *
 * 2000ms sits at the fast end of that band: long enough that a mouse-aiming player's hand
 * resting still for one light-spell cooldown cycle doesn't get yanked back to the no-mouse
 * fallback mid-decision, but short enough that once the player is genuinely done with the
 * mouse, auto-aim re-engages within about one action beat -- not several -- matching the
 * "even once idle" complaint in issue #49 rather than trading a permanent boolean for a
 * differently-permanent-feeling wait.
 */
export const POINTER_ACTIVE_WINDOW_MS = 2000;

/**
 * True if the pointer's last recorded movement/click (`lastMovedAt`, a `this.time.now`-style
 * timestamp) is within `windowMs` of `now`. `lastMovedAt === null` means the pointer has never
 * moved this session at all -- always false, regardless of `now`/`windowMs`, and distinct from
 * "moved a very long time ago" (which is also false, just via the age check instead).
 * Boundary is inclusive (age exactly equal to `windowMs` still counts), matching this repo's
 * existing inclusive-range convention (`rangedImpact.ts`'s hit-radius check, `Enemy.ts`'s
 * melee/kiting range checks).
 */
export function hasRecentPointerActivity(
  lastMovedAt: number | null,
  now: number,
  windowMs: number = POINTER_ACTIVE_WINDOW_MS
): boolean {
  if (lastMovedAt === null) {
    return false;
  }
  return now - lastMovedAt <= windowMs;
}
