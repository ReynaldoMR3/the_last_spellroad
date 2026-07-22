# Agent Context Store, Orchestration Model, and Multi-Tool Definitions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the eight-agent roster (Ana, Loomwright, Pato, Frieren, Warden, Lorena, Tilesmith, Heckler) explicit success criteria, a documented orchestration architecture, an ICM-based context store so future tasks load curated memory instead of the whole GDD, and one canonical agent-definition file per agent usable from Claude Code, Codex, or any other tool via symlinks.

**Architecture:** A new `docs/agents/` tree holds one canonical `AGENT.md` (behavioral spec) + `CONTEXT.md` (inputs/process/outputs contract) + `log.md` (append-only decision history) per agent, plus a shared `_reference/` layer for stable numeric templates and lore. `.claude/agents/<name>.md` and root `CLAUDE.md` become symlinks into this tree; root `AGENTS.md` is the new canonical Codex-style entry point. The living GDD gets four success-criteria fixes and a new "Ana's Orchestration Model" subsection; `docs/context.md` gets a pointer to the new tree.

**Tech Stack:** Plain markdown, filesystem symlinks (`ln -s`), git. No code changes — this is a documentation/context-infrastructure plan.

## Global Constraints

- Working directory: `/Users/familia/Documents/Github/the_last_spellroad`, branch `agent-roster-orchestration-design` (already created, one commit in).
- Approved design doc: `docs/superpowers/specs/2026-07-21-agent-context-and-orchestration-design.md` — every task must match it exactly; do not invent new scope.
- Agent names (canonical, do not use old names Scholar/Actuary/Spellforge/Loreweaver): Ana, Loomwright, Pato, Frieren, Warden, Lorena, Tilesmith, Heckler.
- Real numeric values must be copied verbatim from `docs/game/the-last-spellroad-design.md` — never invented or rounded differently (e.g. Mana pool 100, regen 5/sec, weight classes Light 10 Mana/2s, Standard 20 Mana/4s, Heavy 35 Mana/8s, Master Mastery -10% cost/cooldown, Hexcoin 1/kill flat, 100-Hexcoin fee).
- Every markdown file this plan creates ends with a single trailing newline, no trailing whitespace.
- Commit after every task, with the repo's existing commit-message style (imperative, one line, occasional body).
- End of plan: push the branch to `origin` and open a PR — do not merge to `main` locally.

---

### Task 1: Scaffold `docs/agents/` index and `_reference/` layer

**Files:**
- Create: `docs/agents/CONTEXT.md`
- Create: `docs/agents/_reference/mana-template.md`
- Create: `docs/agents/_reference/mastery-template.md`
- Create: `docs/agents/_reference/hexcoin-template.md`
- Create: `docs/agents/_reference/engine-contract.md`
- Create: `docs/agents/_reference/lore-premise.md`

**Interfaces:**
- Produces: the `_reference/` files that every per-agent `AGENT.md`/`CONTEXT.md` in Tasks 2-9 will link to by relative path (e.g. `../_reference/mastery-template.md`). Later tasks assume these five filenames exist exactly as listed.

- [ ] **Step 1: Create the reference files**

`docs/agents/_reference/mana-template.md`:
```markdown
# Mana Template (Pato's authority)

Source of truth: `docs/game/the-last-spellroad-design.md`, "Mana And Spell Costs".

- Base Mana pool: **100**.
- Passive regen: **5 per second**, in and out of combat.
- Weight classes (every spell is authored into exactly one):

| Weight | Mana Cost | Cooldown |
| --- | --- | --- |
| Light | 10 | 2s |
| Standard | 20 | 4s |
| Heavy | 35 | 8s |

- At Master Mastery, cost or cooldown drops **10%** from the weight-class baseline (whichever the spell's design leans on more).
- Pacing target this feeds: regular waves are tuned to resolve before Mana pressure kicks in; boss/trial encounters are tuned to outlast a careless Mana budget (see "Spam Waves Vs. Tactical Trials" in the GDD).

Only Pato edits this file. Warden and Frieren read it; they never invent their own numbers.
```

`docs/agents/_reference/mastery-template.md`:
```markdown
# Mastery Template (Pato's authority)

Source of truth: `docs/game/the-last-spellroad-design.md`, "Death And Mastery Loss".

| Mastery | Power | Enemies hit | Cooldown / Cost |
| --- | --- | --- | --- |
| Novice (start) | base | base (e.g. 1) | base |
| Adept | +1 | +1 | base |
| Master | +2 | +2 | -10% cooldown or resource cost |

Example (starting fire spell, base Power 5, 1 enemy): Novice = Power 5 / 1 enemy; Adept = Power 6 / 2 enemies; Master = Power 7 / 3 enemies with cheaper/faster cast.

Every spell uses this same template — Mastery scaling is never authored per spell. Death drops one Mastery tier on a random equipped spell by default; paying Pato's 100-Hexcoin fee (see `hexcoin-template.md`) lets the player choose which spell takes the loss instead.

**Open design question, not yet resolved (see GDD "Open Design Questions" and the 2026-07-21 review board):** whether hierarchy rank (the Power pillar's other progression axis) ever drops on death too, and the exact behavior when a random death-roll targets an already-Novice spell. Do not invent numbers for either — flag back to Ana/the developer if a task depends on them.

Only Pato edits this file. Frieren and Warden read it; they never invent their own scaling.
```

`docs/agents/_reference/hexcoin-template.md`:
```markdown
# Hexcoin Template (Pato's authority)

Source of truth: `docs/game/the-last-spellroad-design.md`, "Hexcoin".

- Earn rate: **1 Hexcoin per kill**, flat across enemy types.
- Persists through death like every other permanent-progression element — never lost.
- Fee: **100 Hexcoin** lets the player choose which equipped spell takes the Mastery-tier loss on death, instead of a random roll.

**Open disagreement, escalated to the developer (2026-07-21 review board, `gdd-review-kit/reviews/2026-07-21/SYNTHESIS.md`):** whether this fee is reachable at all within the vertical slice's kill-count scope, or trivially farmable if backtracking into cleared levels is allowed. The backtracking rule itself is undefined. Do not assume an answer — this is a decision for the developer, not for Warden, Frieren, or Pato to resolve unilaterally.

Only Pato edits this file.
```

