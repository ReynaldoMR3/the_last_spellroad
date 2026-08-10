# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

This repo uses an established single-context ICM layout instead of a root `CONTEXT.md`.

## Before exploring, read these

- **`docs/context.md`** — the project-wide index, current direction, domain language, and next actions.
- **`docs/agents/CONTEXT.md`** — the agent-roster index. Load only the relevant `docs/agents/<name>/CONTEXT.md` and required `_reference/` files for a specific task.
- **`docs/adr/`** — read ADRs relevant to the area being changed.

If one of these resources does not exist, proceed silently. Domain-modeling skills create missing context or ADRs lazily when a real term or decision is resolved.

## File structure

```text
/
├── AGENTS.md
├── CLAUDE.md -> AGENTS.md
└── docs/
    ├── context.md
    ├── adr/
    ├── agents/
    │   ├── CONTEXT.md
    │   └── <name>/CONTEXT.md
    ├── game/
    └── superpowers/
        ├── specs/
        └── plans/
```

## Use the glossary's vocabulary

When output names a domain concept—in an issue title, refactor proposal, hypothesis, or test name—use the term defined in `docs/context.md` or the relevant agent context. Do not drift to synonyms the documentation explicitly avoids.

If a needed concept is undocumented, reconsider whether the term belongs in the project or note the gap for domain modeling.

## Flag ADR conflicts

If output contradicts an existing ADR, surface the conflict explicitly rather than silently overriding it.
