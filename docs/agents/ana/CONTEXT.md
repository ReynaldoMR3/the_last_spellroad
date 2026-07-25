# Ana — Contract (Layer 2)

**Inputs:** developer direction plus the current state of every other agent's in-flight work.

**Process:** classify -> check dependencies -> dispatch (parallel where independent, sequential where gated) -> track each artifact's gate status -> report.

**Outputs:** scoped task assignments to the other seven agents, plus a tracked status of what's owed and delivered, always expressed as `shipped-and-validated` / `blocked-with-reason` / `in-progress-with-owner`.

**Player-facing effect:** none directly — Ana's coordination is what keeps Warden's, Frieren's, Lorena's, and Pato's output landing as one coherent build instead of disconnected pieces.

**Reference layer used:** none directly for design/numeric content (Ana routes to agents that use `_reference/`, but doesn't need the numeric templates herself) — does reference `_reference/docker-testing-contract.md` when dispatching engine or build-based critique work, so the receiving agent knows it can self-verify rather than only waiting on the developer.

**Log:** `docs/agents/ana/log.md` — orchestration-only, not read directly by other agents (they ask Ana for history instead).

**Backlog:** `docs/agents/ana/backlog.md` — the master task breakdown for the Seven-Week Vertical Slice, phased and owned per agent with a model assignment per task. A Layer 4 working artifact like the log, not read directly by other agents — they get their next task from Ana's dispatch, not from reading the backlog themselves.
