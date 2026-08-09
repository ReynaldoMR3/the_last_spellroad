# Goal-Oriented Coding Agent — Course Assignment #5

## What this is

Two layers. `scan_gdd.py` and `scan_codebase.py` are dependency-free Python (stdlib only,
no `pip install`, no LLM) that turn the GDD and the codebase into structured JSON —
nothing here can drift, because nothing here involves judgment. `AGENT_CONTRACT.md` is
the actual reasoning layer: a documented procedure that a live Claude Code or Codex
session follows (no API key needed — the same way every other agent in this repo's
roster, Loomwright/Frieren/Warden/etc., already operates as a dispatched session against
a written contract, not a separate program).

This enhances **Ana** — gap-detection and prioritization is already her job today, done
by hand via `docs/agents/ana/backlog.md`. This automates that reasoning into a repeatable,
re-runnable artifact instead of adding a new roster agent.

## Why not local Ollama for the reasoning?

Assignment #3's `agent-crew/` already ran the roster's content generation against a local
`llama3.2` and documented measurable schema drift on structured JSON output (see its
README's "Known limitations"). This assignment's reasoning bar is higher — semantic
gap-detection against unstructured prose, a prioritization rationale, and code that has
to actually compile and pass this repo's real test suite. Retrying that risk on a harder
task wasn't worth it; the mechanical parts that don't need judgment run with zero LLM
involvement instead.

## What feature the agent built

Wired `src/systems/SaveSystem.ts` into actual play: `TitleScene`'s `Continue` now restores
Mastery tiers, Hexcoin balance, and the last-reached level checkpoint into a fresh
`SpellroadScene`, and a new `writeCheckpoint()` persists them on every level-start and
Mastery tier-up.

## Why the agent selected that feature

Full reasoning is in [`output/run_report.md`](output/run_report.md); summary:
cross-referencing the GDD's "Save Data And Persistence" section against the codebase
inventory and the backlog found that row **1.6** (full SaveSystem wiring) was labeled
`blocked-with-reason` on backlog **0.2** — but 0.2 had actually been
`shipped-and-validated` since 2026-08-01, over a week before this run. The blocker had
cleared; the label just hadn't been revisited. Two other backlog rows (**5.4**, **5.8**)
independently pointed at the same real gap. Ranked against phase order, dependency
readiness, and floor-vs-stretch scope, it was the clearest, earliest-phase,
already-unblocked real gap found — and catching that stale label is itself a small
demonstration of the automated cross-referencing doing real work, not just restating what
a human already knew.

The full slice the GDD describes (also persisting discovered spells, hierarchy rank, and
lore flags) was deliberately **not** attempted in one pass — none of those three has an
owning system anywhere in the engine yet, so building real persistence for them means
building the underlying feature first, not just wiring it. That's named explicitly as
follow-up work, not silently dropped.

## Were you able to run this in your game?

Yes, with a disclosed caveat. All four playtest checks were confirmed against real
post-condition state (localStorage contents, live scene fields, and screenshots) — no
check was skipped or fabricated. The title screen showed only "New Game" pre-save,
fully organically. After reaching Level 2, `localStorage`'s `checkpointId` correctly
became `"2"`. Reloading the page correctly showed a "Continue" option. And selecting
Continue visibly restored Mastery and Hexcoin(7) to the HUD instead of defaults —
confirmed against internal scene state and a HUD screenshot, via the same real
"Continue" action handler a click would invoke.

The one disclosed gap: driving the Level 1→2 advance and seeding pre-save state (7
Hexcoin, 15x `mastery.recordLandedCast('arc_lance')`) used a disclosed, fully-reverted
debug hook (`scene['startWave'](3)`) rather than organic real-time kills, because this
sandbox's `document.visibilityState: "hidden"` freezes Phaser's render/input loop
(`window.__game.loop.frame` stayed frozen across 3+ real wall-clock seconds) —
a limitation documented repeatedly elsewhere in this repo (`docs/agents/loomwright/log.md`,
multiple dated entries), not a defect in the SaveSystem wiring itself. This is the same
pattern this repo's own history already uses for this exact situation, and the hook was
fully reverted before finishing (confirmed via an empty `git diff` on the touched file).

## Running the agent yourself

```bash
cd docs/agents/ana/goal-oriented-agent
python3 -m unittest discover -s . -p 'test_*.py' -v   # scanner tests
python3 scan_gdd.py > output/gdd_features.json
python3 scan_codebase.py > output/codebase_inventory.json
```

Note: the committed `output/codebase_inventory.json` intentionally predates the SaveSystem-
wiring fix this run made (it captures the pre-fix "gap" state `run_report.md` reasons over,
including `SaveSystem.ts`/`HexcoinSystem.ts`'s `has_colocated_test: false` and backlog 1.6's
old status). Re-running the command above will produce a different, also-valid, but
different snapshot — save it elsewhere for comparison rather than overwriting the committed
evidence file.

Then open a Claude Code or Codex session in this repo, point it at `AGENT_CONTRACT.md`
with the two JSON files above plus `docs/agents/ana/backlog.md`, and let it run Steps
1-5. No API key required.

## Known limitations

- The reasoning layer is a documented procedure for a live session, not a fully
  autonomous unattended program — by design (see "Why not local Ollama" above), but worth
  stating plainly since "agent" can otherwise imply something that runs unattended.
- `discoveredSpellIds`/`hierarchyRank`/`loreFlags` remain pass-through defaults in the
  save blob — no system in the engine populates any of the three yet.
- The scanners' export-symbol detection is a regex over `export <keyword> <Name>`, not a
  real TypeScript AST parse — sufficient for this repo's actual file conventions
  (confirmed by inspection against every `src/systems/*.ts` file), but a file using an
  unusual export style could be missed.
- `scan_codebase.py`'s `parse_backlog_status()` only recognizes markdown-table rows
  (Phase 1 onward) — Phase 0 items (written as prose sections, e.g. `### 0.2 — ...` plus a
  `**Status:**` line) do not appear in `codebase_inventory.json`'s `backlog_tasks` at all.
  The reasoning layer must read `backlog.md`'s raw text for those (which `AGENT_CONTRACT.md`
  already instructs), since the JSON evidence alone can't demonstrate a Phase 0 dependency's
  actual status.
