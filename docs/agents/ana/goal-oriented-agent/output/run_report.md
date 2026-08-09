# Run Report — Goal-Oriented Agent, first real run

**Run date:** 2026-08-09.

## Step 1 — Gaps detected

Cross-referencing `output/gdd_features.json` against `output/codebase_inventory.json` and
`docs/agents/ana/backlog.md`:

1. **"Save Data And Persistence"** (GDD, `## Save Data And Persistence`) —
   `src/systems/SaveSystem.ts` exists and exports `defaultSave`/`hasSave`/`loadSave`/
   `writeSave`, but no other `src_files` entry's name or exported symbols suggest it either,
   and manual inspection confirms `TitleScene.ts` was the only consumer, whose
   `continueGame()` called `loadSave()` and discarded the result. Backlog row
   **1.6** tracks this as `blocked-with-reason`, citing backlog **0.2** as the blocker —
   but row **0.2** itself is `shipped-and-validated` since 2026-08-01. The blocker cleared
   over a week before this run; 1.6's label was stale. Backlog **5.4** ("Save/load QA") is
   `not-started` and depends on 1.6. Backlog **5.8**'s own note discloses "`Continue`
   doesn't yet restore any real state." Three independent backlog rows point at the same
   real, unbuilt wiring. **This is a live gap, regardless of 1.6's stale label.**
2. Reading the same GDD section closely also surfaces two gaps too large for this pass:
   `discoveredSpellIds` and `hierarchyRank` have no owning system anywhere in
   `codebase_inventory.json`'s `src_files` (no exported symbol resembling either concept
   outside `SaveSystem.ts`'s own type definition), and neither does a lore/discovery-flag
   system. Each needs its own feature built before it can be persisted at all — noted for
   a future run, not attempted here.

## Step 2 — Prioritization

Ranking gap #1 (SaveSystem wiring) against the contract's four criteria:

1. **Phase order:** backlog 1.6 sits in Phase 1 (Engine foundation) — the earliest-phase
   real gap found.
2. **Dependency readiness:** 1.6's real blocker (0.2) is resolved; the label just wasn't
   updated. Clear to build now.
3. **Floor vs. stretch:** "Persistent RPG, not a run-reset roguelite" is a headline design
   pillar (Death And Mastery Loss), not a stretch feature — floor scope.
