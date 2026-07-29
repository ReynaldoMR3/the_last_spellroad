# Agent Crew — Context

## Purpose

Course deliverable for "Multi-Agent AI in Game Development" Assignment #3 (Build an Agent Crew): a real, runnable CrewAI program — not a Claude Code persona dispatch — where 3+ LLM agents coordinate through an actual task pipeline and produce game-ready output for **The Last Spellroad**.

The 8 agents here are the same roster already defined at `docs/agents/<name>/AGENT.md` (Ana, Warden, Frieren, Pato, Tilesmith, Lorena, Loomwright, Heckler). This folder is a second, independent implementation of that roster's contracts — as executable Python/CrewAI code instead of Claude Code sub-agent prompts — kept side by side rather than replacing the `docs/agents/` roster, which still governs day-to-day Claude Code dispatch on this project.

## What belongs here / what does not

- **Belongs:** the CrewAI agent/task/crew definitions (`crew/`), the Docker packaging for running it, this contract, the assignment's README and Mermaid diagram, and `output/` — the crew's own run artifacts.
- **Does not belong:** changes to the actual shipped game data (`src/data/`) or engine code (`src/systems/`, `src/scenes/`). This crew produces *proposals* for one new wave+spell bundle, written only to `agent-crew/output/`. Promoting a proposal into `src/data/` (and validating that it doesn't collide with Warden/Frieren/Pato's existing manual work in `docs/agents/*/log.md`) is a separate, deliberate developer decision, not something this crew does automatically.
- **Does not belong:** a second copy of the agent contracts. If an agent's role, constraints, or output schema changes, edit `docs/agents/<name>/AGENT.md` first (per the repo's existing convention), then update `crew/agents.py`'s `backstory`/`goal` text to match — never the reverse.

## Process

`crew/crew.py` runs a single **sequential** CrewAI process of 9 tasks across the 8 agents:

1. Ana scopes the run (kickoff brief).
2. Warden generates one wave.json-shaped encounter.
3. Frieren authors one spell.json-shaped spell tuned to that encounter.
4. Pato validates both against the Mana/Mastery/Hexcoin templates (structured pass/flagged-diff — never freeform).
5. Tilesmith sources/notes art & VFX for the new content (license-tracked).
6. Lorena writes a short flavor/lore beat consistent with the Lore Premise.
7. Loomwright writes an engine-integration note (not full TS code) against `engine-contract.md`.
8. Heckler runs its six-persona adversarial critique on the whole bundle.
9. Ana closes the run with a three-state status report (`shipped-and-validated` / `blocked-with-reason` / `in-progress-with-owner`), built from every prior task's output.

Sequential, not CrewAI's `Process.hierarchical`, on purpose: the real roster's "hierarchical star, Ana routes everything" shape is preserved by Ana's tasks *bracketing* the run (kickoff brief in, closing synthesis out) and no two worker agents ever seeing each other's raw output directly except through the ordered task chain Ana scoped — while avoiding hierarchical mode's extra manager-planning LLM call, which is one more point of failure this assignment's tight same-day deadline didn't have runway to test against.

## Current status

Built and successfully run end-to-end 2026-07-28, against a local Ollama server (`llama3.2`, no paid API key) — see `output/run_20260728_225706/` for the captured 9-file output plus `bundle.json`. Real coordination confirmed: Ana's closing status report correctly reasoned from Heckler's specific critique rather than defaulting. README's "Known limitations" section documents where the small local model's output drifts from exact schema -- a model-quality tradeoff, not an architecture problem.

## Operational note

`docker-compose.yml`'s `agent-crew` service references `./agent-crew/.env` via `env_file`. Compose parses that path for *any* `docker-compose` command in this repo, including ones that only touch the `game` service (e.g. `docker-compose up game`) — so a missing `.env` here breaks the whole repo's Docker-first workflow, not just this folder. `.env` is gitignored (never commit secrets), so **run `cp agent-crew/.env.example agent-crew/.env` once after a fresh clone**, even if you leave it empty — an empty file satisfies Compose; a missing one does not.

## Open questions

- Whether any output this crew produces should ever be promoted into `src/data/` as real shipped content, and if so, through what gate (presumably still Pato + Heckler + developer playtest, same as the existing Claude-Code-driven pipeline) — not decided, out of scope for the assignment itself.
- Per-agent model selection (`ANA_MODEL`, `PATO_MODEL` etc. in `crew/config.py`) all default to the same shared `llama3.2` model as a same-day-deadline simplification, not a considered per-role assignment like the GDD's Model-Selection Governance table (living GDD `docs/game/the-last-spellroad-design.md`, "Token Budget And Projections") -- that table is about paid Claude tiers and doesn't map directly to local Ollama models. Whether Pato genuinely needs a different (cheaper/smaller, or conversely more reliable for schema-following) local model than Warden/Frieren's generative work is open, and the README's "Known limitations" section is the evidence that would motivate answering it.
- The developer's stated future direction -- each Claude Code persona in `docs/agents/` eventually triggering its own Ollama models/CrewAI runs for specific sub-tasks, rather than this being one standalone crew -- is out of scope for the assignment itself and not built here.
