# Destructible Castle Cover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add level-matched castle pillars that provide temporary cover from spells and ranged projectiles, then become non-blocking rubble when destroyed.

**Architecture:** Pillars are map-authored axis-aligned rectangles with explicit `blocksMovement`, `destructibleCover`, and `coverHp` properties. A pure Phaser-free cover model owns durability and damage rules; the scene creates static Arcade bodies for intact pillars, routes player spell impacts and enemy ranged impacts through the model, and removes the body/blocking state on destruction. Melee attacks do not interact with cover.

**Tech Stack:** TypeScript, Phaser 3.90 Arcade Physics, Tiled JSON, Vitest.

**Spec:** Approved in conversation on 2026-08-23.

## Final playtest outcome

The reusable cover model, Tiled metadata parser, and spell/ranged interception support were
implemented and retained. During the visual checkpoint, the developer rejected the temporary
Level 1 pillar art and requested that those objects be removed from the map. The delivered map
therefore contains no destructible-cover instances; the mechanic remains dormant until a later
map authors an explicitly marked object. Final Level 1 playtesting instead approved the seamless
gray wall panels, solid upper-wall chamber doors, and door-free lower wall.

## Global Constraints

- Spells and ranged projectiles damage pillars; melee attacks do not.
- Intact pillars block movement and ranged line-of-sight/projectile travel.
- Destroyed pillars remain as visual rubble and no longer block movement or projectiles.
- Level 1 uses a warm sandstone/terracotta palette with muted blue-gray accents.
- Use existing CC0 Kenney Tiny Dungeon assets or a documented CC0 derivative; no GraphicRiver assets.
- Preserve current lane bounds, enemy behavior, level dimensions, and gameplay routes.
- Verify with focused red/green tests, the full test suite, typecheck, build, map JSON validation, and a Docker playtest.

---

### Task 1: Add the pure destructible-cover model

**Files:**
- Create: `src/systems/destructibleCover.ts`
- Create: `src/systems/destructibleCover.test.ts`

**Interfaces:**
- `createCoverState(id: string, maxHp: number): CoverState`
- `damageCover(state: CoverState, damage: number, source: "spell" | "ranged" | "melee"): CoverDamageResult`
- `coverBlocksMovement(state: CoverState): boolean`
- `coverBlocksProjectile(state: CoverState): boolean`

- [ ] Write failing tests for initial intact state, spell/ranged damage, melee immunity, clamping, and destruction.
- [ ] Run the focused test and verify it fails because the module is missing.
- [ ] Implement the minimal pure state machine.
- [ ] Run focused tests and verify green.

### Task 2: Wire map-authored pillars into movement and projectile blocking

**Files:**
- Modify: `src/systems/levelArt.ts`
- Modify: `src/systems/levelArt.test.ts`
- Modify: `src/scenes/SpellroadScene.ts`

**Interfaces:**
- Extend Tiled object parsing to recognize `destructibleCover: true` and `coverHp`.
- Keep existing `movementBlockerRectFromTiledObject` behavior for ordinary doors/walls.
- Return cover metadata separately so the scene can create a mutable cover instance.

- [ ] Add failing tests for valid/invalid pillar metadata and world-space offset conversion.
- [ ] Run focused tests and confirm expected failures.
- [ ] Create static bodies for intact pillars and retain references to their cover state, sprite/zone, and collider.
- [ ] Remove or disable the movement collider when a pillar is destroyed while leaving rubble visible.
- [ ] Run focused tests and typecheck.

### Task 3: Route spell and ranged impacts through cover

**Files:**
- Modify: `src/scenes/SpellroadScene.ts`
- Modify: `src/systems/rangedImpact.ts`
- Modify: `src/systems/rangedImpact.test.ts`

- [ ] Add failing tests proving spell/ranged sources can damage cover and melee sources cannot.
- [ ] Check cover before applying enemy ranged damage and before resolving player spell hits behind a pillar.
- [ ] Apply the existing spell power or ranged damage value to cover without changing enemy/player damage templates.
- [ ] Add a small destruction visual state change using the level palette.
- [ ] Run focused tests and verify green.

### Task 4: Author Level 1 pillars and palette evidence

**Files:**
- Modify: `public/assets/levels/level-1.json`
- Modify: `docs/agents/tilesmith/log.md`
- Create or modify: `docs/agents/tilesmith/castle-art-brief.md`

- [ ] Add a small number of symmetric pillar objects away from the spawn and central combat route.
- [ ] Mark each object with `blocksMovement: true`, `destructibleCover: true`, and the agreed `coverHp`.
- [ ] Use a warm Level 1 palette and preserve all existing map dimensions/layers.
- [ ] Validate object geometry and metadata with a JSON check.

### Task 5: Verify Docker playtest

- [ ] Run the full test suite, typecheck, build, and map validation.
- [ ] Build/restart the Docker game from this worktree.
- [ ] Playtest Level 1: move behind a pillar, confirm ranged threats are blocked, damage it with a spell/ranged impact, and confirm it becomes passable/non-blocking after destruction.
- [ ] Report any human-feel limitations explicitly; do not claim the mechanic is balanced without developer playtest.