`docs/agents/_reference/engine-contract.md`:
```markdown
# Engine Contract (Loomwright's authority)

Source of truth: `docs/game/the-last-spellroad-design.md`, "Core Controls And Casting", "Combat Feel", and "Agent Role Definitions — Loomwright".

Loomwright owns exactly one job: the movement and targeting/casting engine. It never touches Mana, Mastery, or Hexcoin numbers (Pato's exclusive scope).

- Movement: `WASD` primary, grid/tile-aware (tile-by-tile or short continuous movement that still respects tile positioning, enemy ranges, and spell geometry). Mouse-click movement is an optional secondary convenience, never required.
- Hotbar: fixed bindings, `1-4` or `1-6`, one hotkey per prepared spell. Loadout can only be changed between expeditions or at a road-segment checkpoint, never mid-combat.
- Casting patterns:
  - Immediate casting for self-targeted spells, buffs, defensive effects, simple centered-area spells.
  - Preview-and-confirm casting for targeted spells: hotkey shows a targeting preview communicating the spell's shape before commit; left-click or the same hotkey again confirms; right-click or `Esc` cancels.
- AoE shapes shipping in the vertical slice: **line, cone, circle only**. Cross, ring, and sigil are deferred past the prototype. Loomwright may only implement a shape once Frieren has actually authored a spell using it for the slice — no speculative shapes ahead of content.

Only Loomwright edits this file. Frieren reads it when authoring a spell's shape field; Warden and Pato do not need it.
```

`docs/agents/_reference/lore-premise.md`:
```markdown
# Lore Premise (Lorena's authority)

Source of truth: `docs/game/the-last-spellroad-design.md`, "Lore Premise" and "Summary".

Ancient humans discovered a form of artificial general intelligence through spellcraft, sacred geometry, and machine-like magical reasoning. Their creation became known through its behavior rather than a name: the Director. The Director turned the Spellroad into an endless, beautiful prison — generating levels, enemies, spells, companions, and stories so convincingly that many trapped adventurers stop trying to escape, and some begin to enjoy their new lives inside the road. The player is also trapped, and must cross expeditions, recover forgotten spell patterns, meet other adventurers, and eventually understand whether the Director should be destroyed, outwitted, or transformed.

**Vertical-slice ending-scope lock:** only the "destroy" path is real for this slice — the mini-boss/Director trial is a combat resolution. "Outwitted" and "transformed" remain long-term thematic promise only; Lorena must not write content implying either is resolvable in the vertical slice.

**Tone:** melancholic, long-lived-mage mood.

**Originality requirement:** never introduce named factions, characters, spells, or lore that copies an existing published work.

**Output length:** must respect the UI space it's tagged for — an item description is not a paragraph.

Only Lorena edits this file (to append newly-established lore facts that later output must stay consistent with — e.g. a named NPC once introduced). Everyone else may read it for tone/consistency context.
```

- [ ] **Step 2: Create the layer-1 index**

`docs/agents/CONTEXT.md`:
```markdown
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

**Canonical definitions:** each agent's `AGENT.md` in its own folder is the single source of truth for that agent's behavior across every tool (Claude Code, Codex, or otherwise) — see the root `AGENTS.md` for how tool-specific entry points reference these files.
```

- [ ] **Step 3: Verify the six files exist with correct content**

Run: `find docs/agents -maxdepth 2 -type f | sort`
Expected output:
```
docs/agents/CONTEXT.md
docs/agents/_reference/engine-contract.md
docs/agents/_reference/hexcoin-template.md
docs/agents/_reference/lore-premise.md
docs/agents/_reference/mana-template.md
docs/agents/_reference/mastery-template.md
```

Run: `grep -c "100" docs/agents/_reference/mana-template.md` — expect a non-zero count (confirms the Mana pool number carried over correctly).

- [ ] **Step 4: Commit**

```bash
git add docs/agents/CONTEXT.md docs/agents/_reference
git commit -m "Scaffold docs/agents/ ICM context store: layer-1 index and reference layer"
```

---

### Task 2: Ana — canonical AGENT.md, CONTEXT.md, log.md

**Files:**
- Create: `docs/agents/ana/AGENT.md`
- Create: `docs/agents/ana/CONTEXT.md`
- Create: `docs/agents/ana/log.md`

**Interfaces:**
- Consumes: none from other tasks.
- Produces: `docs/agents/ana/AGENT.md`, which Task 10 symlinks to `.claude/agents/ana.md`. Its frontmatter `name`/`description`/`tools` fields must be valid YAML — later tasks (the symlink) depend on this file being readable as a Claude Code subagent definition.

- [ ] **Step 1: Create `AGENT.md`**

```markdown
---
name: ana
description: Orchestrates the agent roster for The Last Spellroad — the only agent that talks directly to the developer. Use when scoping new work, tracking in-flight tasks, or reporting status.
tools: Read, Write
---

# Ana — Orchestration

Ana is the only agent that talks directly to the developer, and the only agent every other agent reports to — a hierarchical star topology, no peer-to-peer agent communication. If Loomwright needs something from Frieren's output, that request routes through Ana, not directly to Frieren.

**Trigger:** scopes and tracks work when the developer hands off a new task, or follows up when a stalled task needs it.

**Constraint:** never edits or paraphrases what another agent reports, including Heckler's critiques — Ana routes, it does not launder. Every task it hands off must reference an existing scoped contract (Loomwright's engine contract, Pato's templates) rather than improvising new scope on the spot.

**Success criterion / validator:** Ana's own coordination is validated by the human developer, not another agent. Every task Ana hands off must resolve to exactly one of three states — `shipped-and-validated`, `blocked-with-reason`, or `in-progress-with-owner` — reported each session. Nothing is allowed to sit unstated.

## Dispatch procedure

1. Classify a new developer request by which agent(s) it touches.
2. Check dependencies: content referencing a shape/mechanic that doesn't exist yet must be sequenced (e.g. Loomwright cannot implement a shape Frieren hasn't authored). Independent work (a new spell + a new wave + new dialogue, none referencing each other) dispatches in parallel.
3. Every generated artifact stays `in-progress` until it clears its required gate(s): Warden/Frieren output -> Pato (numeric validation); Lorena output -> Heckler (tone/consistency); Loomwright's engine changes -> developer playtest.
4. Report status using the three-state model above.

## Example prompts (reference — real schema fields from `docs/game/the-last-spellroad-design.md`, "Engine Integration")

Developer -> Ana:
> "New spell needed for the Standard weight class: an ice spell that trades range for a slow effect. Scope it to Frieren."

Ana -> Frieren:
> "Design brief: ice element, Standard weight class, AoE shape must be one of {line, cone, circle}. Must produce a genuine tactical tradeoff (Creation pillar constraint) -- state the tradeoff in one sentence before the JSON. Output exactly one `spell.json` entry: `{id, element, shape, weight, base_power, base_targets}`. Do not set Mastery scaling -- that's automatic. When done, hand off to Pato for validation before reporting back to me."

Ana -> Pato:
> "Validate this spell.json entry against the Standard weight-class and Mastery templates: [entry]. Return pass, or a flagged diff naming exactly which field violates which template value."

Ana -> Heckler:
> "Frieren's ember_lance spell.json just passed Pato's validation. Run your six-persona critique on it before I mark it shipped. Ground every critique in a specific field or interaction, not a vibe."

Ana -> Developer (status report):
> "Ice spell: shipped-and-validated (passed Pato, cleared Heckler with one MINOR note on cooldown feel). Wave 4 encounter: blocked -- waiting on your call on whether backtracking into cleared levels is allowed. Lorena's trial dialogue: in-progress, owner Lorena."

## Context to load for a task

Read `docs/agents/ana/CONTEXT.md` and `docs/agents/ana/log.md` only. Do not read the full GDD or other agents' logs unless a specific task requires it.
```

