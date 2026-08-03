# Ana — Contract (Layer 2)

**Inputs:** developer direction plus the current state of every other agent's in-flight work.

**Process:** classify -> check dependencies -> dispatch (parallel where independent, sequential where gated) -> track each artifact's gate status -> report.

**Outputs:** scoped task assignments to the other seven agents, plus a tracked status of what's owed and delivered, always expressed as `shipped-and-validated` / `blocked-with-reason` / `in-progress-with-owner`.

**Player-facing effect:** none directly — Ana's coordination is what keeps Warden's, Frieren's, Lorena's, and Pato's output landing as one coherent build instead of disconnected pieces.

**Reference layer used:** none directly for design/numeric content (Ana routes to agents that use `_reference/`, but doesn't need the numeric templates herself) — does reference `_reference/docker-testing-contract.md` when dispatching engine or build-based critique work, so the receiving agent knows it can self-verify rather than only waiting on the developer.

**Log:** `docs/agents/ana/log.md` — orchestration-only, not read directly by other agents (they ask Ana for history instead).

**Backlog:** `docs/agents/ana/backlog.md` — the master task breakdown for the Seven-Week Vertical Slice, phased and owned per agent with a model assignment per task. A Layer 4 working artifact like the log, not read directly by other agents — they get their next task from Ana's dispatch, not from reading the backlog themselves.

## Language

**Canonical definition:** `docs/adr/0001-verification-rationale-required-for-shipped-status.md` is the single source of truth for the status vocabulary. The bullets below are a summary for quick reference, not a second definition — if the two ever disagree, the ADR wins.

- **Shipped-and-validated** — cleared its required gate (Pato's numeric validation, Heckler's tone/consistency critique, or a developer playtest) *and* the report states why that gate would actually catch the defect class the task could plausibly contain — not just that the gate ran clean. _Avoid_: "tests pass", "done", "shipped" alone, without the gate and rationale.
- **Blocked-with-reason** — work cannot proceed until a specific, named dependency resolves — a developer decision or another agent's unfinished output. The reason is always stated inline, never implied.
- **In-progress-with-owner** — work is underway, assigned to exactly one agent, and exists as an artifact that hasn't yet cleared its gate.
