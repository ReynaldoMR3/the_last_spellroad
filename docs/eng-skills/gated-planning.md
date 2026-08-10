# Gated planning: staging a spec before it becomes a plan

This adapts the "Software Factory Playbook" (Dex Horthy / HumanLayer, 4-gate workflow: Product → Architecture → Program Design → Vertical Slices) to this repo's existing spec + plan pattern. It does not replace `docs/superpowers/specs/` and `docs/superpowers/plans/` with new files — it adds three things those two artifacts were missing: an explicit architecture checkpoint before program design, a written size threshold, and one canonical status block instead of a scattered one.

## Why

The 2026-08-02 [ICM methodology overhead audit](../audits/2026-08-02-icm-methodology-overhead.md) found the doc layer mostly earning its keep, but flagged a real cost: canonical state (status vocabulary, gate approval) living in four places instead of one. Separately, `ana/backlog.md`'s own history records two gaps that a distinct architecture-mapping step would have caught before implementation started, not after:

- **The runtime-ownership gap** (Phase 0.1): no agent owned writing HP/Mana/Mastery/Hexcoin runtime logic until Ana caught the gap mid-Phase-1, because Loomwright's and Pato's contracts were written before anyone mapped who owns what.
- **The Docker-testing-context gap**: `grep -rl docker docs/agents/` returned nothing until Ana noticed no agent's context store mentioned the Docker-only testing workflow at all — every agent was following its own scoping rule correctly, but the architecture fact it needed had never been recorded anywhere in reach.

Both are exactly what the Playbook's Gate 2 (map existing services, ownership, data structures) is for. This repo already does Gate 3 well (`docs/superpowers/plans/` files already have Files/Interfaces/checkbox tasks) and Gate 4 arguably better than the Playbook's generic version (the prototype harness's Prototype-1/Prototype-2 pattern — see `prototype-harness.md` — already is tracer-bullet-then-real-logic with per-slice acceptance criteria). Gates 1 and 2 are the ones currently blended into one undifferentiated "Outcome" + "Constraints" pass.

## When to use this

Only for substantial changes — roughly 100+ lines, a new system, or anything that changes an agent's contract or crosses two or more agents' scopes. Skip it for a trivial tweak, a one-line constant change, or anything the developer explicitly asks to move fast on. Writing a full staged spec for a small fix is the kind of overhead the audit above was checking for — don't manufacture it.

## The three checkpoints

Keep writing one spec file (`docs/superpowers/specs/<date>-<slug>-design.md`) and one plan file (`docs/superpowers/plans/<date>-<slug>.md`), same as today. Inside the spec, separate what's currently blended into "Outcome" and "Constraints" into three explicit sections, in this order, each one a stopping point for the developer to confirm before the next is written:

1. **Product** — the user-facing problem and what "done" looks like, with no implementation detail. What does the player/developer experience change to? What's the acceptance bar? (This is what "Outcome" already mostly is — no new work, just keep it free of architecture talk.)
2. **Architecture** — which agents, systems, files, and data structures this touches, and who owns each one. Explicitly state any new or shifted ownership (the way Phase 0.1 above should have been written down before Loomwright's contract was extended, not after). If the change depends on an existing contract, `_reference/` doc, or ADR, name it here — this is the step that would have caught the Docker-context gap, because "does every agent that needs this actually have it in their context store" is exactly the question this section forces.
3. **Program Design** — file-level changes, interfaces, test cases. This is what `docs/superpowers/plans/` already captures well; this section of the spec is the summary that the plan then expands into checkboxes.

Gate 4 (Vertical Slices) stays exactly as-is — write the plan's tasks as slices with a working demo at each boundary, same as current practice, and reuse the prototype harness for anything that needs a throwaway tracer bullet first.

## One status block, not four

Replace the spec's current freeform `**Status:** ...` line with a block at the top of the spec that tracks gate approval explicitly:

```markdown
**Gates:**
- Product — approved 2026-08-09 (developer, in conversation)
- Architecture — approved 2026-08-09 (developer, in conversation)
- Program Design — pending (written-plan review is the remaining gate)
- Vertical Slices — not started
```

This is the single canonical place gate status lives. `ana/backlog.md` and GitHub issue state continue to track execution status per ticket (`not-started` / `in-progress-with-owner` / `blocked-with-reason` / `shipped-and-validated`, canonically defined in [ADR-0001](../adr/0001-verification-rationale-required-for-shipped-status.md)) — that vocabulary is unchanged and this block doesn't duplicate it. The gates block only answers "has this spec cleared the checkpoints that gate writing a plan/starting implementation," which today has no single answer anywhere.

## Why not a `docs/plans/<feature-slug>/` folder per the Playbook's literal structure

The Playbook's own convention groups all four gates' docs plus a status file into one per-feature folder. This repo already has a working two-file, date-prefixed convention (`specs/` and `plans/`, correlated by matching `<date>-<slug>` in the filename) that the rest of the tooling and cross-references already point at. Moving to per-feature folders would be a mechanical rename with no functional gain — the three checkpoints and the status block above get the Playbook's actual benefit (explicit gates, one status source) without restructuring anything that already works.

## Never write implementation code before Program Design is approved

Same rule as the Playbook, already implicit in this repo's practice of writing a plan before touching `src/`: if Architecture is still open (ownership or a touched system is still ambiguous), do not start the plan — an ambiguous owner is exactly what produced the Phase 0.1 gap, and it's cheaper to state the ownership sentence in the spec than to discover the gap mid-implementation.
