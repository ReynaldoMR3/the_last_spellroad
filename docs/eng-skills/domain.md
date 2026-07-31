# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

This repo doesn't follow the generic `CONTEXT.md`-at-root convention — it has its own established ICM layout. Read these instead:

## Before exploring, read these

- **`docs/context.md`** — the project-wide index: purpose, folder scope (`docs/game/`, `docs/superpowers/specs/`, `docs/superpowers/plans/`), current direction, and next actions. Start here for anything design- or planning-related.
- **`docs/agents/CONTEXT.md`** — the index of the AI dev-agent roster (Ana, Loomwright, Pato, Frieren, Warden, Lorena, Tilesmith, Heckler). Each agent's own contract lives at `docs/agents/<name>/CONTEXT.md` — load only the specific agent's folder plus `docs/agents/_reference/` for a given task, never the whole roster.
- **`docs/adr/`** — doesn't exist yet. Proceed silently if it's still absent; don't flag its absence or suggest creating it upfront. `/domain-modeling` creates ADRs lazily when a real decision needs recording.

## File structure

```
/
├── AGENTS.md / CLAUDE.md (symlink)   ← agent roster entry point
└── docs/
    ├── context.md                    ← project-wide domain index
    ├── agents/
    │   ├── CONTEXT.md                ← agent roster index
    │   └── <name>/CONTEXT.md         ← per-agent Inputs/Process/Outputs contract
    ├── game/                         ← GDD, lore, AI system notes
    └── superpowers/
        ├── specs/                    ← approved technical/design specs
        └── plans/                    ← implementation plans for agentic execution
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `docs/context.md` or the relevant `docs/agents/<name>/CONTEXT.md`. Don't drift to synonyms the docs explicitly avoid.

If the concept you need isn't documented yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR (once `docs/adr/` exists), surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
