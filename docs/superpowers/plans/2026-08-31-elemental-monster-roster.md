# Elemental Spell and Monster Roster Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax (- [ ]) for tracking.

**Goal:** Add explicit spell/monster elemental matchups, twelve reusable nameless monster silhouettes, progressive Level 1–5 elemental encounter composition, and a unique resistant boss in Level 5's final wave.

**Architecture:** Keep the existing three mechanical archetypes and separate them from stable visual monster IDs and per-wave elements. Pure TypeScript owns matchup arithmetic and content validation; Phaser only consumes the validated data at the existing spell-damage and enemy-rendering seams. Wave threat budgets continue to measure enemy threat independently from the player's spell loadout.

**Tech Stack:** TypeScript, Phaser 3, JSON content, Vitest, Vite, existing CC0 asset pipeline, Docker-first verification.

**Spec:** docs/superpowers/specs/2026-08-31-elemental-monster-roster-design.md

## Global Constraints

- Preserve the existing melee, ranged, and debuffer archetypes; add no fourth archetype.
- Every monster wave entry has exactly one valid element: fire, ice, earth, or lightning.
- The fixed advantage cycle is fire -> ice -> earth -> lightning -> fire.
- Same-element damage is 1.00x; advantage is 1.25x; disadvantage is 0.75x.
- Elemental modifiers affect spell damage only, never monster HP, monster attacks, threat budgets, Hexcoins, or Mastery rewards.
- Keep twelve stable visual IDs and one separate stable boss ID; no player-facing monster names or archetype labels.
- Color must be reinforced by an elemental motif/icon/VFX and remain readable in grayscale.
- Level 1 Wave 0 remains the onboarding exception; Level 1 Wave 1 must be easier than Wave 2.
- Level 5 is the capstone; all four elements may combine there, and the boss appears only in its final wave.
- Do not sample sprite pixels at runtime; derive presentation from explicit element metadata.
- Do not add dependencies or make the Art Board auto-write production game files.
- Each task ends with focused tests, typecheck/build as applicable, and a focused commit.
- Engine and build verification use docs/agents/_reference/docker-testing-contract.md.

## File Map

| Path | Responsibility |
| --- | --- |
| docs/agents/_reference/elemental-template.md | Pato's authoritative matchup, resistance, and spell-effect numeric rules |
| src/data/types.ts | Shared Element, monster, wave-entry, and spell-effect contracts |
| src/data/monsterRegistry.ts | Stable visual IDs mapped to archetypes and sprite metadata |
| src/data/waves/level-1.json through level-5.json | Per-wave monster, archetype, and element assignments |
| src/data/waves/boss-1.json | Existing boss data, if the final Level 5 boss phases remain there |
| src/systems/elementalDamage.ts | Pure matchup and boss-resistance arithmetic |
| src/systems/characterArt.ts | Monster ID to sprite key/URL and element presentation metadata |
| src/entities/Enemy.ts | Enemy construction/rendering without player-facing names |
| src/scenes/SpellroadScene.ts | Validated wave spawning and spell damage integration |
| src/systems/waveThreatBudget.ts | Existing enemy-threat validation plus composition complexity helpers |
| src/data/validateContent.ts | Wave/monster/element validation |
| src/data/spells/spells.json | Frieren's rebalanced spell content and elemental identity |
| docs/agents/{ana,frieren,pato,warden,tilesmith,loomwright,heckler}/log.md | Append-only agent gate records |
| README.md and docs/art-direction/art-board-workflow.md | Developer workflow and art/asset review instructions |

### Task 1: Freeze the cross-agent elemental content contract

**Owner:** Ana coordinates; Frieren and Pato produce the gated content contract.

**Files:**
- Create: docs/agents/_reference/elemental-template.md
- Modify: docs/superpowers/specs/2026-08-31-elemental-monster-roster-design.md only if approved numeric/effect decisions require clarification
- Test: src/data/validateContent.test.ts additions for the contract shape

**Interfaces:**
- Consumes: Issue #207, the approved spec, mana-template.md, mastery-template.md, hp-template.md, and current spell/wave JSON.
- Produces: An authoritative table for the four matchup multipliers, boss resistance multiplier, spell elemental identity/effect fields, and loadout fairness rules. Later tasks read this file instead of inventing values.

