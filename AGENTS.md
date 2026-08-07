# The Last Spellroad — Agent Roster

This file is the canonical, tool-agnostic entry point for the AI dev-agent roster building The Last Spellroad (a Phaser + TypeScript magical roguelite, course final project). It works the same whether you're driving this repo with Claude Code, Codex, or another LLM coding tool.

**One canonical definition per agent, referenced everywhere:** each agent's full behavioral spec lives at `docs/agents/<name>/AGENT.md`. Claude Code's `.claude/agents/<name>.md` files and the root `CLAUDE.md` are symlinks into this same tree -- there is never a second copy to fall out of sync. If you're updating an agent's behavior, edit `docs/agents/<name>/AGENT.md`, never a symlink.

**Roster** (see `docs/agents/CONTEXT.md` for the full index, and `docs/game/the-last-spellroad-design.md`, "Agent Role Definitions", for the full design rationale):

| Agent | One-line job | Canonical definition |
| --- | --- | --- |
| Ana | Orchestration -- the only agent that talks to the developer | `docs/agents/ana/AGENT.md` |
| Loomwright | Movement & casting engine | `docs/agents/loomwright/AGENT.md` |
| Pato | Economy & validation (Mana/Mastery/Hexcoin numbers) | `docs/agents/pato/AGENT.md` |
| Frieren | Spell content authoring (the "One Wow" agent) | `docs/agents/frieren/AGENT.md` |
| Warden | Encounter/wave generation | `docs/agents/warden/AGENT.md` |
| Lorena | Narrative & lore (also briefs Composer's music direction) | `docs/agents/lorena/AGENT.md` |
| Composer | Music composition | `docs/agents/composer/AGENT.md` |
| Tilesmith | Art, level layout & SFX | `docs/agents/tilesmith/AGENT.md` |
| Heckler | Adversarial review | `docs/agents/heckler/AGENT.md` |

**Working model:** hierarchical star topology -- Ana is the sole point of contact with the developer and the sole router between agents; no agent talks to another agent directly. See `docs/agents/ana/AGENT.md` for the full dispatch procedure and example prompts.

**Context store:** every agent has an ICM-style context folder at `docs/agents/<name>/` -- `CONTEXT.md` (its Inputs/Process/Outputs contract) and `log.md` (an append-only, dated record of what it's actually produced). Load only the specific agent's folder plus the shared `docs/agents/_reference/` templates for a given task -- never the whole GDD, and never another agent's log unless you're Ana.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues; use the `gh` CLI. See `docs/eng-skills/issue-tracker.md`.

### Domain docs

Single-context layout, but pointed at this repo's actual ICM docs (`docs/context.md`, `docs/agents/CONTEXT.md`) rather than a root `CONTEXT.md`. See `docs/eng-skills/domain.md`.

### Prototyping

This is a single-scene Phaser game, not a routable web app, so the `/prototype` skill's UI branch is adapted: throwaway variants live in their own `Phaser.Scene`, booted via `?prototype=<key>` (`src/dev/prototypeHarness.ts`) instead of a `?variant=` page. See `docs/eng-skills/prototype-harness.md`.
