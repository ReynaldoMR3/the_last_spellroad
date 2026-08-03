# JSON Content Architecture Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce and publish the evidence-backed findings requested by “Audit: does the JSON-content architecture pattern actually hold in the shipped engine code?”

**Architecture:** Trace each authored content family from its JSON file through loading, typing, lookup, and runtime behavior. Separate generic data-driven behavior from extension seams that still require TypeScript changes, and record the result as a durable audit report linked from the Wayfinder ticket and map.

**Tech Stack:** Markdown, Phaser 3, TypeScript, JSON, Vitest, GitHub Issues via `gh`.

## Global Constraints

- This is fact-finding only; do not change runtime behavior.
- Cover spells, waves/enemies, levels, and lore explicitly.
- List both where the pattern holds and where it is bypassed.
- Flag every case where adding content requires an engine code change rather than only a data addition.
- Resolve only this one non-research Wayfinder ticket in this session.

---

### Task 1: Audit and publish the shipped content architecture

**Files:**
- Create: `docs/audits/2026-08-02-json-content-architecture.md`
- Modify: GitHub issue “Audit: does the JSON-content architecture pattern actually hold in the shipped engine code?”
- Modify: GitHub issue “Vertical-slice go-forward plan: atmosphere gap, architecture health, and win/lose compliance”

**Interfaces:**
- Consumes: `src/data/types.ts`, `src/data/spells/spells.json`, `src/data/waves/*.json`, `src/data/enemyRegistry.ts`, `src/entities/SpellCaster.ts`, `src/entities/Enemy.ts`, `src/systems/WaveLoader.ts`, `src/systems/levelArt.ts`, `src/scenes/SpellroadScene.ts`, and `public/assets/levels/*.json`.
- Produces: A report whose findings can directly support the follow-up decision “Decide what to trim/simplify in the methodology docs and agent contracts” only where architecture/process evidence overlaps, and any new architecture decision ticket surfaced by the audit.

- [x] **Step 1: Establish the clean baseline**

Run: `docker exec the_last_spellroad-game-1 npm test`

Expected: all Vitest files pass with zero failures.

- [x] **Step 2: Trace every content family**

Read the files in **Interfaces**, search for content IDs/names and JSON-loading code, and classify each path as generic, closed-enum extensible, registry-backed, or hardcoded.

- [x] **Step 3: Write the findings report**

Create `docs/audits/2026-08-02-json-content-architecture.md` with: executive verdict; scope/method; a holds/bypasses matrix; concrete evidence with file/line pointers; extension-cost scenarios for a spell, wave, enemy type, level, and lore entry; risks; and decision inputs without implementing fixes.

- [x] **Step 4: Verify the repository after the documentation-only change**

Run: `docker exec the_last_spellroad-game-1 npm run typecheck`

Expected: TypeScript exits successfully with no errors.

Run: `docker exec the_last_spellroad-game-1 npm test`

Expected: all Vitest files pass with zero failures.

- [x] **Step 5: Review the work**

Use the requested `/code-review` workflow against the working-tree change. Address any standards or ticket-coverage findings, then rerun `npm run typecheck` and `npm test` if the report changes materially.

- [x] **Step 6: Publish the Wayfinder resolution**

Post a concise resolution comment linking the committed report, close “Audit: does the JSON-content architecture pattern actually hold in the shipped engine code?”, and append a one-line linked gist under **Decisions so far** in “Vertical-slice go-forward plan: atmosphere gap, architecture health, and win/lose compliance.” Add a newly surfaced decision ticket only if the audit makes a precise unanswered decision visible.

- [x] **Step 7: Commit**

Run:

```bash
git add docs/audits/2026-08-02-json-content-architecture.md docs/superpowers/plans/2026-08-02-json-content-architecture-audit.md
git commit -m "docs: audit JSON content architecture"
```
