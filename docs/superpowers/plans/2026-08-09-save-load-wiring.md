# Save/Load Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make New Game erase persisted progress and Continue restore the mage's approved persistent state at the saved level checkpoint, with event-driven autosaves and visible clean-reset handling.

**Architecture:** `SaveSystem` is the deep storage/schema module over the browser `Storage` seam. A pure `gameProgress` module owns conversion between catalog-aware save data and runtime initialization. `TitleScene` passes one typed start payload; `SpellroadScene` hydrates systems once and writes snapshots only after persistent state changes.

**Tech Stack:** TypeScript 5.5, Phaser 3.90 scene payloads, browser `localStorage`, Vitest 2.1, Docker Compose.

## Global Constraints

- Follow `docs/superpowers/specs/2026-08-09-save-load-wiring-design.md` and GitHub #144.
- Owner is Loomwright; Ana orchestrates and records status.
- Save schema version is 2; old versions clean-reset with a one-time notice, never migrate.
- Autosave after persistent state changes, never in `update()`/every frame.
- Continue starts at the first wave of the saved current level; do not save transient HP, Mana, enemies, cooldowns, boss phase, or sound state.
- Do not resolve #146's quit/Continue replay policy inside this implementation.
- Use Docker Compose for tests/build and preserve the developer-playtest gate.

---

### Task 1: Deepen `SaveSystem` schema and load result

**Files:**
- Create: `src/systems/SaveSystem.test.ts`
- Modify: `src/systems/SaveSystem.ts`

**Interfaces:**
- Produces: `SAVE_SCHEMA_VERSION`, `SaveBlob`, `SaveLoadResult`, `defaultSave`, `hasSave`, `loadSave`, `writeSave`, `clearSave`.
- `SaveLoadResult` is `{ kind: "loaded"; save: SaveBlob } | { kind: "missing"; save: SaveBlob } | { kind: "reset"; reason: "malformed" | "schema-mismatch" | "invalid-shape"; save: SaveBlob }`.

- [x] **Step 1: Write failing storage-interface tests**

Use a small in-memory `Storage` adapter in the test file and assert these literal outcomes:

```ts
it("round-trips a schema-v2 save", () => {
  const storage = new MemoryStorage();
  const save = populatedSave();
  writeSave(save, storage);
  expect(loadSave(storage)).toEqual({ kind: "loaded", save });
});

it("removes malformed JSON and reports a one-time reset reason", () => {
  const storage = new MemoryStorage([["spellroad-save", "{"]]);
  expect(loadSave(storage).kind).toBe("reset");
  expect(storage.getItem("spellroad-save")).toBeNull();
});

it("removes old schema versions instead of migrating", () => {
  const storage = new MemoryStorage([["spellroad-save", JSON.stringify({ ...populatedSave(), schemaVersion: 1 })]]);
  expect(loadSave(storage)).toMatchObject({ kind: "reset", reason: "schema-mismatch" });
});

it("rejects schema-v2 data with an invalid Mastery tier", () => {
  const storage = seeded({ ...populatedSave(), masteryBySpell: { arc_lance: { tier: "legend", landedCasts: 0 } } });
  expect(loadSave(storage)).toMatchObject({ kind: "reset", reason: "invalid-shape" });
});

it("clearSave removes the blob used by hasSave", () => {
  const storage = seeded(populatedSave());
  clearSave(storage);
  expect(hasSave(storage)).toBe(false);
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run: `docker-compose run --rm game npm test -- --run src/systems/SaveSystem.test.ts`

Expected: FAIL because `SaveLoadResult`, schema v2 validation, `hexcoinLevelStartBalance`, and `clearSave` do not exist.

- [x] **Step 3: Implement schema v2 and complete shape validation**

Add `hexcoinLevelStartBalance: number`, export version 2, validate every array/object/number/tier/checkpoint field, remove invalid blobs, and return the discriminated load result. `writeSave` always stamps version 2.

- [x] **Step 4: Run focused tests and verify GREEN**

Run: `docker-compose run --rm game npm test -- --run src/systems/SaveSystem.test.ts`

- [x] **Step 5: Commit**

```bash
git add src/systems/SaveSystem.ts src/systems/SaveSystem.test.ts
git commit -m "Harden versioned save storage"
```

### Task 2: Add Mastery hydration and snapshot

**Files:**
- Modify: `src/systems/MasterySystem.test.ts`
- Modify: `src/systems/MasterySystem.ts`

**Interfaces:**
- Consumes/produces: `Record<string, MasteryState>` through `new MasterySystem(initialState?)` and `snapshot()`.

- [x] **Step 1: Write failing round-trip and defensive-copy tests**

```ts
it("hydrates and snapshots saved Mastery progress", () => {
  const mastery = new MasterySystem({ arc_lance: { tier: "adept", landedCasts: 7 } });
  expect(mastery.getTier("arc_lance")).toBe("adept");
  expect(mastery.snapshot()).toEqual({ arc_lance: { tier: "adept", landedCasts: 7 } });
});

