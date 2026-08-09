# Ana's Goal-Oriented Build Contract

**What this is:** a documented reasoning procedure, run by a live Claude Code or Codex
session acting as Ana. It has no separate program of its own — the "agent" is this
contract plus the deterministic scanners in this folder. Re-run it any time you want the
next gap identified and built.

## Inputs

1. `output/gdd_features.json` (from `scan_gdd.py`) — every GDD section, heading path, and
   full text.
2. `output/codebase_inventory.json` (from `scan_codebase.py`) — every `src/` file's
   exported symbols + test-coverage flag, and every backlog row's parsed
   status/depends-on.
3. The raw text of `docs/agents/ana/backlog.md` — read directly. The scanner's parse is a
   lossy summary, not a replacement.
4. The raw text of `docs/game/the-last-spellroad-design.md` — read directly for any
   section flagged as a candidate gap. The JSON carries the full section text, but read
   the surrounding sections too before concluding.

## Step 1 — Detect gaps

A GDD section (from `gdd_features.json`) is a **gap** if:

- No `src_files` entry's exported symbols or file name plausibly implements it, AND
- No backlog row tracks it as `shipped-and-validated`, AND
- Any backlog row that tracks it as `blocked-with-reason` or `in-progress-with-owner` has
  its **stated blocking dependency still actually unresolved** — check that dependency's
  own row status directly, don't trust a stale label. A row whose blocker has since
  resolved is still a live gap.

List every gap found: GDD section title, the backlog row(s) that reference it (if any),
and one sentence on what's missing.

## Step 2 — Prioritize

Rank the gap list by, in order:

1. Backlog phase order (an earlier-phase gap outranks a later-phase one).
2. Dependency readiness (a gap whose real blocker is still open drops behind one that's
   actually clear, regardless of phase).
3. The GDD's Seven-Week Vertical Slice floor-vs-stretch framing (a floor-scope item
   outranks a stretch-scope one).
4. Prefer the smaller, more coherent slice of a large gap over attempting the whole thing
   at once.

State the #1 pick and write out the reasoning against all four criteria explicitly — a
pick with no stated reasoning fails this contract's whole purpose.

## Step 3 — Scope the slice

Before writing any code, state exactly what subset of the gap this pass will build, and
what's explicitly left out with a one-line reason for each exclusion. A partial slice is
fine; a silent one is not.

## Step 4 — Generate code

- Follow existing file conventions exactly (colocated Vitest tests, existing module
  shapes) — read at least one sibling file in the same directory before writing a new one
  or extending an existing one.
- Every new/changed function gets a test, TDD-ordered.
- Must pass `docker-compose run --rm game npm run typecheck`, `npm test`, and
  `npm run build` before being reported as done.
- Add a dated entry to the owning agent's `docs/agents/<name>/log.md` (check the GDD's
  Agent Role Definitions section for who owns the system you're touching).
- Update the relevant `docs/agents/ana/backlog.md` row(s) status the same session, per
  that file's own maintenance rule ("update the moment an agent reports back").

## Step 5 — Report

Write `output/run_report.md`: the full gap list (Step 1), the ranked list + rationale
(Step 2), the scoping decision (Step 3), what was built + verification results (Step 4),
and an honest answer to "did this run in the actual game."
