# ICM methodology / process-doc overhead audit

Date: 2026-08-02
Wayfinder ticket: [Audit: token/time cost vs. value of the ICM methodology docs and per-agent contracts](https://github.com/ReynaldoMR3/the_last_spellroad/issues/66)

## Verdict

The documentation layer is **mostly earning its keep**, not noise — but it has two concrete, fixable costs and one structural mismatch, not a general bloat problem.

- The five pure-generation/critique agents (Frieren, Warden, Tilesmith, Loomwright, Heckler) keep near-zero bookkeeping in their logs: entries are almost entirely authored output (spells, wave arithmetic, code, six-persona critique with line-cited findings), not restated contract or process narration.
- Where the same fact repeats across doc layers, it is almost always **deliberate cross-validation by design** (Pato independently re-deriving every number Warden submits) or **genuine iteration** (a number changing and being re-derived), not idle duplication.
- Two real costs exist and are traceable to specific causes, not general overhead: a status-vocabulary definition restated in four canonical places plus every log entry, and one case where prose duplication of a live game constant became an actual drift risk before being caught and fixed.
- One structural mismatch: the per-agent "never read another agent's log" scoping rule, as literally written, does not fit the two review-role agents (Heckler, Pato) whose entire job is cross-checking other agents' work — they routinely and correctly exceed it, and the rule's wording hasn't caught up to that.
- The token-budget table itself needed a major correction two weeks in — every agent with a real measured dispatch came in 2x-33x over its original per-call estimate — which is a planning-accuracy finding about the game's own cost model, not a doc-overhead finding, but it lives inside the audited document.

## Scope and method

The audit read every agent's `log.md`, `CONTEXT.md`, and `AGENT.md` (docs/agents/{ana,frieren,heckler,loomwright,lorena,pato,tilesmith,warden}/), the GDD's Token Budget And Projections section (`docs/game/the-last-spellroad-design.md:461-540`), `docs/agents/ana/backlog.md`, and `docs/adr/0001-verification-rationale-required-for-shipped-status.md`. It checked each agent's stated context-scoping rule against its own log for compliance or override, traced four concrete facts across doc layers to measure duplication, and gathered raw line counts for cost estimation.

Inventory at audit time:

- 8 agent folders, each with `AGENT.md` (19-48 lines) and `CONTEXT.md` (13-27 lines).
- 8 `log.md` files, 53-498 lines each, 1,863 lines total.
- 1 shared agent index (`docs/agents/CONTEXT.md`, 30 lines), 1 backlog (257 lines), 1 ADR (11 lines), 1 GDD (551 lines).

## Findings matrix

| Doc layer | Bookkeeping load | What it's actually for | Verdict |
| --- | --- | --- | --- |
| Frieren's log (53 lines, 3 entries) | Near zero | Pure output — one line of authored tradeoff reasoning per spell | Earning its keep |
| Warden's log (152 lines) | Low | Full worked damage-threat-budget arithmetic per wave/level | Earning its keep, though the same disclaimer text ("no template field defines a base enemy-HP number...") repeats near-verbatim across three level entries |
| Heckler's log (207 lines) | Near zero | Six-persona critique with exact file:line citations | Earning its keep |
| Pato's log (280 lines, 17 entries) | Low, deliberately duplicative | Independent re-derivation of every Warden/Frieren number | Duplication is the design, not a bug |
| Tilesmith's log (177 lines, 5 entries) | Low | Asset sourcing/licensing decisions | Earning its keep |
| Lorena's log (156 lines, 6 entries) | Medium | Authored prose plus recurring Heckler-gate-status/scope disclaimers | Mostly earning its keep; one duplication became a real bug (see below) |
| Loomwright's log (341 lines, ~20 entries) | Low | Engine implementation decisions, cites ADR-0001 by name repeatedly | Earning its keep |
| Ana's log (498 lines, ~28 entries) | Highest of any agent | Orchestration narrative — inherently meta by role | Structural cost of the orchestrator role, not excess |
| `docs/agents/ana/backlog.md` (257 lines) | Low | Task IDs, dependencies, exact bug root-causes with citations; explicitly *not* a log duplicate per its own "Maintenance rules" section | Earning its keep, two-tier split works as designed |
| `docs/adr/0001-...md` (11 lines) | None | Exists because 3 real bugs shipped clean through typecheck/build/tests; changes Ana's dispatch procedure and is cited by name in later logs | Earning its keep — short and load-bearing |
| Per-agent `CONTEXT.md` scoping rules | Structural mismatch for 2 of 8 agents | "Load only X, never other agents' logs" | Fits pure-generation agents; doesn't fit Heckler/Pato's cross-checking role |
| Status vocabulary (`shipped-and-validated`/`blocked-with-reason`/`in-progress-with-owner`) | Most pervasive repetition found | Consistent status language across every dispatch | Defined canonically in 4 places (Ana's AGENT.md, CONTEXT.md, backlog.md, ADR-0001) plus mechanically closes ~every log entry from every agent |

## Where the overhead earns its keep

### Pure-generation and critique agents carry almost no bookkeeping

Frieren's entire log is authored spell reasoning; the one process note it contains documents a real gap Pato's gate caught, not filler (`docs/agents/frieren/log.md:39`). Heckler's log is dense with exact citations (`docs/agents/heckler/log.md:86` cites `SpellroadScene.ts:494-497` down to character counts) and carries almost no restated contract language. Warden's and Tilesmith's logs read the same way. For these agents, the "load only your own CONTEXT.md/log.md, never the full GDD" scoping rule (`docs/agents/frieren/AGENT.md:21`, `docs/agents/warden/AGENT.md:19`, `docs/agents/tilesmith/AGENT.md:19`, `docs/agents/loomwright/AGENT.md:19`) shows no evidence of being overridden in practice — it is working exactly as designed, keeping each dispatch's context small.

### The heaviest-looking duplication is deliberate cross-validation, not noise

The enemy per-hit damage table (Melee 7 / Ranged 4 / Debuffer 0-direct, defined once in `hp-template.md`) is the single most-repeated verbatim fact in the corpus — it opens nearly every Warden log entry and is independently re-derived and phrased near-identically in nearly every Pato gate-check entry. This is duplication by design: Pato's whole function is to never trust Warden's restatement and re-derive the arithmetic independently. The Mastery growth-rate number went through three re-derivations across pato/warden/heckler/ana/loomwright's logs — each restatement here is a real design correction (a wrong number caught and superseded), not idle repetition; `pato/log.md`'s own convention is to mark a superseded figure "SUPERSEDED... not deleted" rather than silently overwrite it.

### The backlog/log two-tier split holds

`ana/backlog.md`'s own "Maintenance rules" section (lines 252-258) states the split explicitly: the log stays the narrative history of *why*, the backlog is the current-state tracker of *what's left*. The backlog's content (exact task IDs, dependencies, issue/PR links, bug root-causes with file:line citations) is load-bearing tracking, not ceremony restating the log.

## Where the overhead has a real cost

### 1. The status-vocabulary definition is canonically defined four times

`shipped-and-validated` / `blocked-with-reason` / `in-progress-with-owner` is defined in `ana/AGENT.md:7,15`, again in more precise form in `ana/CONTEXT.md`'s "Language" section, again as a "Status legend" in `ana/backlog.md:7-12`, and sharpened a fourth time by `docs/adr/0001-verification-rationale-required-for-shipped-status.md` (which exists specifically to tighten `shipped-and-validated`'s definition). The literal phrase then closes out essentially every one of Ana's ~28 log entries and is echoed in every other agent's entries. This is real, measurable repetition (53 occurrences of `shipped-and-validated` alone across contract/backlog/ADR files), but each definition is short and the ADR's existence is itself justified by a real bug class the plain three-state model didn't catch — so this reads as **one vocabulary defined in one place that should be canonical (the ADR, the most recent and precise version) with the other three restating rather than linking it**, not as unnecessary process.

### 2. One instance of doc/content duplication became a real shipped-risk bug

Lorena's lore log hardcoded a Hexcoin fee/HP-restore pair as literal prose numbers ("thirty Hexcoin," "ten drops") in a dialogue line (`docs/agents/lorena/log.md:21-22`). Heckler's critique caught that this exact fee/restore pair had already been re-tuned twice, so hardcoded prose would silently drift from the live game constant on the next re-tune (`docs/agents/lorena/log.md:56`). The fix was a template literal interpolating the real constants instead of restating them as English words (`docs/agents/lorena/log.md:60-68`). This is the clearest concrete case in the corpus of restating a fact across doc/content layers producing an actual defect rather than just token cost — and it was caught by the review layer (Heckler) working as intended, not by luck.

### 3. The two review-role agents structurally exceed their own scoping rule — because the rule doesn't fit their job

Heckler's stated scope is "Read CONTEXT.md, log.md, docker-testing-contract.md, plus whatever artifact it's been asked to critique. Do not read the full GDD unless critiquing the GDD itself" (`docs/agents/heckler/AGENT.md:21`). In practice, Heckler routinely reads other agents' logs directly (`docs/agents/heckler/log.md:118` reads Lorena's and Warden's logs plus six source files in the same pass) and cites the GDD by line number while critiquing *narrative content*, not the GDD itself (`docs/agents/heckler/log.md:118,122,140` cite `the-last-spellroad-design.md:33-49` and `:533`) — a direct violation of the stated "unless critiquing the GDD itself" carve-out. Pato similarly engages directly with Heckler's critique content by citing its findings (`docs/agents/pato/log.md` 2026-07-25(4)), which is outside Pato's stated context list (`docs/agents/pato/AGENT.md:19`). Ana also routinely exceeds her stated scope (reading other agents' logs and the GDD directly), but her own AGENT.md's "unless a specific task requires it" clause is broad enough to license it — Heckler's and Pato's rules have no equivalent escape clause, so their overrides read as the rule being wrong for the role, not the agent breaking discipline.

### 4. Strict narrow-scoping once produced a real capability gap, since fixed by the layering system itself

Ana's log documents that the Docker-first testing workflow was never carried into any agent's context store: `grep -rl docker docs/agents/` returned nothing before Ana caught it, "despite every one of them explicitly instructing 'do not read the full GDD unless a task specifically requires it.' An agent following its own context-loading instructions to the letter had no way to discover Docker existed." Ana's fix was to add `docker-testing-contract.md` as a new Layer-3 reference file rather than relaxing the scoping rule — which is evidence the three-layer structure (index → per-agent contract → shared `_reference/` docs) is the right mechanism for closing this kind of gap, but that it needs an occasional audit pass (something did fall through) rather than being assumed complete by construction.

## Separate finding: the token-budget table's own estimates were wrong by a wide margin

Not a documentation-overhead finding, but it lives inside the audited document and is worth surfacing for the next decision: the GDD's original per-call cadence table underestimated every agent with a real measured dispatch by 2x (Loomwright) up to 16-33x (Heckler, whose single "critique pass" estimate was sized like a short completion rather than a multi-step, tool-using, self-verifying agentic session). The 2026-08-01 re-tune corrected this using six real measured dispatches and explicitly left Ana/Warden/Frieren/Pato's columns unmeasured rather than re-guessing them. This suggests the estimation *unit* (per-call/per-asset) rather than the tracking mechanism itself was the flaw — worth carrying into any future budget re-tune, not into the methodology-trim decision.

## Decision inputs

The follow-up decision (issue #67) is not "cut the docs" — the evidence does not support that. The useful decision is which specific seams to tighten:

- **Collapse the status-vocabulary definition to one canonical source.** Keep `docs/adr/0001-verification-rationale-required-for-shipped-status.md` as the definition of record (it's the most precise and most recently justified version); have `ana/AGENT.md`, `ana/CONTEXT.md`, and `ana/backlog.md` link to it instead of restating it. Removes the largest single piece of verbatim duplication in the corpus without touching any agent's actual working process.
- **Reword Heckler's and Pato's CONTEXT.md/AGENT.md scoping rules to match their real cross-checking function**, the way Ana's already has an "unless a specific task requires it" escape clause. The rule as written for a pure-generation agent (Frieren, Warden, Tilesmith, Loomwright) is working; applied to a review-role agent it's describing a constraint the role never actually honors.
- **No evidence supports trimming the backlog, the ADR, or any pure-generation agent's log** — each is either load-bearing and non-duplicative, or (Pato/Warden's repeated arithmetic) deliberately duplicative by design.
- **Add a periodic "does every _reference/ doc actually exist that every agent's rules assume" check** to Ana's own process, since the Docker gap shows the layering can silently miss a doc without anyone noticing until an agent needs it.
- Ana's own log carrying the highest bookkeeping-to-output ratio of any agent is not a trim target — it's the structural cost of being the one agent whose output *is* narrative reasoning about the other seven. Any simplification here should be judged against orchestration quality, not doc volume.