it("does not share mutable state with the loaded save", () => {
  const initial = { arc_lance: { tier: "adept" as const, landedCasts: 7 } };
  const mastery = new MasterySystem(initial);
  mastery.recordLandedCast("arc_lance");
  expect(initial.arc_lance.landedCasts).toBe(7);
});
```

- [x] **Step 2: Run focused test and verify RED**

Run: `docker-compose run --rm game npm test -- --run src/systems/MasterySystem.test.ts`

- [x] **Step 3: Implement constructor hydration and defensive snapshot**

Copy every entry into the private map; `snapshot()` returns fresh entry objects.

- [x] **Step 4: Run focused test and verify GREEN**

- [x] **Step 5: Commit**

```bash
git add src/systems/MasterySystem.ts src/systems/MasterySystem.test.ts
git commit -m "Add Mastery save snapshots"
```

### Task 3: Add Hexcoin hydration and checkpoint-floor snapshot

**Files:**
- Create: `src/systems/HexcoinSystem.test.ts`
- Modify: `src/systems/HexcoinSystem.ts`

**Interfaces:**
- Produces: `HexcoinState { balance: number; levelStartBalance: number }`, constructor hydration, `snapshot()`.

- [x] **Step 1: Write failing runtime round-trip tests**

```ts
it("hydrates current balance and restores the saved level floor on death", () => {
  const hexcoin = new HexcoinSystem({ balance: 47, levelStartBalance: 31 });
  hexcoin.rollbackToLevelStart();
  expect(hexcoin.balance).toBe(31);
});

it("snapshots both current balance and checkpoint floor", () => {
  const hexcoin = new HexcoinSystem({ balance: 47, levelStartBalance: 31 });
  expect(hexcoin.snapshot()).toEqual({ balance: 47, levelStartBalance: 31 });
});
```

- [x] **Step 2: Run focused test and verify RED**

Run: `docker-compose run --rm game npm test -- --run src/systems/HexcoinSystem.test.ts`

- [x] **Step 3: Implement hydration and snapshot without restoring fight-transient state**

Constructor initializes only total/floor. `fightSnapshot` stays `null`; recoveries stay `0`.

- [x] **Step 4: Run focused test and verify GREEN**

- [x] **Step 5: Commit**

```bash
git add src/systems/HexcoinSystem.ts src/systems/HexcoinSystem.test.ts
git commit -m "Persist Hexcoin checkpoint state"
```

### Task 4: Build the pure catalog-aware progress module

**Files:**
- Create: `src/systems/gameProgress.ts`
- Create: `src/systems/gameProgress.test.ts`

**Interfaces:**
- Produces: `SpellroadStartData`, `PreparedGameProgress`, `PersistentMetadata`, `prepareGameProgress`, `buildSaveBlob`.

```ts
export type SpellroadStartData = { mode: "new" } | { mode: "continue"; load: SaveLoadResult };

