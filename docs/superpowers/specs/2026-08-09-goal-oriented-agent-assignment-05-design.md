# Goal-Oriented Coding Agent (Course Assignment #5) — Design

**Status:** Approved, ready for implementation.
**Branch:** `worktree-assignment-05-goal-oriented-agent`

## Context

Course Assignment #5 ("Goal-Oriented Coding Agent") requires an agent that reads the GDD, scans the existing codebase, detects gaps between the two, prioritizes which missing feature to build first (with a stated reason), and generates real code for at least one of them. No required language/framework/LLM provider. Due 2026-08-13, 11:59 ET. Deliverables: runnable source + a README covering what got built, why it was selected, and whether it ran in the game.

Per the repo-boundary convention (`multi-agent-ai-in-game-development/docs/submissions/context.md`), code-based assignments (#3 onward) get a short pointer file in the course repo; the real deliverable lives in this game repo — same precedent as `agent-crew/` (#3) and `content-pipeline/` (#4).

**Framing decision (developer-confirmed):** this agent is an *enhancement of Ana*, not a new roster member. Gap-detection and prioritization is already Ana's job today, done by hand via `docs/agents/ana/backlog.md`. This assignment automates that reasoning into a repeatable artifact rather than duplicating the responsibility under a new name.

**Why Ollama isn't the reasoning engine:** Assignment #3's local `llama3.2` run already showed measurable schema drift on structured JSON content generation (see `agent-crew/README.md`, "Known limitations"). This assignment's bar is higher — semantic gap-detection against unstructured prose, prioritization with a written rationale, and code generation that must actually compile and pass this repo's test suite. Retrying that risk on a harder task isn't worth it. Instead: the *mechanical* parts (parsing, scanning) are deterministic Python with no LLM involved at all, and the *reasoning* part is a documented agent contract run by a live Claude Code or Codex session — exactly how every other agent in this roster (Loomwright, Frieren, Warden, ...) already operates, and it needs no API key.

**Likely real gap (background, not a hardcoded answer):** cross-referencing the GDD's "Save Data And Persistence" section against the codebase and backlog surfaces a strong candidate: `src/systems/SaveSystem.ts` exists and typechecks, but backlog item 1.6 (full cross-session save wiring) is still marked `blocked-with-reason`, citing a blocker (0.2, checkpoint/retry Hexcoin bounding) that backlog item 0.2 itself shows as `shipped-and-validated` since 2026-08-01 — i.e. the blocker cleared over a week ago but 1.6's status row was never revisited. Independently, 5.4 ("Save/load QA") is `not-started`, and 5.8's own note discloses "`Continue` doesn't yet restore any real state." Three separate backlog rows point at the same real, unbuilt feature. The agent's rubric (below) is generic cross-referencing, not a rule aimed at this specific row — but if it converges here, that's expected, and it also means the agent would catch a stale backlog status as a side effect, which is a legitimate demonstration of value.

## Architecture

Two layers, run in sequence:

1. **Deterministic scanning layer** (Python, no LLM) — parses the GDD and the codebase into structured JSON. Nothing here requires judgment, so nothing here can drift.
2. **Reasoning layer** (a documented agent contract, executed by a live Claude Code / Codex session) — consumes the JSON from layer 1 plus the raw backlog, and performs the actual gap-detection, prioritization, and code generation the assignment is graded on.

```
docs/agents/ana/goal-oriented-agent/
  CONTEXT.md                    # Layer 1: purpose, how to run both layers
  scan_gdd.py                   # GDD -> gdd_features.json (heading-chunked, no LLM)
  scan_codebase.py              # src/ + backlog.md -> codebase_inventory.json (no LLM)
  AGENT_CONTRACT.md             # the reasoning-layer spec: gap rubric, priority rubric, codegen constraints
  output/
    gdd_features.json           # scan_gdd.py output, committed as evidence
    codebase_inventory.json     # scan_codebase.py output, committed as evidence
    run_report.md               # the actual executed run: gaps found, priority + why, what got built
  README.md                     # graded ReadMe deliverable
```

## Components

Both scanners use only the Python standard library (`re`, `pathlib`, `json`) — no `pip install`, no Ollama, no embedding step. That dependency-free-ness is deliberate: it's the part of the agent least likely to need a re-run mid-course, so it should have zero setup friction.

- **`scan_gdd.py`** — adapts `content-pipeline/stage01_retrieval/corpus.py`'s existing `##`/`###`/`####` heading-chunker (already proven on this exact GDD) to emit `gdd_features.json`: one entry per heading with `{id, title, level, path, raw_text}`. No embedding step needed here — layer 2 gets the full structured text, not a top-k retrieval slice, because gap-detection needs to compare *everything* against *everything*, which is the opposite of RAG's job.
- **`scan_codebase.py`** — walks `src/{scenes,systems,entities,data,dev}` into `{path, exported_symbols, has_colocated_test}` entries, and parses `docs/agents/ana/backlog.md`'s per-row `Status` column (regex on the known status vocabulary: `shipped-and-validated`, `in-progress-with-owner`, `blocked-with-reason`, `not-started`) into a `{task_id, phase, status, depends_on}` map. Unrecognized status text is emitted as `status: "unknown"` rather than raising.
- **`AGENT_CONTRACT.md`** — the part actually graded as "the reasoning layer." Given `gdd_features.json` + `codebase_inventory.json` + the raw backlog, it specifies:
  - **Gap rule:** a GDD feature is a gap if no codebase inventory entry plausibly implements it *and* no backlog row already tracks it as `in-progress-with-owner` or `blocked-with-reason` with an unresolved dependency. (A row whose blocking dependency has since resolved — like 1.6/0.2 above — still counts as a live gap; the contract explicitly calls this out so the agent doesn't get fooled by a stale status label.)
  - **Priority rule, in order:** (1) backlog phase order (earlier phase wins), (2) dependency readiness (skip anything whose real blocker, not just its status text, is still open), (3) vertical-slice floor-vs-stretch framing from the GDD's Seven-Week Vertical Slice section, (4) prefer the smallest coherent slice over a large one.
  - **Codegen constraints:** follow existing file conventions (colocated Vitest tests, existing system module shape), must pass `docker-compose run --rm game npm run typecheck` / `npm test` / `npm run build`, and must add a dated entry to the owning agent's `docs/agents/<name>/log.md` per this repo's standing per-feature-log convention.
  - **Output format:** `run_report.md` — gaps found (list), chosen priority + written rationale, what was generated, verification results.
- **`run_report.md`** — not a template; the actual output of one real execution against this repo, committed as evidence (same pattern as `agent-crew/output/run_*`).
- **`README.md`** — the graded deliverable: what the agent built, why it selected that feature, and an honest answer to "did it run in your game," backed by the actual verification/playtest done for this run.

## Data flow

```
docs/game/the-last-spellroad-design.md ──> scan_gdd.py ──> gdd_features.json
src/ + docs/agents/ana/backlog.md ──> scan_codebase.py ──> codebase_inventory.json
{gdd_features.json, codebase_inventory.json, raw backlog.md} ──[live session
   following AGENT_CONTRACT.md]──> ranked gap list ──> priority pick + rationale
   ──> generated code + tests ──> verification ──> run_report.md
```

## Error handling / edge cases

- Both scanners are regex/heading-based, not hardcoded to today's section names, so future GDD/backlog edits don't silently break them (matches `corpus.py`'s existing resilience).
- A backlog row with unrecognized status text becomes `status: "unknown"` — surfaced, not crashed on or silently skipped.
- If the top-ranked gap is too large for one sitting (e.g. "full save/load system" rather than "wire existing SaveSystem into Continue"), the contract requires scoping down to the smallest coherent slice and saying so explicitly in `run_report.md`, rather than either refusing or half-finishing.
- If the top-ranked gap's real dependency (not just its status label) is still genuinely open, skip it and take the next-ranked gap; note the skip and why in the report.

## Testing / validation

- `scan_gdd.py` / `scan_codebase.py`: checked by inspection — confirm `gdd_features.json` covers every top-level GDD heading and `codebase_inventory.json` lists every known `src/` system, before trusting either as input to layer 2.
- Generated code goes through this repo's actual gates: `docker-compose run --rm game npm run typecheck`, `npm test`, `npm run build`. If a dev-server playtest is feasible in the session that executes this, do a real one so the README's "did it run in the game" line is a verified fact, not an assumption — consistent with this repo's own documented Docker-testing contract and its history of playtest-only bugs (e.g. the road-art-black bug from 5.8) that static checks alone didn't catch.

## Repo placement

- `the_last_spellroad/docs/agents/ana/goal-oriented-agent/` — the agent itself (this design).
- Whatever feature gets generated lands in its normal home under `src/` — a real code change, not a copy inside the agent's own folder.
- `multi-agent-ai-in-game-development/docs/submissions/assignment-05-goal-oriented-agent.md` — short pointer file, same convention as Assignments #3/#4.

## Out of scope

- Building a general dependency graph / automated backlog-rewriting tool. The contract reasons over the backlog as read-only ground truth; it does not rewrite `backlog.md` itself (a human/Ana updates the row once the generated feature is reviewed, matching this repo's existing "update the moment an agent reports back" rule).
- Any LLM-based embedding/retrieval step for layer 1 — deliberately out, per the Context section's reasoning about RAG being the wrong tool for whole-corpus gap comparison.
- Covering every GDD feature/gap in one run — the assignment requires generating code for *at least one*; the contract is written to be re-run for subsequent gaps later, not to batch all of them in this pass.