- [ ] Step 1: Frieren lists each existing spell's intended tactical identity. Keep the four approved directions: fire supports melee-adjacent pressure, ice weakens, lightning stuns, and earth provides a single-target burst. For each of the twelve spells, state the effect, target rule, duration/cap if applicable, and intended tradeoff against power, targets, cost, cooldown, and shape.
- [ ] Step 2: Pato validates or rejects each proposed number. Record exact values for elemental multipliers, boss resistance to the two selected elements, status magnitude/duration/cap, and revised spell fields. Record flagged fields instead of silently changing them.
- [ ] Step 3: Write elemental-template.md. Include the exact lookup table, calculation order, boss resistance precedence, whether resistance stacks with disadvantage, the four effect contracts, and the rule that wave threat budgets exclude spell elemental effectiveness.
- [ ] Step 4: Add validation fixtures for valid and invalid missing element, invalid effect payload, invalid boss resistance pair, and a mixed Level 5 wave with a viable counter in the default six-spell loadout.
- [ ] Step 5: Run npm test -- src/data/validateContent.test.ts; expected result is all existing and new contract tests passing.
- [ ] Step 6: Commit with message docs: define elemental combat content contract.

### Task 2: Add pure data contracts and matchup arithmetic

**Owner:** Loomwright, with Pato's Task 1 template as numeric authority.

**Files:**
- Create: src/systems/elementalDamage.ts, src/systems/elementalDamage.test.ts, src/data/monsterRegistry.ts, src/data/monsterRegistry.test.ts
- Modify: src/data/types.ts, src/data/enemyRegistry.ts, src/data/validateContent.ts, src/data/validateContent.test.ts

**Interfaces:**
- Consumes: Element, EnemyArchetype, WaveEnemyEntry, and exact values in elemental-template.md.
- Produces:
  - getElementalMultiplier(spellElement: Element, monsterElement: Element): number
  - calculateElementalDamage(basePower: number, spellElement: Element, monsterElement: Element, masteryMultiplier?: number, resistanceMultiplier?: number): number
  - validateMonsterAssignment(assignment): ValidationIssue[]
  - MONSTER_REGISTRY with twelve regular IDs and one boss ID.

- [ ] Step 1: Write failing tests for all sixteen spell/monster element pairs. Assert the four advantage pairs return 1.25, the four disadvantage pairs return 0.75, and all same/cross-neutral pairs return 1.0 according to the explicit table.
- [ ] Step 2: Write ordering tests. Assert Mastery is applied before elemental matching, resistance is applied exactly once, final output is rounded only at the end, and neutral damage preserves the existing result.
- [ ] Step 3: Write registry/content tests. Assert all twelve IDs resolve to a sprite key, one archetype, and one asset record; the boss resolves separately; unknown IDs, missing elements, and duplicate active assignments fail validation.
- [ ] Step 4: Implement the explicit matchup table and pure calculation. Do not read colors, infer relationships from enum order, or modify enemy-threat arithmetic.
- [ ] Step 5: Implement the neutral monster registry. Keep visual identity, archetype, and element as separate fields. Allow wave entries to select the element; the registry must not force a permanent elemental gameplay value.
- [ ] Step 6: Run focused tests and npm run typecheck.
- [ ] Step 7: Commit with message feat: add elemental combat contracts.

### Task 3: Deliver the twelve silhouettes and nameless presentation

**Owner:** Tilesmith, then Loomwright integrates the approved assets.

**Files:**
- Add: twelve approved regular monster sprite files under public/assets/
- Add: one approved boss sprite file under public/assets/
- Modify: src/systems/characterArt.ts, src/systems/characterArt.test.ts, src/entities/Enemy.ts, src/systems/enemyStatusOverlay.ts, src/systems/enemyStatusOverlay.test.ts, src/systems/debuffDisplay.ts, src/systems/debuffDisplay.test.ts
- Modify: src/scenes/SpellroadScene.ts where it renders monster labels or name-bearing messages
- Modify: docs/agents/tilesmith/tile-legend.md and docs/agents/tilesmith/log.md

**Interfaces:**
- Consumes: Task 2 registry and the CC0/art-sourcing contract.
- Produces: twelve readable visual IDs plus the unique boss ID, each with provenance, sprite URL, palette treatment, and non-color elemental motif metadata.

