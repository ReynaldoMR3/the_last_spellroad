# Agent Goal/Validation Gaps, Ana's Orchestration Model, and Multi-Tool Agent Context — Design

**Status:** Approved, ready for implementation.
**Branch:** `agent-roster-orchestration-design`

## Context

A fresh 2026-07-21 gdd-review-kit board (`/Users/familia/Documents/Github/gdd-review-kit/reviews/2026-07-21/`) validated the GDD's game design against the 2026-07-15 run. Separately, an audit of the "Agent Role Definitions" section (`docs/game/the-last-spellroad-design.md`) found:

1. Four of eight agents (Ana, Loomwright, Lorena, Tilesmith) have a stated goal but no explicit success criterion or named validator — unlike Pato→Warden/Frieren, which is a clean generator/validator pair.
2. No prompt-engineering examples exist anywhere in the repo showing input/output format for talking to Ana or having Ana delegate to another agent.
3. "Sequential vs. hierarchical" coordination is never addressed, despite being the exact topic of the course's Class 4 ("Orchestrating Agentic Crews") and a likely requirement of Assignment #3 ("build a system with 3+ agents").
4. Agent-generated context has nowhere to live that isn't either the monolithic GDD or raw chat history — every future task would re-read everything or nothing.
5. The user works with Claude Code today but may use Codex or other LLM tooling later — agent definitions need one canonical source, not per-tool duplicates that drift.

## Design

### 1. Success-criteria / validator fixes

Added to the GDD's "Prompt Constraints" section (one line each, appended to the existing per-agent bullet):

- **Ana** — validated by the human developer, not another agent. Every task Ana hands off must resolve to exactly one of three states: `shipped-and-validated`, `blocked-with-reason`, or `in-progress-with-owner`. Nothing is allowed to sit unstated.
- **Loomwright** — validated by the human developer running the actual game (existing `run`/`verify` workflow), not an LLM content-validator — code correctness isn't Pato's or Heckler's job. Heckler may still critique playfeel afterward.
- **Lorena** — validated by Heckler, extending Heckler's existing "critiques a spell, wave, level, or the GDD itself" scope to explicitly include narrative/dialogue output. Keeps generator ≠ validator intact.
- **Tilesmith** — license/source compliance is validated by the human developer, not an agent; this is a factual/legal check an LLM shouldn't have final say on.

### 2. Ana's orchestration architecture

**Hierarchical star topology.** Ana is the only agent that talks to the developer and the only agent any other agent reports to — no peer-to-peer agent communication. If Loomwright needs something from Frieren's output, that request routes through Ana. This formalizes the GDD's existing "Ana never edits or paraphrases" rule and keeps a single audit trail.

**Dispatch procedure:**
1. Classify a new developer request by which agent(s) it touches.
2. Check dependencies — content referencing a shape/mechanic that doesn't exist yet must be sequenced; independent work (e.g., a new spell + a new wave + new dialogue) dispatches in parallel.
3. Every generated artifact stays `in-progress` until it clears its required gate(s): Warden/Frieren → Pato (numeric); Lorena → Heckler (tone/consistency); Loomwright → developer playtest.
4. Status is always one of the three states from the Ana fix above.

**Reference example prompts** (added to the GDD, using the real `spell.json` schema fields):

- Developer → Ana: task request in plain language.
- Ana → Frieren: explicit input contract (element/weight class/shape constraints) + required output shape (`spell.json` fields) + next step (hand to Pato).
- Ana → Pato: the artifact + which template to check; expects pass/flagged-diff only.
- Ana → Heckler: the artifact once Pato clears it; expects grounded, ungrounded-vibe-free critique.
- Ana → Developer: status report using the three-state model.

### 3. ICM-based agent context store (new)

```
docs/agents/
  CONTEXT.md              # Layer 1 — index of every agent folder + reference layer
  _reference/              # Layer 3 — stable, shared, rarely-changing
    mana-template.md
    mastery-template.md
    hexcoin-template.md
    engine-contract.md
    lore-premise.md
  ana/
    AGENT.md               # canonical behavioral spec (see #4 below)
    CONTEXT.md             # Layer 2 — Ana's Inputs/Process/Outputs contract
    log.md                 # orchestration-only log
  loomwright/ pato/ frieren/ warden/ lorena/ tilesmith/ heckler/
    AGENT.md
    CONTEXT.md
    log.md                 # append-only, dated, one entry per artifact/decision
```

Ana's `log.md` is **not** read directly by other agents — if Loomwright needs orchestration history, it asks Ana, per the star topology. Every other agent's `log.md` is append-only and dated, so a future task loads only that agent's small `CONTEXT.md` + `log.md` + relevant `_reference/` files instead of the full GDD or entire content corpus.

### 4. Multi-tool canonical agent definitions

The user works in Claude Code today but may use Codex or other LLM coding tools later. One canonical file per agent, referenced (not copied) from every tool-specific location:

- **Canonical source:** `docs/agents/<name>/AGENT.md` — role, lane, trigger, constraints, success criterion/validator, process. Tool-agnostic prose; includes a small YAML frontmatter block (`name`, `description`, `tools`) that Claude Code's subagent loader needs and other tools simply ignore as metadata.
- **Claude Code:** `.claude/agents/<name>.md` is a **symlink** to `../../docs/agents/<name>/AGENT.md` for all eight agents.
- **Codex / other tools:** root `AGENTS.md` (new) is the canonical repo-level entry point — a short repo overview plus a roster table linking to each `docs/agents/<name>/AGENT.md` and to `docs/agents/CONTEXT.md`.
- **Claude Code root:** `CLAUDE.md` is a **symlink** to `AGENTS.md`, so both tools' root-level convention resolves to the same file.
- Edits always happen at the canonical path (`docs/agents/<name>/AGENT.md`, or root `AGENTS.md`); the symlinks mean there is never a second copy to fall out of sync.

### 5. GDD / docs updates

- "Prompt Constraints" section: append the four success-criteria fixes.
- "Technical Strategy": new subsection "Ana's Orchestration Model" with the dispatch procedure and example prompts.
- `docs/context.md` (repo's layer-1 file): add a pointer to `docs/agents/CONTEXT.md`.

## Out of scope

- Building the actual game engine/content pipeline code (`src/systems/`, `src/data/`) — this design only covers the agent-definition and context-storage layer.
- Codex-specific testing — no Codex session is available to verify the AGENTS.md convention end-to-end; this design follows the documented convention on a best-effort basis.