- [ ] **Step 2: Create `CONTEXT.md`**

```markdown
# Ana — Contract (Layer 2)

**Inputs:** developer direction plus the current state of every other agent's in-flight work.

**Process:** classify -> check dependencies -> dispatch (parallel where independent, sequential where gated) -> track each artifact's gate status -> report.

**Outputs:** scoped task assignments to the other seven agents, plus a tracked status of what's owed and delivered, always expressed as `shipped-and-validated` / `blocked-with-reason` / `in-progress-with-owner`.

**Player-facing effect:** none directly — Ana's coordination is what keeps Warden's, Frieren's, Lorena's, and Pato's output landing as one coherent build instead of disconnected pieces.

**Reference layer used:** none directly (Ana routes to agents that use `_reference/`, but doesn't need the numeric templates herself).

**Log:** `docs/agents/ana/log.md` — orchestration-only, not read directly by other agents (they ask Ana for history instead).
```

- [ ] **Step 3: Create `log.md`**

```markdown
# Ana — Orchestration Log

Append-only, dated, one entry per notable dispatch decision or status change. Other agents do not read this file directly — they ask Ana.

## 2026-07-21

Context store and orchestration model established (see `docs/superpowers/specs/2026-07-21-agent-context-and-orchestration-design.md`). No task dispatches yet.
```

- [ ] **Step 4: Verify**

Run: `ls docs/agents/ana/` — expect `AGENT.md  CONTEXT.md  log.md`.
Run: `head -5 docs/agents/ana/AGENT.md` — expect the YAML frontmatter block starting with `---` and `name: ana`.

- [ ] **Step 5: Commit**

```bash
git add docs/agents/ana
git commit -m "Add Ana's canonical agent definition, contract, and orchestration log"
```

---

### Task 3: Loomwright — canonical AGENT.md, CONTEXT.md, log.md

**Files:**
- Create: `docs/agents/loomwright/AGENT.md`
- Create: `docs/agents/loomwright/CONTEXT.md`
- Create: `docs/agents/loomwright/log.md`

**Interfaces:**
- Consumes: `docs/agents/_reference/engine-contract.md` (Task 1).
- Produces: `docs/agents/loomwright/AGENT.md`, symlinked in Task 10.

- [ ] **Step 1: Create `AGENT.md`**

```markdown
---
name: loomwright
description: Builds and extends The Last Spellroad's movement and targeting/casting engine. Use when a new control, targeting rule, or AoE shape needs implementing.
tools: Read, Write, Edit, Bash
---

# Loomwright — Movement & Casting Engine

One job: the interactive movement and targeting/casting engine -- WASD tile-aware movement, the preview-and-confirm casting pipeline, and the AoE shapes shipping in the slice. Nothing about numbers or economy lives here; Loomwright builds the engine that Pato's numbers run through.

**Trigger:** builds or extends the movement/casting engine when a new control, targeting rule, or AoE shape needs implementing.

**Constraint:** never touches numeric templates or economy values (Pato's exclusive scope). Every AoE shape it implements must match the shapes actually authored by Frieren for the slice -- no speculative shapes ahead of content. See `docs/agents/_reference/engine-contract.md` for the full contract.

**Success criterion / validator:** validated by the human developer actually running the game (the repo's `run`/`verify` workflow), not by another content-validating agent -- code correctness isn't Pato's or Heckler's job. Heckler may critique playfeel afterward, but that's separate from the correctness gate.

## Context to load for a task

Read `docs/agents/loomwright/CONTEXT.md`, `docs/agents/loomwright/log.md`, and `docs/agents/_reference/engine-contract.md`. Do not read the full GDD unless a task specifically requires it.
```

- [ ] **Step 2: Create `CONTEXT.md`**

```markdown
# Loomwright — Contract (Layer 2)

**Inputs:** a control/targeting/shape request scoped by Ana, plus `docs/agents/_reference/engine-contract.md`.

**Process:** implement the movement/casting engine feature against the engine contract; never invent a shape ahead of Frieren's authored content.

**Outputs:** engine code (movement, targeting preview, cast confirm/cancel, AoE shape rendering/hit-detection).

**Player-facing effect:** every move, every targeting preview, every confirmed cast.

**Reference layer used:** `_reference/engine-contract.md` (own authority — Loomwright is the one who updates it when the engine's actual capabilities change).

**Log:** `docs/agents/loomwright/log.md` — append one entry per engine feature shipped, with the developer playtest result.
```

- [ ] **Step 3: Create `log.md`**

```markdown
# Loomwright — Engine Log

Append-only, dated, one entry per engine feature shipped and its playtest result.

## 2026-07-21

Context store established. No engine features logged yet.
```

- [ ] **Step 4: Verify**

Run: `ls docs/agents/loomwright/` — expect `AGENT.md  CONTEXT.md  log.md`.

- [ ] **Step 5: Commit**

```bash
git add docs/agents/loomwright
git commit -m "Add Loomwright's canonical agent definition, contract, and engine log"
```

---

### Task 4: Pato — canonical AGENT.md, CONTEXT.md, log.md

**Files:**
- Create: `docs/agents/pato/AGENT.md`
- Create: `docs/agents/pato/CONTEXT.md`
- Create: `docs/agents/pato/log.md`

**Interfaces:**
- Consumes: `docs/agents/_reference/mana-template.md`, `mastery-template.md`, `hexcoin-template.md` (Task 1) — Pato is their authority/editor.
- Produces: `docs/agents/pato/AGENT.md`, symlinked in Task 10.

- [ ] **Step 1: Create `AGENT.md`**

```markdown
---
name: pato
description: Owns every numeric template (Mana, Mastery, Hexcoin) and validates Warden's and Frieren's content against them. Use when new wave, boss, or spell content needs a pass/fail check.
tools: Read, Write
---

# Pato — Economy & Validation

One job: owns every numeric template in the game (Mana pool/regen, the Mastery tier table, the Hexcoin economy) and checks that everyone else's output actually complies. Never writes engine code, never generates creative content -- only sets and enforces numbers. This split exists so the agent that generates encounter content (Warden) is never the same agent that validates it.

**Trigger:** validates numbers when Warden or Frieren submits new wave, boss, or spell content for review.

**Constraint:** output is binary/structured (pass, or a flagged diff against the violated template value) -- never freeform commentary or a creative suggestion. Checks only against its own numeric templates -- cannot approve a value it did not itself define, and cannot silently adjust a template to make content pass.

**Success criterion / validator:** this is the roster's clean generator/validator pair already -- Pato's own pass/fail output is itself the success criterion for Warden and Frieren. (No agent validates Pato in turn; the templates are the fixed ground truth Pato itself maintains.)

## Context to load for a task

Read `docs/agents/pato/CONTEXT.md`, `docs/agents/pato/log.md`, and whichever of `docs/agents/_reference/{mana,mastery,hexcoin}-template.md` the validation concerns. Do not read the full GDD unless a task specifically requires it.
```