export interface PreparedGameProgress {
  startWaveIndex: number;
  checkpointLevel: number;
  discoveredSpellIds: string[];
  masteryBySpell: Record<string, MasteryState>;
  hexcoin: HexcoinState;
  metadata: PersistentMetadata;
  resetNotice: string | null;
}
```

- [x] **Step 1: Write failing behavior tests**

Cover with hand-authored fixtures:

- new game: all current spell IDs discovered/novice, wave index 0, zero balances;
- valid Continue: saved Level 3 resolves to its first wave and keeps rank/lore/current balance/floor;
- removed spell IDs disappear from discovered and Mastery state;
- malformed/schema reset produces new-game defaults plus the correct notice;
- unknown checkpoint falls back to wave 0/Level 1;
- `buildSaveBlob` preserves metadata and emits `checkpointId: "level:3"` plus both Hexcoin values.

- [x] **Step 2: Run focused test and verify RED**

Run: `docker-compose run --rm game npm test -- --run src/systems/gameProgress.test.ts`

- [x] **Step 3: Implement the pure conversion interface**

Parse only `level:<positive integer>` checkpoint IDs. Catalog filtering uses a `Set` of current spell IDs. New-game Mastery explicitly contains novice/0 entries for every current spell.

- [x] **Step 4: Run focused test and verify GREEN**

- [x] **Step 5: Commit**

```bash
git add src/systems/gameProgress.ts src/systems/gameProgress.test.ts
git commit -m "Add catalog-aware progress conversion"
```

### Task 5: Pass typed New Game/Continue scene data

**Files:**
- Modify: `src/scenes/TitleScene.ts`

**Interfaces:**
- Consumes: `clearSave`, `loadSave`, `SpellroadStartData`.
- Produces: Phaser `scene.start("SpellroadScene", data)` calls only.

- [x] **Step 1: Add the consumer first without changing persistence internals**

Change `startNewGame` to clear storage and pass `{ mode: "new" }`. Change Continue to pass `{ mode: "continue", load: loadSave() }`. Remove the stale “no-op” comments.

This scene is Phaser wiring with no existing headless scene-test harness; its behavior is covered through the live browser gate in Task 7, while all decision logic remains in tested modules.

- [x] **Step 2: Run typecheck/build**

Run: `docker-compose run --rm game npm run build`

Expected: PASS because the payload is structurally typed at the call site.

- [x] **Step 3: Commit**

```bash
git add src/scenes/TitleScene.ts
git commit -m "Pass save intent from the title scene"
```

### Task 6: Hydrate and autosave gameplay

**Files:**
- Modify: `src/scenes/SpellroadScene.ts`

**Interfaces:**
- Consumes: Task 4's start/prepared types and Task 2/3 snapshots.
- Adds private `persistProgress(): void` as the single scene-side write adapter.

- [x] **Step 1: Change `create` to hydrate before constructing dependent systems**

`create(data: SpellroadStartData = { mode: "new" })` prepares progress after catalogs load, filters the default loadout to discovered IDs, constructs hydrated Mastery/Hexcoin, builds `SpellCaster`, sets `highestLevelReached` so a valid Continue does not overwrite its floor, then starts `prepared.startWaveIndex`.

- [x] **Step 2: Add one `persistProgress` adapter**

It calls `buildSaveBlob` with retained metadata, `mastery.snapshot()`, `hexcoin.snapshot()`, and the current checkpoint level, then `writeSave`.

- [x] **Step 3: Wire autosaves only after atomic persistent mutations**

Add calls after the kill batch, Debuffer-yield batch, successful phase-recovery spend, death penalty plus rollback, and first entry to a new level. Initial New Game/reset reaches the level-entry call and writes its first valid save.

- [x] **Step 4: Show reset notice after `startWave` and HUD creation**

Use the prepared one-time message once; it is not stored back into the save.

- [x] **Step 5: Run the affected and full suites**

Run:

```bash
docker-compose run --rm game npm test -- --run src/systems/SaveSystem.test.ts src/systems/gameProgress.test.ts src/systems/MasterySystem.test.ts src/systems/HexcoinSystem.test.ts
docker-compose run --rm game npm test
docker-compose run --rm game npm run build
```

- [x] **Step 6: Commit**

```bash
git add src/scenes/SpellroadScene.ts
git commit -m "Restore and autosave persistent progress"
```

### Task 7: Live validation, tracker, and canonical logs

**Files:**
- Modify: `docs/agents/ana/backlog.md`
- Modify: `docs/agents/ana/log.md`
- Modify: `docs/agents/loomwright/log.md`

**Interfaces:**
- Consumes: built game at the Docker dev server and GitHub #144/#146.
- Produces: live evidence, one-owner status, and validation rationale.

- [x] **Step 1: Run final automated baseline**

Run full Vitest and production build from a clean tree.

- [x] **Step 2: Run live browser scenarios**

1. New Game creates schema v2 and Title later offers Continue.
2. Seed a valid Level 3 save with non-default Mastery, current/floor Hexcoin, rank/lore, and a discovered-spell subset; Continue starts Level 3 Wave 1 and the hotbar only equips discovered defaults.
3. Earn one kill and inspect `localStorage` for changed Hexcoin/Mastery.
4. Seed malformed JSON, Continue, and observe exactly one reset notice plus a fresh schema-v2 save.
5. Repeat with schema version 1 and observe the incompatible-save notice.

- [x] **Step 3: Update #144 and canonical logs**

Record exact test counts, build result, live observations, branch/commit, #146 residual, and why each gate catches its defect class. Keep #144 open until publication/developer gate; mark `in-progress-with-owner` with exactly one owner, Loomwright.

- [x] **Step 4: Request independent code review and address Critical/Important findings**

- [x] **Step 5: Commit docs and preserve the branch without pushing**

```bash
git add docs/agents/ana/backlog.md docs/agents/ana/log.md docs/agents/loomwright/log.md docs/superpowers/plans/2026-08-09-save-load-wiring.md
git commit -m "Record save-load validation checkpoint"
```