- [ ] Step 1: Inventory existing CC0 assets and choose twelve silhouettes. Prefer already-committed assets; if new assets are required, record source/license evidence before adding them. Avoid silhouettes whose weapon alone permanently implies melee, ranged, or debuffer.
- [ ] Step 2: Create asset registry tests. Assert every regular ID and the boss has a loadable URL, stable key, neutral outline metadata, and an elemental motif.
- [ ] Step 3: Implement the twelve-ID preload/render lookup. Derive accent color and motif from the wave's explicit element; never make sprite pixel colors the gameplay source of truth.
- [ ] Step 4: Remove player-facing monster identity text. Delete overhead names, archetype labels, and name-bearing debuff/yield messages. Preserve internal IDs only for logs, tests, and developer diagnostics.
- [ ] Step 5: Add accessibility checks. Test normal-size screenshots, grayscale, and color-vision simulations; use dark neutral outlines and distinct shape motifs for fire, ice, lightning, and earth.
- [ ] Step 6: Run focused tests, npm run typecheck, and npm run build.
- [ ] Step 7: Commit with message feat: add elemental monster visuals.

### Task 4: Author progressive waves and the Level 5 final boss

**Owner:** Warden, with Tilesmith's registry and Pato's threat rules.

**Files:**
- Create or modify: src/data/waves/level-1.json, level-2.json, level-3.json, level-4.json, level-5.json
- Modify: src/data/waves/boss-1.json only if its phases are the final Level 5 boss phases
- Modify: src/data/types.ts, src/data/validateContent.ts, src/systems/WaveLoader.ts
- Modify: src/systems/waveThreatBudget.ts, src/systems/waveThreatBudget.test.ts, src/systems/waveEnemyCounts.test.ts

**Interfaces:**
- Consumes: Task 2 registry, Task 3 asset IDs, and elemental-template.md.
- Produces: wave entries shaped as { type: monsterId, archetype, element, count, spawn_delay_ms }, a Level 5 final wave with exactly one boss, and measurable composition-complexity validation.

- [ ] Step 1: Add failing wave-schema tests. Reject missing/invalid elements, unknown IDs, player-facing name fields, invalid archetypes, duplicate boss entries, and a boss appearing outside Level 5's final wave.
- [ ] Step 2: Add failing progression tests. Assert Level 1 Wave 0 remains onboarding; Wave 1 is easier than Wave 2; each level's opening threat rises; Level 5 late waves contain more simultaneous element/archetype combinations than Level 1.
- [ ] Step 3: Add failing fairness tests. Assert every mixed wave has at least one available counter in the default loadout and no wave depends on one mandatory spell. Keep archetype threat calculations independent from elemental spell effectiveness.
- [ ] Step 4: Migrate Level 1 gradually. Keep Wave 0 fire-only onboarding, use a limited visual set, make Wave 1 a controlled increase, and introduce the first debuffer in Wave 2 without stacking every difficulty lever.
- [ ] Step 5: Author Levels 2–4. Introduce ice alone before fire/ice mixtures, earth alone before three-element mixtures, and lightning alone before sustained three-element mixtures. Keep compositions inside Pato's validated bands and preserve relief beats.
- [ ] Step 6: Author Level 5. Use all twelve regular visual IDs across the level, reserve four-element combinations for late waves, and put exactly one distinct boss in the final wave. Give the boss one active element and two explicit resistant elements; the remaining element is neutral.
- [ ] Step 7: Run focused wave tests, npm run typecheck, and npm run build; inspect the JSON diff to confirm no player-facing names remain.
- [ ] Step 8: Commit with message feat: author elemental encounter progression.

### Task 5: Rebalance spells and add elemental tactical effects

**Owner:** Frieren authors; Pato validates.

**Files:**
- Modify: src/data/spells/spells.json
- Modify: src/data/types.ts
- Modify: src/systems/spellCost.test.ts, src/systems/MasterySystem.test.ts, and focused new spell-effect tests
- Append: docs/agents/frieren/log.md, docs/agents/pato/log.md

**Interfaces:**
- Consumes: exact Task 1 elemental template and Task 4 wave assignments.
- Produces: twelve spells whose elements have distinct tactical identities and whose numeric fields pass the existing weight/Mana/Mastery rules.

- [ ] Step 1: Write failing content tests. Assert every spell has one valid element/effect identity, heavy spells are not strictly dominated by standard/light alternatives after matchup scenarios, and effect-bearing spells have bounded duration/target rules.
- [ ] Step 2: Frieren revises the twelve entries. Preserve the existing line/cone/circle shape contract; use the approved fire melee-adjacent, ice weaken, lightning stun, and earth burst identities; state each tradeoff in the agent log.
- [ ] Step 3: Pato validates numeric fields. Check Mana weight class, Mastery discount, damage-per-mana, cooldown, target count, elemental modifiers, and representative favorable/unfavorable matchups. Return pass or exact flagged diffs.
- [ ] Step 4: Update content tests from the validated output. Do not make tests encode rejected values.
- [ ] Step 5: Run spell/content tests and npm run typecheck.
- [ ] Step 6: Commit with message feat: rebalance elemental spell identities.

