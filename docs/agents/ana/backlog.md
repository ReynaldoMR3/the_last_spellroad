# Ana — Vertical Slice Backlog (Layer 4 working artifact)

This is the roster's single master backlog: the full GDD (`docs/game/the-last-spellroad-design.md`) broken into scoped, owned, model-assigned tasks, phased against the Seven-Week Vertical Slice. It exists so "what's left" is always answerable by reading one file instead of re-deriving it from the GDD, the review boards, or eight separate logs.

**How this fits the context store:** this file is Ana's Layer 4 artifact (`docs/agents/CONTEXT.md`'s framing) — it changes every planning session, unlike `ana/CONTEXT.md` (Layer 2, stable contract). Other agents do not read this file directly, same rule as `ana/log.md` — they get their next task from Ana's dispatch, not by reading the backlog themselves.

**Status legend** (extends Ana's existing three-state model from `ana/AGENT.md` with one state for work not yet dispatched):

- `not-started` — scoped here, not yet handed to an agent.
- `in-progress-with-owner` — dispatched, owner named.
- `blocked-with-reason` — cannot proceed; reason and unblocking condition stated.
- `shipped-and-validated` — cleared its required gate(s).

**Timeline anchor:** course started 2026-07-09. Today (2026-07-22) is the last day of Week 2. Design/decision work (death system, control scheme, art pipeline, two GDD review-board passes) is what Weeks 1-2 actually produced — no engine or content build has started yet. This backlog covers Weeks 3-7, the production phase.

---

## Phase 0 — Unblocking decisions

Before any production task below can be dispatched, four standing gaps from the roster's own logs need a stated position. Three are Ana's call to make now (scope clarifications, not new design), one genuinely needs the developer.

### 0.1 — Runtime ownership gap (Ana's call, flagged for developer override)

**The gap:** the 2026-07-23 full gdd-review-kit re-run (`docs/agents/ana/log.md`, that date's entry) surfaced that no agent currently owns writing the runtime code for HP/Mana/Mastery/Hexcoin/Debuff logic. Pato validates the *numbers*; Loomwright's charter (`docs/agents/_reference/engine-contract.md`) is scoped to "movement and targeting/casting engine" only and explicitly says nothing about numbers or economy lives there.

**Decision:** Loomwright's engine scope extends to *implementing* these systems (reading and applying Pato's validated numbers), the same split the GDD already uses for Save Data And Persistence: "this is Loomwright's engine scope — the read/write mechanism itself... while Pato's templates continue to own what values are valid to write." This is a mechanism/ownership clarification following an already-established precedent, not a new design decision — Loomwright still never sets a number, it only runs the numbers Pato defines.

**Action:** `docs/agents/_reference/engine-contract.md` and `docs/agents/loomwright/AGENT.md` need one sentence added extending scope to "runtime execution of HP, Mana, Mastery, Hexcoin, and Debuff mechanics per Pato's templates" before Task 1.1 below can be dispatched as in-scope work. Flagged here for the developer to veto or amend before Phase 1 starts; proceeding on this reading unless told otherwise.

**Status:** `blocked-with-reason` — waiting on developer sign-off (or silence through the start of Phase 1, treated as implicit approval since this was surfaced explicitly here) before the engine-contract edit lands and Task 1.1 unblocks.

### 0.2 — Checkpoint/retry Hexcoin income-bounding (developer decision, genuinely open)

Does a death respawn place the mage *before or after* the pre-boss waves, and do those waves re-award Hexcoin on retry? The forward-only rule and the Phase-Transition Recovery fee are both priced against a bounded per-expedition Hexcoin income (see GDD "Open Design Questions," item 6) — if retried waves re-pay Hexcoin, that bound doesn't hold.

**Blocks:** Task 1.6 (checkpoint/respawn placement implementation) directly. Does not block anything earlier in the sequence.

**Status:** `blocked-with-reason`, not urgent until Task 1.6 is next in the queue (Phase 1, expected Week 3-4). Will resurface explicitly when that task comes up, per Ana's log entry (6).

### 0.3 — All-Novice-hotbar exploit (developer decision, not blocking)

2026-07-23 review found the Novice-floor mercy rule (death costs no Mastery if every equipped spell is already Novice) creates a zero-cost way to farm boss-pattern knowledge with an all-Novice loadout. Two known resolution shapes exist (narrate it as an in-fiction "the Director doesn't bother punishing the unskilled" mechanic, or make death cost something else when the roll finds no eligible spell) — developer has not chosen either.

**Blocks:** nothing currently scheduled. Tracked so it doesn't silently drop before Lorena's narrative pass (Phase 4) or before Heckler's pre-submission review (Phase 5), either of which could plausibly need the answer.

**Status:** `blocked-with-reason`, non-urgent, re-raised at the start of Phase 4 and Phase 5 below.

### 0.4 — Mastery growth rate (developer decision, sequenced not blocked)

How many landed casts/kills per Mastery tier. Developer's 2026-07-22 call was to wait for Warden's real regular-wave data rather than guess a placeholder (GDD, "Open Design Questions"). This is naturally sequenced, not stuck: Task 2.2 (Warden's first wave batch) produces the data Task 2.5 (Pato sets the growth rate) needs.

**Status:** `in-progress-with-owner` in the sense that its unblocking condition (Task 2.2) is already scheduled below, not an open-ended wait.

---

## Model-selection table (Ana's extension of the GDD's table)

The GDD (Technical Strategy → Token Budget And Projections → "Model-selection governance") sets the base table and explicitly assigns Ana to re-tune it against real usage rather than treat it as fixed. It covers Pato, and the four generative/orchestration agents, but not Loomwright or Tilesmith — both do meaningfully different work from "structured validation" or "creative prose," so this backlog extends the table rather than force-fitting them into an existing row.

| Agent | Task type | Model | Why |
| --- | --- | --- | --- |
| Pato | Structured/deterministic rule-checking against numeric templates | **Claude Haiku 4.5** | Pattern-matching against a fixed template, not creative judgment — cheapest tier that reliably does the job. (GDD table, unchanged.) |
| Warden, Frieren, Lorena, Heckler | Generative/creative (pacing, spell design, prose, critique) | **Claude Sonnet 5** | Needs judgment a deterministic checker can't make. (GDD table, unchanged.) |
| Ana | Orchestration, task tracking and routing, this backlog | **Claude Sonnet 5** | Coordination benefits from the same judgment tier as the agents it coordinates. (GDD table, unchanged.) |
| **Loomwright** | Engine code — TypeScript implementation of movement, casting, and (per 0.1) HP/Mana/Mastery/Hexcoin runtime systems | **Claude Sonnet 5**, escalate to **Opus 4.8** for one-off architecture calls (e.g. Task 1.1's entity/combat data-flow shape) | This is the roster's only agent writing shipped code — needs a strong coding-capable model, not the cheapest tier or the "prose" tier. Sonnet 5 is the default; Opus 4.8 is reserved for the few structural decisions that are expensive to get wrong and hard to redo later (chosen once per task, not a standing upgrade). *(New row — not in the GDD table.)* |
| **Tilesmith** | Agentic art sourcing (WebSearch/WebFetch/Bash) plus license-compliance judgment | **Claude Sonnet 5** | Not deterministic (judging whether a found asset actually fits the license rule and the art direction) and not pure prose generation — closer to Warden/Frieren's judgment tier than Pato's. *(New row — not in the GDD table.)* |

**Re-tune trigger:** end of Week 3 (first real content + first real engine work will exist by then) and end of Week 5, per the GDD's own instruction to check this against actual per-agent token usage rather than re-guess. Record the actual re-tune (kept/changed and why) as a dated entry in this file's Phase 3 and Phase 5 headers when it happens, not as a separate log.

---

## Phase 1 — Engine foundation (target: Week 3)

Owner throughout: **Loomwright**. Nothing in Phase 2+ that touches HP, Mana, Mastery, Hexcoin, or enemy behavior in-engine can start before its corresponding Phase 1 task ships — this is the sequencing Ana's own dispatch procedure requires ("content referencing a mechanic that doesn't exist yet must be sequenced").

| ID | Task | Model | Depends on | Status |
| --- | --- | --- | --- | --- |
| 1.1 | Combat/enemy entity foundation: base enemy class, the 3 archetype stat blocks (Melee 7 dmg, Ranged 4 dmg, Debuffer 0 dmg + speed/regen drain), spawn/despawn lifecycle | Sonnet 5 (Opus 4.8 for the architecture call) | 0.1 resolved | `blocked-with-reason` |
| 1.2 | HP pool + death trigger: 100-point pool, no in-combat regen, full reset per wave/checkpoint, 0-HP triggers Mastery-loss + respawn | Sonnet 5 | 1.1 | `blocked-with-reason` |
| 1.3 | Mana pool runtime: 100 pool, 5/sec passive regen in and out of combat, weight-class (Light/Standard/Heavy) cost+cooldown application | Sonnet 5 | 1.1 | `blocked-with-reason` |
| 1.4 | Mastery runtime: three-tier scaling (Novice/Adept/Master) applied per spell, death's random-tier-drop roll (Novice-excluded per the closed floor rule), the Master-tier UI beat (on-screen indicator at the qualifying cast) | Sonnet 5 | 1.2, 1.3 | `blocked-with-reason` |
| 1.5 | Hexcoin runtime: 1/kill earn, expedition-scoped running total, the two fee flows (100-Hexcoin Mastery-choice fee, flat phase-transition-recovery fee with its cap/ceiling math from `hexcoin-template.md`/`hp-template.md`) | Sonnet 5 | 1.2 | `blocked-with-reason` |
| 1.6 | Checkpoint/respawn placement + save schema v2 (extend the existing `localStorage` blob to Mastery tiers, discovered spells, hierarchy rank, Hexcoin balance, lore flags per "Save Data And Persistence"; schema-version bump, clean-reset-on-mismatch) | Sonnet 5 | 1.2, 1.5, **0.2** | `blocked-with-reason` |

**Gate for the whole phase:** developer playtest per `loomwright/AGENT.md`'s own success criterion ("validated by the human developer actually running the game... not by another content-validating agent"). Pato does **not** gate these — there's no generated content yet to validate, only engine mechanism. Pato's gate starts at Phase 2 once Frieren/Warden output exists to check.

---

## Phase 2 — First vertical thread (target: Week 3-4)

Goal: one spell of each of the 3 shipping AoE shapes (line, cone, circle) fully playable end-to-end, plus the first real wave-composition data Task 0.4's Mastery-growth-rate decision needs. This is deliberately a thin slice through every system before Phase 3 scales it up — catches integration problems on 3-4 pieces of content instead of on all 12-20.

| ID | Task | Owner | Model | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| 2.1 | Author 3 spells, one per AoE shape (line/cone/circle), spanning at least 2 of the 4 elements and at least 2 of the 3 weight classes, each with a stated tactical tradeoff | Frieren | Sonnet 5 | Phase 1 | `not-started` |
| 2.2 | Pato validation gate on 2.1's three `spell.json` entries | Pato | Haiku 4.5 | 2.1 | `not-started` |
| 2.3 | Implement the 3 AoE shapes' targeting-preview + confirm/cancel rendering and hit-detection against 2.2's validated spells | Loomwright | Sonnet 5 | 2.2 | `not-started` |
| 2.4 | Generate first regular-wave batch: 2-3 waves for Level 1, using only the 3 base enemy archetypes | Warden | Sonnet 5 | Phase 1 | `not-started` |
| 2.5 | Pato validation gate on 2.4's `wave.json` entries, **and** set the Mastery growth-rate number (closes Open Design Question / backlog item 0.4) using 2.4's real per-wave landed-cast counts as the sizing baseline | Pato | Haiku 4.5 | 2.4 | `not-started` |
| 2.6 | Developer playtest: move, cast all 3 shapes, take damage from all 3 archetypes, die once, confirm Mastery-tier-drop and respawn-at-checkpoint both fire correctly | Developer | — | 2.3, 2.5 | `not-started` |
| 2.7 | Heckler critique pass on the playable thread (engine feel + the 3 spells + the wave), first pass where there's an actual build to critique rather than a design doc | Heckler | Sonnet 5 | 2.6 | `not-started` |

**Gate for the phase:** 2.6 (developer playtest) plus 2.7 (Heckler). This is the first point where Loomwright's engine-correctness gate and Heckler's playfeel gate both apply to the same artifact, matching the distinction already drawn in `loomwright/AGENT.md`.

---

## Phase 3 — Content scale-out (target: Week 4-5)

Goal: hit the Seven-Week Vertical Slice's actual numbers — 12-20 spells total, 3 enemy types (already stat-blocked in Phase 1, this phase is composing them into waves), 5-10 levels, 1 mini-boss/Director trial, 1 tileset. Frieren/Warden/Tilesmith work in parallel here — none of their outputs reference each other, only Pato's already-finalized templates, so Ana dispatches all three concurrently per the dependency-check step in the dispatch procedure.

| ID | Task | Owner | Model | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| 3.1 | Author remaining spells to reach 12-20 total (9-17 more beyond Phase 2's 3), covering all 4 elements and all 3 weight classes, each with a stated tradeoff | Frieren | Sonnet 5 | Phase 2 | `not-started` |
| 3.2 | Pato validation gate on 3.1, run per-batch (don't hold all 9-17 for one giant validation pass — validate as spells land so a bad one doesn't block the rest) | Pato | Haiku 4.5 | 3.1 (per batch) | `not-started` |
| 3.3 | Generate remaining regular-wave compositions to cover 5-10 levels at 2-3 waves each (using 2.4's Level 1 waves as the template) | Warden | Sonnet 5 | Phase 2, 3.2 (spells referenced by wave difficulty tuning) | `not-started` |
| 3.4 | Compose the mini-boss/Director trial: phase count, phase-break count (bounded by the 35%-of-competent-play-budget recovery-fee ceiling from Phase-Transition Recovery), competent/careless HP-budget targets in the 40-60%/70-90%+ pool ranges | Warden | Sonnet 5 | 3.2 | `not-started` |
| 3.5 | Pato validation gate on 3.3 and 3.4 (independent recomputation of every numeric field, not a rubber-stamp — matching the standard Pato already set in the 2026-07-21 boss-composition gate check) | Pato | Haiku 4.5 | 3.3, 3.4 | `not-started` |
| 3.6 | Source/build the Spellroad tileset and 3 enemy-archetype sprites via the Art Sourcing pipeline (Kenney.nl first, OpenGameArt CC0 second, recolor/recombine third, hand-author last resort); log every asset's source+license in `tilesmith/log.md` | Tilesmith | Sonnet 5 | none (parallel with 3.1-3.5) | `not-started` |
| 3.7 | Build 5-10 level layouts in Tiled from 3.6's tileset, exported as Tiled JSON, loaded via `this.load.tilemapTiledJSON()` | Tilesmith | Sonnet 5 | 3.6 | `not-started` |
| 3.8 | Wire 3.5's validated wave/boss JSON and 3.7's level layouts into the actual playable level sequence (encounter system reads `wave.json` to call Loomwright's spawn API, per Engine Integration step 5) | Loomwright | Sonnet 5 | 3.5, 3.7 | `not-started` |
| 3.9 | Developer playtest: full 5-10 level sequence start to mini-boss, at least one full death-and-respawn cycle mid-run | Developer | — | 3.8 | `not-started` |

**Re-tune checkpoint:** re-tune the model-selection table against actual Week 3 usage here (first real content-authoring token spend now exists to check against).

---

## Phase 4 — Narrative pass (target: Week 5-6)

Deliberately sequenced after Phase 3 rather than parallel to it, per Ana's log entry (3): narrative framing needs the mechanics it's framing to be numerically stable first (the fee narration, the Debuffer's lore identity, and the all-Novice-exploit narrative option all reference mechanics that only just finished landing in Phase 3).

| ID | Task | Owner | Model | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| 4.1 | Narrative framing for the two Hexcoin fees (Mastery-choice fee, phase-transition recovery fee) — currently a bare paywall per the 2026-07-21 review's Narrative Critic finding | Lorena | Sonnet 5 | Phase 3 | `not-started` |
| 4.2 | Debuffer archetype lore identity (flagged MAJOR, still open as of the 2026-07-23 review) | Lorena | Sonnet 5 | Phase 3 | `not-started` |
| 4.3 | Revisit **0.3** (all-Novice-hotbar exploit): if the developer's resolution is narrative ("the Director doesn't bother punishing the unskilled"), write it here; if mechanical, this task is N/A and 0.3 resolves in Phase 1/2 rework instead | Lorena | Sonnet 5 | Developer decision on 0.3 | `blocked-with-reason` |
| 4.4 | NPC/companion dialogue and item flavor text for the 5-10 levels (rescuable-adventurer beats, per Gameplay Loop step 5) | Lorena | Sonnet 5 | Phase 3 | `not-started` |
| 4.5 | Mini-boss/Director trial intro/outro narration (only the "destroy" ending path — no content implying "outwitted" or "transformed" is resolvable this slice) | Lorena | Sonnet 5 | 3.4, 3.5 | `not-started` |
| 4.6 | Heckler critique gate on all of 4.1-4.5 (tone/consistency — Lorena cannot self-grade, per her own contract) | Heckler | Sonnet 5 | 4.1-4.5 | `not-started` |

---

## Phase 5 — Adversarial QA and hardening (target: Week 6)

| ID | Task | Owner | Model | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| 5.1 | Full six-persona Heckler critique of the complete playable build (engine + all content + narrative together, not the piecemeal passes from Phases 2/4) | Heckler | Sonnet 5 | Phase 3, Phase 4 | `not-started` |
| 5.2 | Resolve every BLOCKING finding from 5.1 (route each to its owning agent per Ana's dispatch procedure — do not let any sit unstated) | Ana (routes) | Sonnet 5 | 5.1 | `not-started` |
| 5.3 | UI feedback-moment pass: confirm the Mastery-tier-up on-screen indicator (Power pillar) and the hierarchy-rank-promotion full-screen beat both actually fire, not just exist in template text | Loomwright | Sonnet 5 | 1.4, Phase 3 | `not-started` |
| 5.4 | Save/load QA: schema-version mismatch triggers the clean-reset notice correctly; every "carries forward permanently" field (Mastery tiers, discovered spells, hierarchy rank, Hexcoin, lore flags) actually survives a browser refresh | Developer + Loomwright | — / Sonnet 5 | 1.6 | `not-started` |
| 5.5 | Re-check 0.3 status: confirmed resolved (via 4.3 or a Phase-1/2 mechanical fix) before submission, or explicitly logged as a known, accepted limitation if not | Ana | Sonnet 5 | 0.3 resolution | `blocked-with-reason` |

**Re-tune checkpoint:** second model-selection re-tune, against Week 5 actuals.

---

## Phase 6 — Polish and submission (target: Week 7)

| ID | Task | Owner | Model | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| 6.1 | Full developer playtest of the final build, start to Director trial, at least twice (once careless, once competent, to sanity-check the HP-budget and recovery-fee ranges actually feel like the stated competent/careless split) | Developer | — | Phase 5 | `not-started` |
| 6.2 | Final gdd-review-kit board re-run against the finished vertical slice (third run, following the 2026-07-21 and 2026-07-23 precedent) | Ana (runs the kit) | Sonnet 5 | 6.1 | `not-started` |
| 6.3 | Close out this backlog: every row above at `shipped-and-validated`, or explicitly logged as a stated, accepted cut (per the GDD's own instruction to cut scope rather than silently slip the timeline) | Ana | Sonnet 5 | 6.1, 6.2 | `not-started` |
| 6.4 | Course submission support (assignment extracts live in `multi-agent-ai-in-game-development/docs/submissions/`, per the repo-boundary rule — this backlog and the GDD stay untouched by that extraction) | Developer | — | 6.3 | `not-started` |

---

## Maintenance rules for this file

- Update a row's `Status` the moment an agent reports back to Ana — do not batch updates.
- When a row moves to `blocked-with-reason`, state the reason inline in that row's table cell or in a linked note above the table (as Phase 0 does) — never leave a row silently stuck.
- Adding a task later: append it to the relevant phase table with a new ID (`<phase>.<next-number>`), don't renumber existing IDs — other rows' `Depends on` references would break.
- This file does not replace `ana/log.md`. The log stays the narrative history of *why* a decision was made; this backlog is the current-state tracker of *what's left*. Cross-link them (a log entry can say "see backlog 3.4"; a backlog row doesn't need to restate log detail).