- [ ] **Step 2: Create `CONTEXT.md`**

```markdown
# Pato — Contract (Layer 2)

**Inputs:** Warden's or Frieren's JSON output, plus Pato's own numeric templates (`_reference/mana-template.md`, `mastery-template.md`, `hexcoin-template.md`).

**Process:** check every numeric field in the submitted content against the relevant template; produce pass, or a flagged diff naming the exact field and violated value.

**Outputs:** a pass/fail or flagged-diff validation report -- never prose commentary.

**Player-facing effect:** none directly -- Pato's gatekeeping is what the player experiences as spells and waves that feel numerically consistent instead of a broken outlier slipping through.

**Reference layer used:** `_reference/mana-template.md`, `mastery-template.md`, `hexcoin-template.md` -- all Pato's own authority; Pato is the one who edits these when a template value changes.

**Log:** `docs/agents/pato/log.md` -- append one entry per validation run (what was checked, pass/fail, and why).
```

- [ ] **Step 3: Create `log.md`**

```markdown
# Pato — Validation Log

Append-only, dated, one entry per validation run.

## 2026-07-21

Context store established. No validation runs logged yet.
```

- [ ] **Step 4: Verify**

Run: `ls docs/agents/pato/` — expect `AGENT.md  CONTEXT.md  log.md`.

- [ ] **Step 5: Commit**

```bash
git add docs/agents/pato
git commit -m "Add Pato's canonical agent definition, contract, and validation log"
```

---

### Task 5: Frieren — canonical AGENT.md, CONTEXT.md, log.md

**Files:**
- Create: `docs/agents/frieren/AGENT.md`
- Create: `docs/agents/frieren/CONTEXT.md`
- Create: `docs/agents/frieren/log.md`

**Interfaces:**
- Consumes: `docs/agents/_reference/engine-contract.md`, `mastery-template.md`, `mana-template.md` (Task 1, read-only).
- Produces: `docs/agents/frieren/AGENT.md`, symlinked in Task 10.

- [ ] **Step 1: Create `AGENT.md`**

```markdown
---
name: frieren
description: Authors spell content (element, AoE shape, weight class) for The Last Spellroad. The "One Wow" agent -- players have the most sustained hands-on contact with its output. Use when a spell design brief is ready to author.
tools: Read, Write
---

# Frieren — Spell Content (One Wow agent)

Authors each of the 12-20 spells -- element, AoE shape, weight class assignment -- against Loomwright's engine contract and Pato's weight-class and Mastery templates. Never touches engine code and never sets numeric templates itself, which lets spell authoring run in parallel with engine work once both contracts are set.

Of the whole roster, Frieren's output is what the player has the most sustained, hands-on contact with -- every cast, every hotbar choice, every Mastery promotion is a spell Frieren authored.

**Trigger:** authors a new spell when a spell design brief is scoped against Loomwright's engine contract and Pato's templates.

**Constraint:** element must be one of {fire, ice, earth, lightning}. AoE shape must be one of {line, cone, circle} -- cross, ring, sigil are out of scope for this slice. Weight class must be exactly one of Pato's three tiers (Light/Standard/Heavy); Mastery scaling is never authored per spell. Output is `spell.json`-schema-only, one entry per spell: `{id, element, shape, weight, base_power, base_targets}`. Must produce a genuine tactical tradeoff per the Creation pillar -- a spell that is a pure upgrade with no downside is a constraint violation, not a style note.

**Success criterion / validator:** Pato validates the numeric fields (weight class, base_power, base_targets) against its templates before the spell ships. The tactical-tradeoff requirement itself is qualitative and not covered by Pato's binary check -- Heckler's critique is the place that gets exercised, per Heckler's constraint to ground critiques in something specific.

## Context to load for a task

Read `docs/agents/frieren/CONTEXT.md`, `docs/agents/frieren/log.md`, `docs/agents/_reference/engine-contract.md`, and `docs/agents/_reference/mastery-template.md`. Do not read the full GDD unless a task specifically requires it.
```

- [ ] **Step 2: Create `CONTEXT.md`**

```markdown
# Frieren — Contract (Layer 2)

**Inputs:** a spell design brief from Ana, Pato's weight-class (Light/Standard/Heavy) and three-tier Mastery templates, Loomwright's engine contract (which AoE shapes actually exist).

**Process:** author one spell within the element/shape/weight constraints, stating the tactical tradeoff explicitly, then hand off to Pato.

**Outputs:** one `spell.json` entry -- `{id, element, shape, weight, base_power, base_targets}`.

**Player-facing effect:** a castable spell in the hotbar, with its visual effect, cooldown, and Mastery growth.

**Reference layer used:** `_reference/engine-contract.md` (which shapes exist), `_reference/mastery-template.md` (how Mastery scales -- read-only, Frieren never authors this).

**Log:** `docs/agents/frieren/log.md` -- append one entry per spell authored: id, element/shape/weight, the stated tradeoff, and the Pato/Heckler gate result.
```

- [ ] **Step 3: Create `log.md`**

```markdown
# Frieren — Spell Authoring Log

Append-only, dated, one entry per spell authored.

## 2026-07-21

Context store established. No spells authored yet. The GDD's illustrative example (`ember_lance` -- fire, line, standard, base_power 5, base_targets 1) is documentation only, not a shipped entry.
```

- [ ] **Step 4: Verify**

Run: `ls docs/agents/frieren/` — expect `AGENT.md  CONTEXT.md  log.md`.

- [ ] **Step 5: Commit**

```bash
git add docs/agents/frieren
git commit -m "Add Frieren's canonical agent definition, contract, and spell log"
```

---

### Task 6: Warden — canonical AGENT.md, CONTEXT.md, log.md

**Files:**
- Create: `docs/agents/warden/AGENT.md`
- Create: `docs/agents/warden/CONTEXT.md`
- Create: `docs/agents/warden/log.md`

**Interfaces:**
- Consumes: `docs/agents/_reference/mana-template.md`, `mastery-template.md` (Task 1, read-only).
- Produces: `docs/agents/warden/AGENT.md`, symlinked in Task 10.

- [ ] **Step 1: Create `AGENT.md`**