### Task 6: Integrate damage, effects, and feedback in Phaser

**Owner:** Loomwright, with the Task 5 content contract.

**Files:**
- Modify: src/scenes/SpellroadScene.ts, src/entities/Enemy.ts, src/systems/DebuffSystem.ts
- Create or modify: pure effect modules and adjacent tests
- Modify: src/systems/rangedImpact.ts only if delayed damage needs the same centralized calculation
- Modify: src/systems/validateContent.ts call sites and scene tests as needed

**Interfaces:**
- Consumes: calculateElementalDamage, validated wave entries, spell effects, and existing Enemy HP/Debuff APIs.
- Produces: one runtime damage path for immediate and delayed spell hits, elemental feedback, and no player-facing monster names.

- [ ] Step 1: Write failing integration tests for immediate and delayed hits, AoE target-by-target matching, Mastery ordering, boss resistance, overkill/death-once behavior, and unchanged enemy attack damage.
- [ ] Step 2: Add elemental state to spawned enemies. Pass the explicit wave element through WaveLoader into Enemy; never derive it from the sprite key or archetype.
- [ ] Step 3: Replace inline spell damage arithmetic. Route every player-spell damage callback through calculateElementalDamage; leave enemy melee/ranged callbacks on existing threat numbers.
- [ ] Step 4: Implement the four approved effect behaviors. Keep effects bounded by Task 1's template; do not add a fourth enemy archetype or a new targeting shape.
- [ ] Step 5: Add feedback. Show the element motif/color on the enemy and use matching cast/impact feedback; distinguish advantage, disadvantage, and resistance without text names.
- [ ] Step 6: Run Docker verification using docs/agents/_reference/docker-testing-contract.md: full tests, typecheck, production build, and development server/playtest checks.
- [ ] Step 7: Commit with message feat: integrate elemental enemy combat.

### Task 7: Adversarial review, playtest, and handoff

**Owner:** Heckler reviews; Ana coordinates final status.

**Files:**
- Modify: docs/agents/heckler/log.md, docs/agents/ana/log.md
- Modify: README.md, docs/art-direction/art-board-workflow.md
- Modify: docs/superpowers/specs/2026-08-31-elemental-monster-roster-design.md only for verified clarifications

**Interfaces:**
- Consumes: all previous task artifacts, test/build output, and the live development server.
- Produces: a blocking/non-blocking critique, developer-playtest evidence, workflow documentation, and an accurate Issue #207 status.

- [ ] Step 1: Heckler runs the six-persona review. Check learnability, color-blind access, hidden names, same silhouette with different roles, mixed-element fairness, boss resistance clarity, hard-counter loadouts, and Level 5 complexity.
- [ ] Step 2: Resolve blocking findings. Each fix adds a focused regression test or content validation case before the finding is marked resolved.
- [ ] Step 3: Run the full verification gate: npm test, npm run typecheck, npm run build, refresh the catalogue if assets changed, and live-playtest Level 1 Wave 0/1/2 plus the Level 5 final boss wave.
- [ ] Step 4: Document the operating loop. Explain how agents add/reassign monster IDs and elements, how Pato validates balance, how to run the Art Board, and how to review proposals without auto-writing production files.
- [ ] Step 5: Record status. Ana reports each agent separately as shipped-and-validated, blocked-with-reason, or in-progress-with-owner, including why each gate catches the relevant defect class.
- [ ] Step 6: Commit with message docs: record elemental roster review and playtest.
- [ ] Step 7: Update Issue #207. Replace stale ready-for-human wording with this plan/spec handoff, link both committed files, list the task order and gates, and apply ready-for-agent only after the body contains no unresolved developer decision.

## Execution Order

Tasks 2 and 3 may proceed in parallel after Task 1. Task 4 depends on both. Task 5 may draft in parallel with Task 4 but Pato's final validation consumes authored wave assignments. Task 6 waits for Tasks 2, 4, and 5. Task 7 is final.

## Completion Gate

Issue #207 is ready to close only when all twelve visual IDs and the boss render correctly, no monster names reach player-facing UI, Level 1 Wave 1 is easier than Wave 2, Level 5 uses all four-element combinations in late waves, the boss appears only in the final Level 5 wave with two resistances, the full verification suite passes, and the developer completes the live playtest.
