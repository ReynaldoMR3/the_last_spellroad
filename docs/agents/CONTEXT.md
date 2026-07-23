# Agent Context Store — Index

This is the entry point for the ICM-style context store behind The Last Spellroad's agent roster. Load only what a task needs — never read this whole tree, and never re-read the full GDD, to do a single agent's job.

**Layers:**
- This file (Layer 1) — where to go.
- `<agent>/CONTEXT.md` (Layer 2) — what that agent does, its Inputs/Process/Outputs contract.
- `_reference/` (Layer 3) — stable numeric templates and lore, configured once, read by many agents.
- `<agent>/log.md` and shipped content under `src/data/` (Layer 4) — working artifacts, changes every run.

**Agent folders:**

| Agent | One-line job | Folder |
| --- | --- | --- |
| Ana | Orchestration — the only agent that talks to the developer | `ana/` |
| Loomwright | Movement & casting engine | `loomwright/` |
| Pato | Economy & validation (Mana/Mastery/Hexcoin numbers) | `pato/` |
| Frieren | Spell content authoring (the "One Wow" agent) | `frieren/` |
| Warden | Encounter/wave generation | `warden/` |
| Lorena | Narrative & lore | `lorena/` |
| Tilesmith | Art & level layout | `tilesmith/` |
| Heckler | Adversarial review | `heckler/` |

**Reference layer:** `_reference/mana-template.md`, `mastery-template.md`, `hexcoin-template.md` (all Pato's authority), `engine-contract.md` (Loomwright's authority), `lore-premise.md` (Lorena's authority).

**Note on Ana's log:** `ana/log.md` is orchestration-only and is not read directly by other agents. If another agent needs prior orchestration history, it asks Ana for it rather than reading her log — see `ana/AGENT.md`.

**Master backlog:** `ana/backlog.md` is the full GDD broken into phased, owned, model-assigned tasks against the Seven-Week Vertical Slice — the answer to "what's left" without re-deriving it from the GDD or eight separate logs. Same rule as the log: other agents get their next task from Ana's dispatch, not by reading it directly.

**Canonical definitions:** each agent's `AGENT.md` in its own folder is the single source of truth for that agent's behavior across every tool (Claude Code, Codex, or otherwise) — see the root `AGENTS.md` for how tool-specific entry points reference these files.