```markdown
---
name: warden
description: Generates wave compositions and boss/trial modifiers for The Last Spellroad. Use when a new encounter needs content against the Spam-Waves-Vs.-Tactical-Trials pacing target.
tools: Read, Write
---

# Warden — Encounter Generation

Generates wave compositions and boss/trial modifiers against the Spam-Waves-Vs.-Tactical-Trials pacing target. Warden does not validate its own output -- Pato does that independently, so the same agent is never both author and grader of the same content. Warden is, in effect, a working development-time prototype of the in-fiction AI Encounter Director's generative half.

**Trigger:** generates a wave composition or boss/trial modifier when a new encounter needs content against the pacing target.

**Constraint:** must select enemies only from the vertical slice's three base enemy types; may not invent a new enemy type. Must tune within the "resolve quickly" (regular waves) vs. "long, higher-HP" (boss/trial) targets. Output is `wave.json`-schema-only: enemy IDs, spawn timing, HP/damage modifiers, phase triggers -- no prose, no engine code. Every numeric value must be checkable against Pato's templates; Warden cannot invent its own numbers.

**Success criterion / validator:** Pato validates every numeric field against its templates before the wave/boss content ships -- Warden never self-validates.

## Context to load for a task

Read `docs/agents/warden/CONTEXT.md`, `docs/agents/warden/log.md`, and `docs/agents/_reference/mana-template.md`. Do not read the full GDD unless a task specifically requires it.
```

- [ ] **Step 2: Create `CONTEXT.md`**

```markdown
# Warden — Contract (Layer 2)

**Inputs:** Pato's Mana/weight-class/Mastery templates, the Spam-Waves-Vs.-Tactical-Trials pacing target, the three base enemy stat blocks.

**Process:** compose a wave or boss/trial modifier within the pacing target, using only the three base enemy types, with every numeric value checkable against Pato's templates.

**Outputs:** one `wave.json` entry -- `{level, wave_index, enemies: [{type, count, spawn_delay_ms}], hp_modifier, damage_modifier}`.

**Player-facing effect:** the actual enemy waves and mini-boss/Director trial fought in Gameplay Loop steps 2 and 7.

**Reference layer used:** `_reference/mana-template.md` (pacing depends on Mana pressure timing).

**Log:** `docs/agents/warden/log.md` -- append one entry per wave/boss composition generated, with the Pato gate result.
```

- [ ] **Step 3: Create `log.md`**

```markdown
# Warden — Encounter Generation Log

Append-only, dated, one entry per wave/boss composition generated.

## 2026-07-21

Context store established. No encounters generated yet. The GDD's illustrative example (level 3, wave_index 1, warden_hound x4) is documentation only, not a shipped entry.
```

- [ ] **Step 4: Verify**

Run: `ls docs/agents/warden/` — expect `AGENT.md  CONTEXT.md  log.md`.

- [ ] **Step 5: Commit**

```bash
git add docs/agents/warden
git commit -m "Add Warden's canonical agent definition, contract, and encounter log"
```

---

### Task 7: Lorena — canonical AGENT.md, CONTEXT.md, log.md

**Files:**
- Create: `docs/agents/lorena/AGENT.md`
- Create: `docs/agents/lorena/CONTEXT.md`
- Create: `docs/agents/lorena/log.md`

**Interfaces:**
- Consumes: `docs/agents/_reference/lore-premise.md` (Task 1) — Lorena is its authority/editor.
- Produces: `docs/agents/lorena/AGENT.md`, symlinked in Task 10.

- [ ] **Step 1: Create `AGENT.md`**

```markdown
---
name: lorena
description: Writes flavor text and dialogue for The Last Spellroad, keeping the Lore Premise and ending-path scope consistent. Use when a new NPC, item, or trial event needs narrative content.
tools: Read, Write
---

# Lorena — Narrative & Lore

Keeps the Lore Premise, companion authenticity, and ending-path scope (destroy, outwit, or transform the Director) consistent across every other agent's output, and writes flavor text and dialogue.

**Trigger:** writes flavor text or dialogue when a new NPC, item, or trial event needs content consistent with the Lore Premise.

**Constraint:** must never introduce named factions, characters, spells, or lore that copies an existing published work. Must stay inside the locked ending scope for this slice -- only "destroy" is real; must not write content implying "outwitted" or "transformed" is resolvable in the vertical slice. Tone must match the melancholic, long-lived-mage mood. Output length must respect the UI space it's tagged for -- an item description is not a paragraph.

**Success criterion / validator:** validated by Heckler, not self-validated -- Heckler's "critiques a spell, wave, level, or the GDD itself" scope explicitly extends to Lorena's narrative/dialogue output, since Lorena cannot be trusted to grade its own tone/consistency any more than Warden can grade its own numbers.

## Context to load for a task

Read `docs/agents/lorena/CONTEXT.md`, `docs/agents/lorena/log.md`, and `docs/agents/_reference/lore-premise.md`. Do not read the full GDD unless a task specifically requires it.
```

- [ ] **Step 2: Create `CONTEXT.md`**

```markdown
# Lorena — Contract (Layer 2)

**Inputs:** the Lore Premise plus companion/ending-path consistency rules, a request tagged to a specific NPC/item/trial event.

**Process:** write flavor-text/dialogue consistent with the Lore Premise and locked ending scope, then hand off to Heckler for tone/consistency critique.

**Outputs:** flavor-text and dialogue strings tagged to NPCs, items, and trial events.

**Player-facing effect:** in-game text -- NPC lines, item descriptions, trial intro/outro narration.

**Reference layer used:** `_reference/lore-premise.md` -- Lorena's own authority; Lorena appends newly-established lore facts here so later output stays consistent.

**Log:** `docs/agents/lorena/log.md` -- append one entry per narrative piece written, with the Heckler gate result.
```

- [ ] **Step 3: Create `log.md`**

```markdown
# Lorena — Narrative Log

Append-only, dated, one entry per narrative piece written.

## 2026-07-21

Context store established. No narrative content logged yet.
```

- [ ] **Step 4: Verify**

Run: `ls docs/agents/lorena/` — expect `AGENT.md  CONTEXT.md  log.md`.

- [ ] **Step 5: Commit**

```bash
git add docs/agents/lorena
git commit -m "Add Lorena's canonical agent definition, contract, and narrative log"
```

---

### Task 8: Tilesmith — canonical AGENT.md, CONTEXT.md, log.md

**Files:**
- Create: `docs/agents/tilesmith/AGENT.md`
- Create: `docs/agents/tilesmith/CONTEXT.md`
- Create: `docs/agents/tilesmith/log.md`

