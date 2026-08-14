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

Issues live in this repo's GitHub Issues; use the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default canonical triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout, using this repo's established ICM docs (`docs/context.md` and `docs/agents/CONTEXT.md`). See `docs/agents/domain.md`.

### Prototyping

This is a single-scene Phaser game, not a routable web app, so the `/prototype` skill's UI branch is adapted: throwaway variants live in their own `Phaser.Scene`, booted via `?prototype=<key>` (`src/dev/prototypeHarness.ts`) instead of a `?variant=` page. See `docs/eng-skills/prototype-harness.md`.

### PR sync

Many parallel branches/worktrees can touch the same file without knowing about each other. Sync against `origin/main` before opening a PR and again right before merging it — don't rely on a green local test suite alone. See `docs/eng-skills/pr-sync.md`.

### Gated planning

For substantial specs (~100+ lines, a new system, or anything crossing two or more agents' scopes), stage the spec through explicit Product → Architecture → Program Design checkpoints before writing the plan, and track gate approval in one status block instead of a scattered `Status:` line. Skip this for trivial changes. See `docs/eng-skills/gated-planning.md`.

### Debug level skip

On the Vite development server, `?debugLevel=<n>` boots straight into level `<n>`'s first wave instead of playing through every earlier level — for verifying a level-specific change without a full playthrough. Production builds ignore it. See `docs/eng-skills/debug-level-skip.md`.

### Automated dispatch

A recurring job dispatches `ready-for-agent` issues to the agent roster,
verifies, security-gates, and merges (or reports `blocked-with-reason`)
without a human session. See `docs/eng-skills/automated-dispatch.md`.

### Audio prototype pipeline

`npm run audio:prototype -- <compose-script> <output-name>` wraps Composer's compose → fluidsynth render → ffmpeg transcode sequence into one command, dropping a playable `.ogg` under the gitignored `public/assets/audio/_prototypes/` for quick developer listening, instead of a manual shell sequence run by hand each time. See `docs/eng-skills/audio-prototype-pipeline.md`.