4. **Smallest coherent slice:** the full 1.6 scope (schema v2 for Mastery, discovered
   spells, hierarchy rank, Hexcoin, lore flags, all "written on every state-changing
   event") is large. A smaller, coherent slice exists: the two fields that already have
   live runtime state today (`MasterySystem`, `HexcoinSystem`) plus the checkpoint (level)
   id, disclosing the rest as still-missing rather than half-faking it.

**Pick: wire `SaveSystem` for Mastery tiers, Hexcoin balance, and level checkpoint —
`Continue` restores them, level-start and Mastery tier-up write them.**

Gap #2 (discovered-spells/hierarchy-rank/lore-flags systems) ranks below #1 on criterion 4
alone — each requires inventing a whole subsystem from nothing, not wiring an existing
one, so it fails "smallest coherent slice" outright for a single pass.

## Step 3 — Scope

**In scope:** `masteryBySpell`, `hexcoinBalance`, `checkpointId` (level number) round-trip
through `SaveSystem`; `TitleScene`'s `Continue` actually restores them into a fresh
`SpellroadScene`; a checkpoint write fires on every level-start and every Mastery tier-up.

**Explicitly out of scope, and why:**
- `discoveredSpellIds` — no system anywhere distinguishes "discovered" from "equipped"
  spells today; inventing that distinction is a separate feature, not a wiring task.
- `hierarchyRank` — no system tracks a hierarchy rank at all; same reason.
- `loreFlags` — no lore/discovery-flag system exists yet.
- These three fields are written through as untouched pass-through defaults (via
  `loadSave()` as the write base in `writeCheckpoint()`) so a future pass can populate
  them without a second schema migration.
- Write frequency is checkpoint + tier-up + death, not literally "every state-changing
  event" (e.g. not on every single Hexcoin-earning kill) — chosen to avoid a `localStorage`
  write on every single kill, while still covering the moments state changes in ways worth
  persisting immediately: level advance, a Mastery tier-up, and death (which resets both
  fields).

## Step 4 — Built

- `MasterySystem.exportState()`/`importState()` (`src/systems/MasterySystem.ts`).
- `HexcoinSystem.restoreBalance()` (`src/systems/HexcoinSystem.ts`).
- `SpellroadScene.create(data?: { continueFromSave?: boolean })` restores state and starts
  at the checkpointed level; new `writeCheckpoint()` persists on level-start and Mastery
  tier-up (`src/scenes/SpellroadScene.ts`).
- `TitleScene.continueGame()` passes `{ continueFromSave: true }` instead of discarding
  the loaded save (`src/scenes/TitleScene.ts`).
- New tests: `SaveSystem.test.ts` (6 cases, previously zero coverage),
  `HexcoinSystem.test.ts` (3 cases, previously zero coverage), plus 3 new cases in
  `MasterySystem.test.ts`.

**Verification:** `docker-compose run --rm game npm run typecheck` / `npm test`
(189/189 tests passing across 24 test files, after a final-review fix wave — see below —
added `checkpoint.test.ts` and one more `MasterySystem.test.ts` case; 181/181 across 23
files at this run's first pass) / `npm run build` — all clean.

## Post-run: final whole-branch review found two real bugs, fixed before merge

A final review of the whole branch (all tasks above) found two genuine save-scum bugs in
the scoped slice, beyond what any single task's own review could see:

1. **Hexcoin level-floor ratchet:** `writeCheckpoint()` wrote `hexcoinBalance` from both the
   level-start site (a genuine floor) and the Mastery tier-up site (a mid-level balance,
   not a floor). Continuing from a tier-up-triggered save let that mid-level balance become
   the new floor, letting a player ratchet the floor upward indefinitely across quit/continue
   cycles — undermining the Hexcoin fee economy this same backlog phase built.
2. **Death penalty unpersisted:** `handleDeath()` applied Mastery-tier loss and Hexcoin
   rollback but never wrote a checkpoint, so quitting right after death and continuing
   restored the pre-death state — a full escape hatch from the very "Death And Mastery Loss"
   pillar this backlog pick was justified against.

Both are fixed: the tier-up checkpoint no longer overwrites the saved Hexcoin balance, and
`handleDeath()` now writes a checkpoint after its rollback. The composition logic itself was
extracted into a small, tested pure module (`src/systems/checkpoint.ts`,
`composeCheckpointBlob`/`resolveStartWaveIndex`) so this class of bug has regression coverage
going forward. Also fixed in the same pass: a stale disclosure in backlog row 5.8 (this same
"catches stale labels" run had itself left one behind), a scanner blind spot (Phase 0 backlog
rows like `0.2` aren't visible to `scan_codebase.py`'s table-row parser — now disclosed in
`README.md`), and several minor accuracy/hygiene items. Full detail: see Loomwright's log,
below.

**Playtest:** All 4 checks were confirmed against real post-condition state (`localStorage`
contents, live scene fields, and screenshots); no check was skipped or fabricated. Checks 1
(Title shows only "New Game" pre-save) and 3 (Title shows "Continue" after a save exists)
were fully organic — no debug hook needed. Checks 2 (reaching Level 2's first wave writes
`checkpointId: "2"`) and 4 (`Continue` restores Mastery/Hexcoin state into the HUD) exercised
the same real code paths a click/keypress would call, but required a disclosed, fully-reverted
debug hook (`scene['startWave'](3)` to jump levels, plus direct state seeding via
`hexcoin.earn(7)`/`mastery.recordLandedCast('arc_lance')`) to get past this sandbox's
`document.visibilityState: "hidden"`, which freezes Phaser's render/input loop — a known,
repeatedly-documented limitation in this repo's own history (`docs/agents/loomwright/log.md`,
entries dated 2026-07-23, 2026-08-03, 2026-08-06, 2026-08-07, 2026-08-09), not a defect in
Tasks 5-8's SaveSystem wiring.

## Step 5 — Backlog updated

`docs/agents/ana/backlog.md` row **1.6** moved from `blocked-with-reason` to
`in-progress-with-owner`, its stale blocker-label corrected, and the remaining
discovered-spells/hierarchy-rank/lore-flags gap named explicitly for a future run.
