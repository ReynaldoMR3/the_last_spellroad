# Save/Load Wiring — Persistent Progress, Resume, and Reset Notice

**Status:** Approved by existing developer-owned contracts; autonomous implementation authorized under the active Ana goal.
**Owner:** Loomwright (Ana orchestrating).
**Issue:** #144.

## Approved sources

This design does not add product behavior. It connects decisions already approved in:

- the GDD's **Save Data And Persistence** section: one versioned `localStorage` blob, autosaved on every state-changing event, loaded on Continue, with a clean reset and one-time notice on schema mismatch;
- the GDD's **Checkpoint granularity** decision: Continue resumes from the first wave of the current level, and Hexcoin keeps both its current balance and the level-start rollback floor;
- `2026-08-01-boot-title-pause-screens-design.md`: New Game clears the current mage after confirmation; Continue loads it; no save slots or account/cloud system;
- backlog 1.6 and 5.4: every persistent field must survive refresh and malformed/schema-mismatched data must clean-reset visibly.

The active goal says the developer is unavailable and authorizes routine technical decisions. Those approved sources therefore stand in for a new approval round; no unresolved taste or mechanic choice is made here.

## Correction to #144

The ticket's first draft said progress should be written only at level checkpoints. That contradicts the GDD's explicit “written on every state-changing event” rule. The implementation follows the GDD: save after Mastery progress/tier changes, Hexcoin earnings/spending/rollback, and checkpoint changes. It does not write every frame.

## Approaches considered

### 1. Scene payload plus a deep persistent-progress module — selected

`TitleScene` decides only New Game versus Continue. Continue loads once and passes a typed start payload into `SpellroadScene`; New Game clears storage and passes a new-game payload. A pure `gameProgress` module converts that payload plus the current spell/wave catalogs into runtime initialization and converts runtime snapshots back into a `SaveBlob`. `SaveSystem` owns schema validation and the `localStorage` adapter.

This keeps the interface small, makes conversion testable without Phaser, and prevents `TitleScene` from knowing Mastery/Hexcoin internals.

### 2. Global progress singleton — rejected

A singleton would let scenes read shared state without a payload, but it creates hidden ordering, retains state across scene restarts, and repeats the stale-scene-state class that already caused backlog 2.40. Tests would need reset hooks that production never uses.

### 3. Checkpoint-only writes — rejected

This is simpler and reduces write frequency, but it directly violates the authoritative GDD and loses Mastery/Hexcoin changes after a refresh. It was the erroneous sentence in #144, not an approved scope cut.

## Module design

### `SaveSystem` — storage and schema module

Interface:

- `loadSave(storage?) -> SaveLoadResult`
- `writeSave(blob, storage?)`
- `clearSave(storage?)`
- `hasSave(storage?)`

`SaveLoadResult` is one of `loaded`, `missing`, or `reset`. `reset` carries `malformed` or `schema-mismatch` so gameplay can show the required one-time notice. Loading validates the complete shape instead of casting arbitrary JSON to `SaveBlob`.

Schema version becomes 2 and adds `hexcoinLevelStartBalance`. Version 1 clean-resets by design; there is no migration for a pre-release vertical slice.

### `gameProgress` — pure conversion module

Interface:

- `prepareGameProgress(startData, spellIds, waves) -> PreparedGameProgress`
- `buildSaveBlob(metadata, masteryState, hexcoinState, checkpointLevel) -> SaveBlob`

It owns catalog reconciliation, checkpoint-to-wave resolution, default new-game progress, reset fallback, and preservation of fields that do not yet have runtime mutation systems (`hierarchyRank`, `loreFlags`). Unknown removed spell IDs are ignored at runtime and omitted on the next write. A new game treats every currently shipped spell as discovered because the current build already exposes the full catalog and has no discovery mechanic yet; default hotbar selection remains data-driven and is filtered to discovered spells.

### Runtime systems

`MasterySystem` gains constructor hydration and `snapshot()`. `HexcoinSystem` gains constructor hydration and `snapshot()` for current balance plus the level-start rollback floor. Boss-fight transient state and recovery count are not persistent; Continue restarts at the level checkpoint, not mid-fight.

## Data flow

### New Game

1. `TitleScene` clears `spellroad-save`.
2. It starts `SpellroadScene` with `{ mode: "new" }`.
3. `prepareGameProgress` creates novice Mastery for every current spell, all current spell IDs as discovered, rank 0, no lore flags, zero Hexcoin, and Level 1.
4. Starting Level 1 marks the Hexcoin floor and immediately writes schema v2.

### Continue

1. `TitleScene` calls `loadSave()` once and passes the result to `SpellroadScene`.
2. `prepareGameProgress` reconciles the saved spell IDs with the current catalog and resolves `checkpointId` to the first wave of that level.
3. `SpellroadScene` hydrates Mastery and Hexcoin before constructing `SpellCaster`, filters the default hotbar to discovered spells, and starts at the resolved wave.
4. A reset result starts fresh and shows one one-time gameplay notice after HUD creation.

### Autosave

`SpellroadScene.persistProgress()` is called after these atomic gameplay mutations:

- a kill batch changes Hexcoin and possibly Mastery;
- yielding Debuffers change Hexcoin;
- a phase-recovery purchase spends Hexcoin;
- death changes Mastery and rolls Hexcoin back;
- first entry into a new level changes the checkpoint and Hexcoin floor.

One cast that kills multiple enemies writes once after the batch, not once per enemy. No frame/update-loop writes occur.

## Error handling

- Missing save: new-game defaults, no reset notice.
- Invalid JSON or invalid field shape: remove blob, new-game defaults, one-time “unreadable save reset” notice.
- Schema mismatch: remove blob, new-game defaults, one-time “incompatible save reset” notice.
- Unknown checkpoint: fall back to Level 1 and rewrite a valid checkpoint on the initial level-start save.
- Unknown removed spell IDs: ignore safely; current catalog remains authoritative.

## Known residual: checkpoint replay farming

The approved contracts save permanent Mastery/Hexcoin changes on every event but resume at a level-start checkpoint without saving enemy/wave microstate. A player can therefore quit and Continue to replay the level while retaining autosaved progress. Repeated-death Mastery grinding is already disclosed in `MasterySystem.ts`, but quitting avoids its death penalty and is a sharper case. Fixing it would require a new product decision (save encounter microstate, roll back which permanent fields, or add a quit cost), so it will be filed separately and not silently redesigned inside #144.

## Validation

- Unit tests at the `SaveSystem` interface cover write/load, clear, malformed JSON, invalid shape, and schema mismatch.
- Unit tests at the `gameProgress` interface cover new game, valid Continue, reset notice, catalog reconciliation, unknown checkpoint fallback, and lossless rebuild of persistent metadata.
- Runtime-system tests cover Mastery and Hexcoin hydration/snapshot round trips.
- Full Vitest, TypeScript, and Vite build must pass.
- Live browser smoke seeds a schema-v2 save, selects Continue, and verifies restored level, Hexcoin, Mastery, and discovered-spell hotbar eligibility; malformed and old-schema blobs must visibly reset once.

The automated gates catch schema/conversion/hydration defects; the live gate catches the Phaser scene-payload, Title navigation, `localStorage`, HUD-notice, and actual resume wiring that pure tests cannot exercise.
