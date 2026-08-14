# Sandboxed live playtest: the frame-pump technique

**Why this file exists:** the same environment limitation and the same workaround for it have
been independently rediscovered and hand-rolled in Loomwright's log at least a dozen times
since 2026-07-23 (see `docs/agents/loomwright/log.md`, e.g. 2026-07-23, 2026-07-23 (2),
2026-08-01 (3), 2026-08-03, 2026-08-05, 2026-08-14) — always disclosed honestly, never written
down as a standing technique. This closes that gap the same way `docker-testing-contract.md`
closed the "how do I typecheck/build" gap: one small, stable reference an agent can load
instead of re-deriving the fix from a probe every single time.

## The limitation

This repo's own automated/sandboxed browser-pane tooling reports `document.visibilityState`
as `"hidden"` and never leaves that state, even though the tab is the one actually being
driven. Two concrete consequences, both confirmed repeatedly:

- **Phaser's `requestAnimationFrame` loop freezes.** Browsers throttle or fully suspend rAF for
  "hidden" pages, so `game.loop.frame` can sit stuck at the same number across many real
  seconds of wall-clock time — nothing in the game visibly advances no matter how much real
  time passes between tool calls.
- **Keyboard input often never reaches the page at all** (confirmed via a raw
  `window.addEventListener('keydown', ...)` probe that never fires), while **pointer events
  (`pointerdown`, `wheel`) generally do fire**, sometimes with flaky/intermittent delivery.

Neither of these is a bug in the game — they're consequences of the pane being a background/
non-focused surface from the browser's own point of view, which is exactly why this never
substitutes for a real developer playtest (see `loomwright/AGENT.md`'s success criterion:
validated by a human actually running the game, not by this workaround).

## The technique

1. **Temporarily unfreeze the render loop**, in `src/main.ts`, inside the `Phaser.Game` config:
   ```ts
   disableVisibilityChange: true,
   ```
   This tells Phaser not to pause its loop on a visibility change — it does not fix
   `document.visibilityState` itself, but it stops Phaser from using that state to gate its
   own loop.

2. **Temporarily expose the game instance** so it can be driven from outside Phaser's own input
   pipeline:
   ```ts
   const __game = new Phaser.Game(config);
   // TEMP debug hook for manual verification in a sandboxed browser pane where
   // document.visibilityState never leaves "hidden" (rAF frozen). Remove before commit.
   (window as unknown as { __game: Phaser.Game }).__game = __game;
   ```

3. **Restart the dev server container** after adding this (see `docker-testing-contract.md`'s
   stale-bind-mount caveat — an already-running container will not pick up this edit on its
   own), then hard-navigate the browser pane to the page (a plain `reload()` can race the
   container restart).

4. **Drive frames on demand** from the browser tool's JS-eval capability:
   ```js
   for (let i = 0; i < 30; i++) window.__game.loop.step(performance.now());
   ```
   Call this after any action that needs the render/update loop to actually advance (a scene
   transition, a tween, a cooldown tick, a preview redraw). Pointer clicks/scrolls can be issued
   through the browser tool's normal click/scroll actions first, then followed by a step batch
   to let Phaser's `update()` process them and redraw.

5. **Bypass keyboard-gated flows** you don't need to test directly. Two examples that come up
   constantly:
   - Skip Title's Continue/New Game keyboard confirm dialog by clearing the save first
     (`localStorage.clear()`) so New Game doesn't need a `[Y]` keypress at all.
   - Use `?debugLevel=<n>` (`docs/eng-skills/debug-level-skip.md`) instead of playing through
     earlier levels via keyboard-driven movement.
   Where the flow genuinely requires a keyboard event and there's no bypass, a raw
   `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y' }))` from the JS-eval tool is
   more reliable than the browser tool's own key-press action in this environment.

6. **Revert everything before finishing.** Both edits in step 1/2 are temporary scaffolding,
   not shipped config — remove them and confirm a clean diff on `main.ts` (`git diff --stat`)
   before considering the change done. Leaving `disableVisibilityChange: true` in would mask
   the exact real-world resource-throttling behavior a shipped game should still respect when a
   player actually backgrounds their tab.

## What this does and doesn't prove

**Proves:** the code path genuinely fires through Phaser's real input/scene/update pipeline —
not just that isolated pure-logic unit tests pass, and not just that the code compiles. This is
strictly stronger evidence than typecheck/build/test alone, and is worth doing before reporting
a UI/interaction change as ready for the developer.

**Does not prove:** interactive feel, timing/pacing judgment, or anything that depends on a
real human's actual reflexes, real keyboard, or a genuinely visible/focused tab (mouse-wheel
trackpad over-cycling ergonomics, whether a dodge window feels fair, whether onboarding text
reads in time). Every entry in `loomwright/log.md` that uses this technique still reports
`in-progress-with-owner`, not `shipped-and-validated`, for exactly this reason — this
technique narrows what the developer-playtest gate still needs to check, it does not clear
that gate.

## Who uses this

Primarily Loomwright (engine/UI changes) and Ana or Heckler when a critique needs to confirm
actual runtime behavior rather than a static source read (`docker-testing-contract.md`'s
existing Heckler guidance). Frieren/Warden/Lorena/Pato/Tilesmith's own outputs are data/prose,
not runnable interactive code, so this technique doesn't apply to their own gates.
