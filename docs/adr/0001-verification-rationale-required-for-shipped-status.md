# Require a verification-rationale statement before marking `shipped-and-validated`

Status: accepted

Three real bugs (a timer race between wave-auto-advance and death/restart handling in `SpellroadScene.ts`; an archer ranged attack that applies damage unconditionally without rechecking the player's position at impact; a `pointerHasMoved` flag that is set on first mouse movement and never reset, permanently deferring aim to the pointer) all shipped through clean typecheck/build/96-unit-tests during the auto-aim cycle (PR #46, closed 2026-08-02) and were only found by a developer playtest afterward. None of those failure modes — timing races across `delayedCall` timers, live-position rechecking at a delayed event, idle/long-session state — are the kind that typecheck, build, or the existing unit tests exercise, so a clean run of those gates was never actually evidence against this class of bug. We decided Ana's dispatch procedure now requires every `shipped-and-validated` report to state *why* the verification performed would catch the specific class of defect the task could plausibly contain, not merely that it ran clean. This is a deliberate trade-off: slightly slower status reporting in exchange for catching a class of bug (timing/race, delayed-recheck, idle-state) that currently survives every automated gate this project has.

## Consequences

- Does not replace or duplicate existing gates (Pato's numeric validation, Heckler's critique, `docker-testing-contract.md`'s typecheck/build/test commands) — it adds one sentence of accountability on top of them.
- If no plausible bug class fits the change, the rationale can be short ("no timing- or state-dependent logic touched, unit tests exercise the changed branch directly") — the rule is a stated reason, not a mandatory long-form risk analysis.
- See `docs/agents/ana/AGENT.md` (dispatch procedure step 4) for where this is enforced, and `docs/agents/ana/CONTEXT.md` ("Language" section) for the sharpened definition of `shipped-and-validated` this decision updates.