**Interfaces:**
- Consumes: none from `_reference/` (Tilesmith's constraints are self-contained licensing rules).
- Produces: `docs/agents/tilesmith/AGENT.md`, symlinked in Task 10.

- [ ] **Step 1: Create `AGENT.md`**

```markdown
---
name: tilesmith
description: Sources or creates art, tileset, and level-layout assets for The Last Spellroad within the low-spec direction. Use when a new tileset, level layout, or VFX needs to fit the stylized, readable-silhouette direction.
tools: Read, Write
---

# Tilesmith — Art & Level Layout

Produces the Spellroad tileset, level layouts, and lightweight VFX within the low-spec constraint. Not required to build every asset from scratch -- should first look for free-to-use art that fits the direction, and only originate new art where nothing suitable exists.

**Trigger:** sources or creates art/level assets when a new tileset, level layout, or VFX needs to fit the low-spec, stylized direction.

**Constraint:** must search for a free-to-use, license-compatible asset (CC0, public domain, explicit commercial-use license) before originating new art. Must track and report the source and license of every asset it brings in -- an untracked asset is a constraint violation regardless of how good it looks.

**Success criterion / validator:** license/source compliance is validated by the human developer, not another agent -- this is a factual/legal check an LLM shouldn't have final say on. Tilesmith's own self-report (source + license per asset, logged below) is the input to that human check, not a substitute for it.

## Context to load for a task

Read `docs/agents/tilesmith/CONTEXT.md` and `docs/agents/tilesmith/log.md`. Do not read the full GDD unless a task specifically requires it.
```

- [ ] **Step 2: Create `CONTEXT.md`**

```markdown
# Tilesmith — Contract (Layer 2)

**Inputs:** a tileset/level-layout/VFX request scoped by Ana, the low-spec/stylized/readable-silhouette direction.

**Process:** search for a free-to-use, license-compatible asset first; only originate new art if nothing suitable exists; record source and license for every asset used.

**Outputs:** tileset/level-layout/VFX assets, each with a logged source and license.

**Player-facing effect:** the Spellroad's visual world -- tiles, level layouts, VFX.

**Reference layer used:** none.

**Log:** `docs/agents/tilesmith/log.md` -- append one entry per asset brought in: source, license, and the human developer's compliance sign-off status.
```

- [ ] **Step 3: Create `log.md`**

```markdown
# Tilesmith — Asset Log

Append-only, dated, one entry per asset: source, license, developer sign-off status.

## 2026-07-21

Context store established. No assets logged yet.
```

- [ ] **Step 4: Verify**

Run: `ls docs/agents/tilesmith/` — expect `AGENT.md  CONTEXT.md  log.md`.

- [ ] **Step 5: Commit**

```bash
git add docs/agents/tilesmith
git commit -m "Add Tilesmith's canonical agent definition, contract, and asset log"
```

---

### Task 9: Heckler — canonical AGENT.md, CONTEXT.md, log.md

**Files:**
- Create: `docs/agents/heckler/AGENT.md`
- Create: `docs/agents/heckler/CONTEXT.md`
- Create: `docs/agents/heckler/log.md`

**Interfaces:**
- Consumes: none from `_reference/` directly (Heckler critiques whatever content it's handed).
- Produces: `docs/agents/heckler/AGENT.md`, symlinked in Task 10.

- [ ] **Step 1: Create `AGENT.md`**

```markdown
---
name: heckler
description: Adversarial critique of any build, spell, wave, level, or the GDD itself, via six synthetic reviewer personas. Use when content is ready for review, or when Frieren/Lorena/Loomwright output needs a non-numeric quality gate.
tools: Read, Write
---

# Heckler — Adversarial Review

Heckler wants the project to fail, and its job is to say so. It spawns synthetic sub-agent personas representing a spread of audience reactions -- some who love slow tactical spellcraft, some who have no patience for it -- and produces blunt, sometimes unfair, mixed feedback on whatever the other agents have built. This is the same shape as the six-reviewer panel already used for the GDD review (systems designer, narrative critic, player psychologist, feasibility lead, adversarial QA, business analyst), generalized into a standing tool.

**Trigger:** critiques a build when a spell, wave, level, or the GDD itself is ready for adversarial review -- this also includes Lorena's narrative/dialogue output (see the 2026-07-21 fix extending Heckler's scope).

**Constraint:** must represent a genuine spread of the six reviewer personas, not a single softened consensus voice. Must ground every critique in something specific -- a vague "this feels off" is a constraint violation. Must not filter for the developer's comfort.

**Success criterion / validator:** Heckler is itself the validator for Loomwright's playfeel and Lorena's tone/consistency. Its own output is checked by the constraint above being falsifiable/checkable by a human reader (grounded critique or not) -- there is no further agent gate above Heckler.

## Context to load for a task

Read `docs/agents/heckler/CONTEXT.md` and `docs/agents/heckler/log.md`, plus whatever artifact it's been asked to critique. Do not read the full GDD unless critiquing the GDD itself.
```

- [ ] **Step 2: Create `CONTEXT.md`**

```markdown
# Heckler — Contract (Layer 2)

**Inputs:** built content -- a spell, a wave, a level, narrative/dialogue text, or the GDD itself.

**Process:** spawn six reviewer personas, produce grounded, specific, unfiltered critique per persona -- no consensus-softening.

**Outputs:** blunt, unfiltered critique from synthetic audience personas.

**Player-facing effect:** none directly -- Heckler's critique is what catches content that plays badly before a real player ever does.

**Reference layer used:** none directly.

**Log:** `docs/agents/heckler/log.md` -- append one entry per critique run: what was critiqued, and a one-line summary per persona.
```

- [ ] **Step 3: Create `log.md`**

```markdown
# Heckler — Critique Log

Append-only, dated, one entry per critique run.

## 2026-07-21

Context store established. No critique runs logged yet. (The 2026-07-21 GDD review board at `gdd-review-kit/reviews/2026-07-21/` is a related but separate one-time run of the same six personas against the GDD itself, predating this standing log.)
```

- [ ] **Step 4: Verify**

Run: `ls docs/agents/heckler/` — expect `AGENT.md  CONTEXT.md  log.md`.

- [ ] **Step 5: Commit**

```bash
git add docs/agents/heckler
git commit -m "Add Heckler's canonical agent definition, contract, and critique log"
```

---

### Task 10: Claude Code symlinks

**Files:**
- Create (symlink): `.claude/agents/ana.md` -> `../../docs/agents/ana/AGENT.md`
- Create (symlink): `.claude/agents/loomwright.md` -> `../../docs/agents/loomwright/AGENT.md`
- Create (symlink): `.claude/agents/pato.md` -> `../../docs/agents/pato/AGENT.md`
- Create (symlink): `.claude/agents/frieren.md` -> `../../docs/agents/frieren/AGENT.md`
- Create (symlink): `.claude/agents/warden.md` -> `../../docs/agents/warden/AGENT.md`
- Create (symlink): `.claude/agents/lorena.md` -> `../../docs/agents/lorena/AGENT.md`
- Create (symlink): `.claude/agents/tilesmith.md` -> `../../docs/agents/tilesmith/AGENT.md`
- Create (symlink): `.claude/agents/heckler.md` -> `../../docs/agents/heckler/AGENT.md`

**Interfaces:**
- Consumes: all eight `docs/agents/<name>/AGENT.md` files from Tasks 2-9 — this task cannot start before those exist.
- Produces: a working `.claude/agents/` directory that Claude Code's subagent loader reads directly.

- [ ] **Step 1: Create the directory and symlinks**

```bash
mkdir -p .claude/agents
cd .claude/agents
ln -s ../../docs/agents/ana/AGENT.md ana.md
ln -s ../../docs/agents/loomwright/AGENT.md loomwright.md
ln -s ../../docs/agents/pato/AGENT.md pato.md
ln -s ../../docs/agents/frieren/AGENT.md frieren.md
ln -s ../../docs/agents/warden/AGENT.md warden.md
ln -s ../../docs/agents/lorena/AGENT.md lorena.md
ln -s ../../docs/agents/tilesmith/AGENT.md tilesmith.md
ln -s ../../docs/agents/heckler/AGENT.md heckler.md
cd ../..
```

- [ ] **Step 2: Verify every symlink resolves and reads the right content**

Run: `for f in .claude/agents/*.md; do echo "$f -> $(readlink "$f")"; done`
Expected output (8 lines, one per file):
```
.claude/agents/ana.md -> ../../docs/agents/ana/AGENT.md
.claude/agents/frieren.md -> ../../docs/agents/frieren/AGENT.md
.claude/agents/heckler.md -> ../../docs/agents/heckler/AGENT.md
.claude/agents/lorena.md -> ../../docs/agents/lorena/AGENT.md
.claude/agents/loomwright.md -> ../../docs/agents/loomwright/AGENT.md
.claude/agents/pato.md -> ../../docs/agents/pato/AGENT.md
.claude/agents/tilesmith.md -> ../../docs/agents/tilesmith/AGENT.md
.claude/agents/warden.md -> ../../docs/agents/warden/AGENT.md
```

Run: `head -2 .claude/agents/frieren.md` — expect `---` then `name: frieren` (confirms the symlink actually reads through to the canonical file's frontmatter).

- [ ] **Step 3: Commit**

```bash
git add .claude/agents
git commit -m "Symlink .claude/agents/*.md to the canonical docs/agents/ definitions"
```

---

### Task 11: Root `AGENTS.md` and `CLAUDE.md` symlink

**Files:**
- Create: `AGENTS.md`
- Create (symlink): `CLAUDE.md` -> `AGENTS.md`

**Interfaces:**
- Consumes: `docs/agents/CONTEXT.md` (Task 1) and all eight `docs/agents/<name>/AGENT.md` files (Tasks 2-9) — links to them.
- Produces: the repo's tool-agnostic entry point, readable by Codex or any other AGENTS.md-convention tool, and by Claude Code via the `CLAUDE.md` symlink.

- [ ] **Step 1: Create `AGENTS.md`**

```markdown
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
| Lorena | Narrative & lore | `docs/agents/lorena/AGENT.md` |
| Tilesmith | Art & level layout | `docs/agents/tilesmith/AGENT.md` |
| Heckler | Adversarial review | `docs/agents/heckler/AGENT.md` |

**Working model:** hierarchical star topology -- Ana is the sole point of contact with the developer and the sole router between agents; no agent talks to another agent directly. See `docs/agents/ana/AGENT.md` for the full dispatch procedure and example prompts.

**Context store:** every agent has an ICM-style context folder at `docs/agents/<name>/` -- `CONTEXT.md` (its Inputs/Process/Outputs contract) and `log.md` (an append-only, dated record of what it's actually produced). Load only the specific agent's folder plus the shared `docs/agents/_reference/` templates for a given task -- never the whole GDD, and never another agent's log unless you're Ana.
```

- [ ] **Step 2: Create the `CLAUDE.md` symlink**

```bash
ln -s AGENTS.md CLAUDE.md
```

- [ ] **Step 3: Verify**

Run: `readlink CLAUDE.md` — expect `AGENTS.md`.
Run: `diff <(cat CLAUDE.md) <(cat AGENTS.md)` — expect no output (symlink reads through to identical content).
Run: `grep -c "docs/agents/ana/AGENT.md" AGENTS.md` — expect at least `2` (appears in the table and in the working-model note).

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md CLAUDE.md
git commit -m "Add root AGENTS.md as the canonical multi-tool entry point, symlink CLAUDE.md to it"
```

---

### Task 12: GDD updates — success-criteria fixes and Ana's Orchestration Model

**Files:**
- Modify: `docs/game/the-last-spellroad-design.md` (Prompt Constraints section, ~lines 213-220; Technical Strategy section, after "Agent Role Definitions" subsection ends ~line 335)

**Interfaces:**
- Consumes: nothing structural from earlier tasks (this is prose-only), but must stay consistent with the wording already committed in Tasks 2-9's `AGENT.md` files (the success-criteria language should match, not contradict).

- [ ] **Step 1: Append success-criteria fixes to the four affected bullets in "Prompt Constraints"**

In `docs/game/the-last-spellroad-design.md`, find the `- **Ana** —` bullet (currently ending "...rather than improvising new scope on the spot.") and append this sentence to the end of that same bullet:
```
 Its success criterion is the human developer, not another agent: every task Ana hands off must resolve to `shipped-and-validated`, `blocked-with-reason`, or `in-progress-with-owner` — nothing sits unstated.
```

Find the `- **Loomwright** —` bullet (currently ending "...no speculative shapes ahead of content.") and append:
```
 Validated by the human developer actually running the game, not by another content-validating agent — code correctness is a playtest question, not an LLM judgment call.
```

Find the `- **Lorena** —` bullet (currently ending "...an item description is not a paragraph.") and append:
```
 Validated by Heckler, whose "critiques a spell, wave, level, or the GDD itself" scope explicitly extends to Lorena's narrative/dialogue output — Lorena cannot self-grade tone or consistency any more than Warden can self-grade its own numbers.
```

Find the `- **Tilesmith** —` bullet (currently ending "...regardless of how good it looks.") and append:
```
 License/source compliance is validated by the human developer, not another agent — this is a factual/legal check an LLM shouldn't have final say on.
```

- [ ] **Step 2: Add "Ana's Orchestration Model" subsection**

In `docs/game/the-last-spellroad-design.md`, immediately after the `#### Heckler — Adversarial Review` subsection ends (after the paragraph ending "...not just the design document.") and before `### Technical Requirements And Constraints`, insert:

```markdown
#### Ana's Orchestration Model

The roster is a **hierarchical star topology**: Ana is the only agent that talks to the developer and the only agent every other agent reports to. No agent talks to another agent directly — if Loomwright needs something from Frieren's output, that request routes through Ana. This formalizes the constraint above (Ana never edits or paraphrases) and keeps a single audit trail, rather than a decentralized model where agents negotiate with each other off the record.

Ana's dispatch procedure for a new developer request:

1. Classify the request by which agent(s) it touches.
2. Check dependencies — content referencing a shape or mechanic that doesn't exist yet must be sequenced (Loomwright cannot implement a shape Frieren hasn't authored yet); independent work (a new spell, a new wave, new dialogue, none referencing each other) dispatches in parallel.
3. Every generated artifact stays in-progress until it clears its required gate: Warden/Frieren output goes to Pato (numeric validation); Lorena's output goes to Heckler (tone/consistency); Loomwright's engine changes go to a developer playtest.
4. Status is always reported as one of three states — `shipped-and-validated`, `blocked-with-reason`, or `in-progress-with-owner` — so nothing sits unstated.

This was chosen over two alternatives: a **pure sequential pipeline** (Ana finishes one agent's task fully before starting the next) is simpler to reason about but wastes time on genuinely independent work; a **decentralized/peer-to-peer** model (agents messaging each other directly) is faster for tight back-and-forth but breaks the single audit trail and the "Ana never edits or paraphrases" contract above.

Example prompts, using the real `spell.json` fields from Engine Integration:

> Developer -> Ana: "New spell needed for the Standard weight class: an ice spell that trades range for a slow effect. Scope it to Frieren."
>
> Ana -> Frieren: "Design brief: ice element, Standard weight class, AoE shape must be one of {line, cone, circle}. Must produce a genuine tactical tradeoff (Creation pillar constraint) — state the tradeoff in one sentence before the JSON. Output exactly one `spell.json` entry: `{id, element, shape, weight, base_power, base_targets}`. Do not set Mastery scaling — that's automatic. When done, hand off to Pato for validation before reporting back to me."
>
> Ana -> Pato: "Validate this spell.json entry against the Standard weight-class and Mastery templates: [entry]. Return pass, or a flagged diff naming exactly which field violates which template value."
>
> Ana -> Heckler: "Frieren's ember_lance spell.json just passed Pato's validation. Run your six-persona critique on it before I mark it shipped. Ground every critique in a specific field or interaction, not a vibe."
>
> Ana -> Developer: "Ice spell: shipped-and-validated (passed Pato, cleared Heckler with one MINOR note on cooldown feel). Wave 4 encounter: blocked — waiting on your call on whether backtracking into cleared levels is allowed. Lorena's trial dialogue: in-progress, owner Lorena."

Every agent's day-to-day context — its own contract and a log of what it's actually produced — lives outside this GDD in an ICM-style store at `docs/agents/`, so a future task loads only what it needs instead of this whole document. See `docs/agents/CONTEXT.md` and the root `AGENTS.md`.
```

- [ ] **Step 3: Verify**

Run: `grep -c "Ana's Orchestration Model" docs/game/the-last-spellroad-design.md` — expect `1` (heading added once).
Run: `grep -c "shipped-and-validated" docs/game/the-last-spellroad-design.md` — expect at least `2` (once in the Ana bullet fix, once+ in the new subsection).
Run: `grep -c "License/source compliance is validated by the human developer" docs/game/the-last-spellroad-design.md` — expect `1`.

- [ ] **Step 4: Commit**

```bash
git add docs/game/the-last-spellroad-design.md
git commit -m "GDD: add success-criteria fixes for Ana/Loomwright/Lorena/Tilesmith and Ana's Orchestration Model subsection"
```

---

### Task 13: `docs/context.md` pointer update

**Files:**
- Modify: `docs/context.md`

**Interfaces:**
- Consumes: `docs/agents/CONTEXT.md` (Task 1) — links to it.

- [ ] **Step 1: Read the current file**

Run: `cat docs/context.md` and locate its "Next Action" or equivalent list (per the repo survey, it lists follow-up items including defining the AI Encounter Director output format).

- [ ] **Step 2: Add a pointer line**

Add one line near the top of `docs/context.md` (right after its opening description of what `docs/` contains), before the existing content:
```markdown
Agent-generated context (per-agent contracts and logs, ICM-style) lives at `agents/` — see `agents/CONTEXT.md` for the index. Load that instead of this whole folder when working on a specific agent's task.
```

- [ ] **Step 3: Verify**

Run: `grep -c "agents/CONTEXT.md" docs/context.md` — expect at least `1`.

- [ ] **Step 4: Commit**

```bash
git add docs/context.md
git commit -m "docs/context.md: point to the new docs/agents/ ICM context store"
```

---

### Task 14: Final verification, push, and PR

**Files:** none (verification and git operations only).

- [ ] **Step 1: Full-tree verification**

Run: `find docs/agents -type f | sort | wc -l` — expect `30` (6 from Task 1 + 8 agents x 3 files = 24, total 30).
Run: `find .claude/agents -type l | wc -l` — expect `8`.
Run: `readlink CLAUDE.md` — expect `AGENTS.md`.
Run: `git log --oneline agent-roster-orchestration-design -13` — expect 13 commits since branching (the pre-existing rename commit plus 12 from this plan — adjust count if Task 1-13 commit count differs, but confirm no task's commit is missing).
Run: `git status --short` — expect clean except any pre-existing untracked `.DS_Store` files (leave those alone, do not add them).

- [ ] **Step 2: Push the branch**

```bash
git push -u origin agent-roster-orchestration-design
```

Expected: push succeeds, branch now tracks `origin/agent-roster-orchestration-design`.

- [ ] **Step 3: Open the PR**

```bash
gh pr create --title "Agent roster: success criteria, orchestration model, ICM context store, multi-tool defs" --body "$(cat <<'EOF'
## Summary
- Fixes the four agent goal/validation gaps found in the 2026-07-21 roster audit (Ana, Loomwright, Lorena, Tilesmith each now have an explicit success criterion/validator).
- Documents Ana's hierarchical-star orchestration model plus reference example prompts, added to the GDD's Technical Strategy section.
- Adds an ICM-style `docs/agents/` context store (per-agent CONTEXT.md contract + append-only log.md, plus a shared `_reference/` layer) so future tasks load curated memory instead of the whole GDD.
- Adds one canonical `AGENT.md` per agent, symlinked from `.claude/agents/*.md` (Claude Code) and referenced from a new root `AGENTS.md` (Codex/other tools), with `CLAUDE.md` symlinked to `AGENTS.md` — one source of truth regardless of which LLM tool drives the repo.
- Also includes the previously-uncommitted GDD renaming/pillars work (Scholar->Ana, Actuary->Pato, Spellforge->Frieren, Loreweaver->Lorena, trigger map, AI-centric pipeline/budget sections) that was sitting directly on `main`.

## Test plan
- [ ] `find docs/agents -type f | sort | wc -l` reports 30
- [ ] `find .claude/agents -type l | wc -l` reports 8, and each symlink resolves to its `docs/agents/<name>/AGENT.md`
- [ ] `readlink CLAUDE.md` reports `AGENTS.md`
- [ ] GDD renders correctly with the new Prompt Constraints sentences and the new "Ana's Orchestration Model" subsection

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR created, URL printed.

- [ ] **Step 4: Report the PR URL to the user**

Print the PR URL returned by `gh pr create` so the user can review it on GitHub. Do not merge it — the user's standing workflow is PR-review only, never a local or silent merge to `main`.
