# Loomwright — Engine Log

Append-only, dated, one entry per engine feature shipped and its playtest result.

## 2026-07-21

Context store established. No engine features logged yet.

## 2026-07-23 — First engine build: combat/enemy foundation, HP/Mana/Mastery/Hexcoin/Debuff runtime, 3 AoE shapes (backlog Tasks 1.1-1.5, 2.3)

First real engine code in the repo beyond movement — `src/` previously contained only `main.ts`, `SpellroadScene.ts` (movement-only), and `styles.css`. Built against the 2026-07-23 engine-contract scope extension (runtime execution of Pato's HP/Mana/Mastery/Hexcoin/Debuff mechanics is now explicitly in scope, per backlog item 0.1).

**Systems built**, each a standalone class reading Pato's already-finalized numbers, never inventing its own:
- `HealthSystem` — 100 HP pool, no in-combat regen (matches `hp-template.md` exactly), death callback at 0.
- `ManaSystem` — 100 pool, 5/sec regen (accepts a caller-supplied drained rate for Debuffer interaction), the three weight-class cost/cooldown pairs, 10% Master discount.
- `MasterySystem` — 3-tier scaling identical for every spell, Novice-floor-excluded random death penalty (mastery-template.md's resolved rule). One placeholder left explicit in code and comments: landed-casts-per-tier growth rate (backlog item 0.4) — not guessed, flagged `TODO(Pato, backlog 0.4)` directly in `MasterySystem.ts`.
- `HexcoinSystem` — 1/kill, expedition-scoped, both fees (100 flat / 30 flat), and critically the fight-start balance snapshot `hp-template.md`'s "Mid-fight-kill freeze" section calls out by name as my responsibility ("Loomwright: snapshot the eligible balance the instant the boss encounter starts...") — implemented as `startBossFight()`/`usePhaseRecovery()`, not yet exercised end-to-end since no boss encounter is wired into a scene yet (that's Phase 3).
- `DebuffSystem` — additive speed/Mana-regen drain, hard-capped at 2 applications each, regen floor enforced.
- `SaveSystem` — versioned localStorage blob, clean-reset on schema mismatch. **Built but not wired into the scene** — no `loadSave`/`writeSave` call exists in `SpellroadScene` yet. This is deliberate, not an oversight: checkpoint/respawn placement policy (backlog item 0.2) is still an open developer decision, and wiring persistence before that's settled would mean guessing what "reaching a checkpoint" even means yet.

**Enemy archetypes** (`Enemy.ts`): Melee/Ranged/Debuffer, each with real per-hit damage from `hp-template.md` and simple but real movement AI (melee closes to contact range and attacks on a cooldown; ranged/debuffer hold a preferred distance band and fire/pulse on their own cooldowns). Enemy-side HP values are explicitly flagged in code as engine-testing placeholders — no template defines a base enemy-HP number yet (the same gap Warden's own log already surfaced).

**3 AoE shapes** (`SpellCaster.ts`): line (rotated-rectangle hit-test), cone (angular-sector hit-test), circle (placed-circle hit-test, centered on the confirmed preview point rather than the caster, clamped to a max placement range). Preview-and-confirm casting wired into `SpellroadScene`: hotkey previews, left-click or same hotkey confirms, right-click/Esc cancels — matching `engine-contract.md` exactly. Wired against Frieren's 3 spells (`arc_lance`/line, `flame_sweep`/cone, `frost_nova`/circle) once Pato cleared them.

**Playtest result, disclosed honestly:** the developer's own automated browser-pane environment for this session had a hard limitation — `document.visibilityState` reported `"hidden"` and keyboard input never reached the page at all (confirmed via a raw `window.addEventListener('keydown', ...)` probe that never fired across many attempts, while a matching `pointerdown` probe did fire once mouse-click coordinate scaling was corrected). This meant hotbar spell selection and the click-confirm cast flow could not be exercised interactively this session — verified by code/geometry review and a clean `tsc --noEmit` + `vite build` instead. What WAS verified live, via the passive combat loop needing no input at all: enemy AI movement and exact 7-damage Melee contact hits, wave spawn/sequencing across multiple staggered waves, the HP-to-zero death trigger, and the Novice-floor death-penalty exclusion firing exactly as designed (`"Died — no Mastery lost (all Novice)"`, since no cast had landed yet to raise any spell above Novice). Debug scaffolding used to diagnose the input gap (console probes, a temporarily-shortened enemy spawn distance, `disableVisibilityChange`/`forceSetTimeOut` Phaser config overrides) was fully reverted before this commit — none of it belongs in the shipped config.

**Status: `in-progress-with-owner` (owner: Loomwright/developer)**, not `shipped-and-validated` — the interactive cast/hit/kill/Mastery-tier-up/Hexcoin-earn path specifically needs a real developer playtest (a real keyboard, not this session's sandboxed pane) before it can be marked validated, per my own success criterion ("validated by the human developer actually running the game"). Everything confirmed passively (death/respawn/Mastery-floor/enemy-AI/wave-sequencing) is solid; the cast-and-hit path is implemented and typechecked but not yet human-verified.

## 2026-07-23 (2) — Two Heckler-found bugs fixed; one live mouse-only cast confirmed

Heckler's critique of the above build (`docs/agents/heckler/log.md`, 2026-07-23 (2)) found two real, confirmed code bugs by reading the source, not by guessing:

1. **HP not reset per wave.** `startWave()` never called `this.health.reset()` — only `handleDeath()` did. Fixed: `startWave()` now calls `this.health.reset()` and `this.debuff.clear()` at the top, matching `hp-template.md`'s "full reset to 100 at the start of every wave" exactly, and clearing stale debuff stacks from the previous encounter along with it (a reasonable extension of the same reset, not separately template-specified).
2. **Master-tier discount double-dip.** `tryCast` applied the -10% to both cost and cooldown at once; the templates specify a per-spell choice of one or the other. Fixed by adding `master_discount: "cost" | "cooldown"` to `SpellDefinition`, removing the `costCooldownMultiplier` field from `MasterySystem.getScaling()` entirely (the field itself was the trap — deleting it beats special-casing around it), and having `SpellCaster.tryCast` apply the discount to exactly the field each spell names. Assigned a value to all three shipped spells with stated reasoning (in `docs/data/spells/spells.json` and this entry): `arc_lance` and `frost_nova` lean `cooldown` (reinforcing "fast poke" and cutting the "long exposure after cast" weakness, respectively), `flame_sweep` leans `cost` (sustaining its generalist role across a longer fight).

Both fixes typecheck and build clean.

**Also got one clean, live, human-input-equivalent cast confirmed this session** — using the same `disableVisibilityChange`/`forceSetTimeOut` overrides as before (temporary, reverted), plus a temporary mouse-only bypass of the hotbar-key requirement (since keyboard events still never reached the page in this sandbox): a real `pointerdown` → `confirmCast` → `SpellCaster.tryCast` → hit-test loop ran end to end with no errors, Mana dropped from 100 to 91 (10-cost Light spell minus a fraction of a second's regen), and the arc_lance cooldown ticked down visibly (1.7s → ... → ready) exactly as designed. Repeated attempts to land a confirmed *kill* (to also verify Hexcoin-earn and Mastery-landed-cast in the same pass) ran into this sandbox's independently-flaky click delivery — some clicks never reached Phaser's pointerdown handler at all, for reasons unrelated to game code (a raw `window` listener showed the same intermittent pattern). Not chasing this further; the one clean run already exercises the exact code path the two bugs above lived in, end to end, without error.

All debug scaffolding (console probes, mouse-bypass hack, `disableVisibilityChange`/`forceSetTimeOut`, shortened spawn distance) reverted before commit — confirmed via `grep` across `src/` for leftover TEMP/debug markers, none found.

**Status: still `in-progress-with-owner`**, not upgraded to `shipped-and-validated` — one clean mouse-driven cast and two fixed bugs raise confidence, but a real developer session with a working keyboard (hotbar selection, all 3 shapes, a confirmed kill, a Mastery tier-up, a Hexcoin earn) is still the actual gate, per my own success criterion. This entry narrows what that session needs to check, it doesn't replace it.

## 2026-07-25 — Backlog 2.9/2.10 built, hotbar widened, Level 2/3 wired in; Heckler found two real bugs, both fixed

Developer stepped away for the day and asked Ana to keep the roster producing autonomously, only stopping for a genuine developer-blocker. This entry covers all engine work from that session in one place — it should have been logged incrementally as each piece landed, not batched at the end; noting that gap explicitly since Heckler's own critique pass caught it as a MAJOR finding (missing disclosure, not a code defect).

**2.9 — floating hit-feedback numbers.** `Enemy` gained a `maxHp` field (previously only tracked current `hp`, no denominator for a percentage). `SpellroadScene.spawnDamageNumber` spawns a `-N` text per landed hit, tweened up-and-fade, colored by the target's remaining-HP band (green >80%/yellow 30-80%/red <30%) per the developer's explicit design call.

**2.10 — lane containment, kiting retune, aiming fallback.** Per the Warden/Heckler/Pato consultation (`ana/log.md`, 2026-07-25 (2)):
- Enemies now clamp to the lane rectangle (`Enemy`'s constructor takes the same rect the mage already uses, applied via `body.setBoundsRectangle`), threaded through `WaveLoader.spawnWave`.
- Kiting ranges retuned (Warden's spec, Pato-validated): ranged 220→240, debuffer 200→150, closing an overlapping-preferred-range bug Pato's independent check found in the *old* numbers.
- Wall-slide behavior added: a retreat blocked by the lane bounds now slides perpendicular toward the centerline instead of pinning nose-first. **Heckler found a real sign bug here** — the original fix multiplied the whole perpendicular vector by one fixed per-position scalar, which was correct for left/right wall blocks but could point the y-component *away* from center for top/bottom blocks (concrete counterexample in Heckler's log entry, reproduced and confirmed). Fixed: now picks whichever orientation of the perpendicular actually has a y-component pointing toward center, instead of trusting a fixed formula.
- Shape preview clipped to the lane via one geometry mask (not per-shape clip math); hit-tests need no separate clip since enemies can't exist off-lane.
- Aiming falls back to last-move-direction at a fixed default distance until the pointer moves. **Heckler found a second real bug**: the first version used a permanent one-way boolean (`pointerHasMoved`), which incidental trackpad jitter would flip true immediately and never release — defeating the fallback for exactly the player it was built for. Fixed: a pointermove event only counts if it clears a small pixel-distance threshold (filters jitter, still catches real intentional movement instantly).

**Hotbar widened 3→6** to match the GDD's spec'd 1-6 (was still sized for when the spellbook had 3 spells; Frieren's 9 new ones this session would otherwise have been unreachable). **Heckler found a third real bug**: the first default loadout was `slice(0, 6)` on file order, which happened to orphan all 3 Heavy spells and 2 of 3 Standard ones — exactly the spells Level 2/3's escalation assumes are available. Fixed: a curated `DEFAULT_LOADOUT_IDS` list, 2 per weight class. Full loadout-selection UI (player picks which known spells fill the hotbar, swappable between expeditions) remains explicitly future work per the GDD, unchanged by this fix. Also corrected `handleDeath`'s Mastery-penalty roll to scope to equipped spells only, not the full 12-spell book (it silently used to use all of them, back when equipped==all).

**Level 2/3 wired into the actual playable sequence.** Warden's new wave batches (backlog 3.3) previously would have just been unused JSON — `SpellroadScene` now preloads and concatenates all 3 levels' wave data so the game progresses past Level 1 instead of stopping there, with a `Level N` flash at each level's first wave.

**Mastery growth rate (0.4) wired, then re-wired after a real arithmetic bug.** Pato's first sizing (20 casts/tier) assumed 1 landed cast ≈ 1 kill; Heckler recomputed against Level 2's actual composition and found a single Novice-tier spell spammed could hit 104 achievable casts in that level alone — 2.6x the number needed for full Mastery, reproducing the exact failure mode the sizing was supposed to prevent. Pato re-derived correctly (casts-to-kill = `ceil(enemyHP/power)`, worst-case against the kit's weakest spell, accounting for Mastery's own power step-up mid-grind) and landed on 180 casts/tier. Wired into `MasterySystem.ts`, replacing the incorrect 20.

**New tracked gap, not fixed here:** while verifying Pato's corrected number, found that `recordLandedCast` fires on any successful hit, not a kill — so a player who deliberately keeps landing non-lethal hits on one enemy isn't bounded by level content at all, only by real time. No finite per-tier number closes this on its own; it's a mechanic question (e.g., gate progress on kills instead of hits), not a resize, so it's logged in `MasterySystem.ts` and left for Phase 5's adversarial QA rather than redesigned unilaterally mid-session.

**Self-verify:** `docker-compose run --rm game npm run typecheck` and `npm run build` both clean after every change in this entry, including the three Heckler-driven fixes.

**Status:** 2.9 `in-progress-with-owner` (built, self-verified, awaiting developer visual confirmation). 2.10 `shipped-and-validated` for the engine mechanism (containment, retune, wall-slide, aiming fallback, all Heckler-flagged bugs fixed and re-verified) — still awaiting a developer feel-check, same distinction as always between self-verify and human playtest. Hotbar/loadout fix and Level 2/3 wiring: `shipped-and-validated`, self-verified, no human-only gate applies (mechanical/data wiring, not a feel judgment).

## 2026-07-27 — Mana not refilling on death (backlog 2.12): `ManaSystem.reset()` added

Developer playtest (via `docker-compose up -d game`) surfaced that death respawned the mage with full HP but whatever Mana was left at time of death — `handleDeath()` called `health.reset()` but had no equivalent for Mana, which isn't the same class (`ManaSystem` had no `reset()` at all, unlike `HealthSystem`). Checked the GDD before treating this as a bug: it only specifies HP resets in full on respawn, says nothing about Mana either way, so this was a real undecided gap, routed to the developer rather than guessed. Developer's call: mirror HP, full refill.

Added `ManaSystem.reset()` (sets `mana = MAX_MANA`, same shape as `HealthSystem.reset()`) and call it in `handleDeath()` right alongside `health.reset()`. One-line addition plus one call site — no other system touches Mana on death. `docker-compose run --rm game npm run typecheck` and `npm run build` both clean.

**Status:** `in-progress-with-owner` — self-verified, awaiting the developer's confirmation it feels right in the live session that found the gap. Branch: `loomwright-mana-death-reset` (off `main`).

## 2026-07-27 (2) — Mini-boss engine wiring (backlog 3.4/3.8): boss phase sequencing + Phase-Transition Recovery choice

Ana traced down that the mini-boss content (Warden's 2026-07-21 composition, Pato-validated twice) had never actually been committed to a `wave.json`-equivalent file or wired into the engine — this entry is the engine half only; the content reconstruction into `src/data/waves/boss-1.json` is Ana's/Warden's, logged in their own files.

**Schema:** `WaveDefinition` gained `is_boss?: boolean` (`src/data/types.ts`) so a boss phase can be distinguished from a regular wave without a second parallel data path.

**`SpellroadScene.startWave`:** branches on `wave.is_boss`. Phase 0 of a boss: computes `bossMaxRecoveries = Math.min(totalPhases - 2, MAX_RECOVERIES_HARD_CAP)` (totalPhases counted directly off `this.waves`, not hardcoded), calls `hexcoin.startBossFight()`, and does the one HP reset for the whole fight. Later phases (`wave_index > 0`) skip the HP reset entirely — hp-template.md's damage-threat budget is cumulative across phases, which is the actual reason Phase-Transition Recovery exists; resetting HP per phase would make the fee-gated recovery meaningless.

**`updateEnemies`'s advance logic:** now checks whether the next wave is another phase of the same boss (`next.is_boss && next.level === wave.level`) before auto-advancing. If so, calls the new `startPhaseBreak(nextIndex)` instead. If the boss's last phase just cleared, calls `hexcoin.endBossFight()` and flashes a victory message before falling through to the normal advance.

**`startPhaseBreak`:** flashes the Y/N choice (`FEE_PHASE_RECOVERY` Hexcoin -> `PHASE_RECOVERY_HP_FRACTION` of MAX_HP, or decline), registers one-shot `keydown-Y`/`keydown-N` listeners, resolves by calling `hexcoin.usePhaseRecovery(bossMaxRecoveries)` + `health.restore(...)` on accept, then proceeds to the next phase either way. Guards against double-resolution (`awaitingPhaseChoice` flag) and against the advance-loop re-triggering while the choice is pending (reuses the existing `enemiesRemainingToSpawn = -1` guard pattern from the regular-wave code).

**`handleDeath`:** added `hexcoin.endBossFight()` and clearing `awaitingPhaseChoice` — a mid-fight death shouldn't leave a stale frozen-Hexcoin-snapshot state behind; the next attempt at the boss calls `startBossFight()` again and takes a fresh one regardless, but leaving the old state dangling was sloppy, not necessary to leave as-is.

**Self-verify:** `docker-compose run --rm game npm run typecheck` and `npm run build` both clean. Dev server restarted so the new preload'd `boss-1.json` and the new logic are actually being served, not relying on HMR picking up a brand-new file.

**Not yet verified live:** the actual phase-break prompt, the recovery purchase, and the boss's overall feel/difficulty — self-verify covers compile/build correctness only, same distinction as every other engine entry in this log.

**Status:** `in-progress-with-owner` — self-verified, awaiting developer playtest of the actual boss fight.

## 2026-07-27 (3) — Combat telegraph (backlog 2.13) + hotbar spell-tag clarity (2.14)

Developer feedback traced to two concrete gaps in existing code, not new mechanics:

**2.13:** `EnemyCallbacks.onRangedFire` was already typed to pass `(fromX, fromY, toX, toY)` and `Enemy.update` already called it with real coordinates — `SpellroadScene`'s own callback wiring just threw all four away and only ran the delayed-damage timer. Fixed by actually drawing something with them: `spawnRangedProjectile` tweens a small circle from shooter to target over the existing `RANGED_TRAVEL_MS`, so the damage delay the code already had is now also the player's visible dodge window, instead of two disconnected things (an invisible timer and, separately, HP dropping). `spawnDebuffPulse` adds a fading ring at the Debuffer on pulse — previously the only Debuffer feedback loop was the mage's own stat drain, with nothing marking the moment it happened.

**2.14:** hotbar HUD line (`updateHud`) now appends `[shape/weight]` next to each equipped spell's id. Spell ids (`arc_lance`, `magma_lance`, etc.) carry no hint of their shape or weight class today — this is the smallest real improvement available without a bigger tooltip/icon system, which is out of scope for this entry.

**Self-verify:** `docker-compose run --rm game npm run typecheck` and `npm run build` both clean. Dev server restarted.

**Not yet developer-confirmed:** whether the projectile telegraph is visible/legible enough in actual play, and whether it (plus the hotbar tag) is enough to clear Level 1 Wave 1 — that wave's own numbers weren't touched, since retuning it before ruling out the telegraph gap as the real cause would be guessing at a second fix on top of an unconfirmed first one.

## 2026-08-01 — Further `ROAD_HEIGHT` widen + first test runner (backlog 2.21 / issue #20)

Developer's "both" resolution to 2.21 (see `ana/log.md`): an onboarding exception on Level 1 Wave 0 (Warden/Pato's half, see their logs) plus a further lane widen (this half).

**`ROAD_HEIGHT` 220 -> 280**, `ROAD_TOP` recomputed 160 -> 130 to keep the same y=270 midline — identical convention to 2.17's own 160->220 pass, single commented constant edit, same file/location. Chose 280 (not a larger jump) as a middle step: large enough to be felt as a real second widen after 220 wasn't enough, not so large it starts crowding the fixed-position HUD text below the lane (`hotbarText` already tracks `ROAD_TOP + ROAD_HEIGHT` dynamically, so it moved down automatically with no separate edit needed). **No change** to `RANGED_PREFERRED_RANGE`/`DEBUFFER_PREFERRED_RANGE`/`WALL_SLIDE_MARGIN` (`Enemy.ts`) — these are retreat/kiting-distance preferences, not lane-height-derived, and a taller lane can only reduce how often an enemy reaches the wall-slide margin, never reintroduce the overlapping-band problem 2.10 fixed (same reasoning 2.17 already used, re-verified rather than re-asserted).

**Flagging, not fixing:** `messageText` (the centered flash-message overlay for prompts like the Phase-Transition Recovery choice) sits at a fixed `y=400`, unchanged by this edit. With the lane now extending to y=410 (was y=380), that text now renders close to the bottom rail rather than clearly outside the lane. It was already close before this change (`hotbarText` sits at y=394 today, y=424 after this edit) — not a new collision, but worth a developer look during the retest this ticket asks for anyway. Not touched here since the ticket scopes this to "a single, clearly-commented constant edit," and moving other UI unscoped would be exactly the kind of silent scope creep Ana's dispatch discipline flags elsewhere in this log.

**Also added: Vitest, the repo's first test runner** (`package.json` devDependency + `npm test` script), scoped narrowly to the new `src/systems/waveThreatBudget.ts` pure calculator (see Warden's/Pato's logs) — not a retroactive coverage mandate for existing Phaser-coupled code. `docker-compose run --rm game npm install` picked it up into the shared `spellroad_node_modules` volume; `npm audit` flags dev-only, non-shipped transitive vulnerabilities (`esbuild`/`postcss`, both pulled in via `vite`/`vitest`'s own dependency chain) — dev-server-only exposure, not present in the built static bundle (`dist/`), consistent with this being a dev dependency only.

**Self-verify:** `docker-compose run --rm game npm run typecheck`, `npm run build`, and `npm test` (8/8 passing) all clean. Visual spot-check via the dev server confirms the lane renders visibly taller with no layout break; the sandboxed browser pane's known `document.visibilityState: "hidden"` throttling (documented in this same log's earlier Phase 1 entries) meant I could not force a full interactive Wave 0 clear in that environment — road-width feel and Wave 0 clearability both still need a real developer playtest session, per the ticket's own testing decisions (no test coverage claimed for `ROAD_HEIGHT` itself, by design).

**Status:** both halves of 2.21 built and self-verified; genuinely still needs the developer for the two things no static check can substitute for — does the lane feel right, and is Wave 0 actually clearable now.

## 2026-08-01 (2) — Live monster name+HP-bar overlay (backlog 2.19 / issue #26)

Built so a player/QA can visually confirm a single AoE cast landing on multiple targets at once, instead of only inferring it from the floating damage numbers (backlog 2.9) one enemy at a time.

**Display name:** no lore-name exists per archetype yet — inventing one is explicitly Lorena's job, out of scope here. Used the capitalized archetype string ("Melee"/"Ranged"/"Debuffer") as a placeholder, same "flag the gap, don't guess past it" pattern as the enemy-HP placeholder already in this file.

**TDD seam, following the `waveThreatBudget.ts` precedent (this repo's only other test file):** extracted the actual testable logic into a new pure, Phaser-free module, `src/systems/enemyStatusOverlay.ts` — `archetypeDisplayName` (capitalize), `computeHpFraction` (clamped to [0,1], guards a non-positive `maxHp` and an overkill-negative `hp`), and `computeHpBarColor` (reuses `spawnDamageNumber`'s exact >80%/30-80%/<30% healthy/wounded/critical thresholds, numeric 0xRRGGBB instead of that function's CSS-string form, since this feeds a `Graphics.fillStyle` call not a `Text` style). Wrote `src/systems/enemyStatusOverlay.test.ts` first (confirmed red — `vitest` failed to resolve the not-yet-created module), then implemented the module (green, 6/6 passing, 15/15 total with `waveThreatBudget.test.ts`).

**Phaser wiring, in `Enemy.ts` (no Vitest seam here — canvas rendering, verified via typecheck/build/dev-server instead, per the docker-testing-contract):** each `Enemy` now owns a `nameLabel` (`Text`) and `statusBar` (`Graphics`), created once in the constructor (so a freshly spawned enemy shows full HP immediately, not after its first `update()`) and repositioned/redrawn every frame from a new `refreshStatusOverlay()` private method, called at the top of the existing per-frame `update()`. The bar draws a dark background rect plus a foreground rect scaled by `computeHpFraction(hp, maxHp)` and tinted by `computeHpBarColor`, so a landed cast's `takeDamage()` call (which only mutates `hp`) is picked up and rendered within the next frame with no separate "on damage" event needed.

**Cleanup:** confirmed neither existing despawn path (`SpellroadScene.removeEnemy`'s `enemy.destroy()`, and `handleDeath`'s `this.enemies.forEach((e) => e.destroy())`) does anything beyond calling `Sprite.destroy()` — and confirmed Phaser does *not* cascade-destroy manually-added sibling GameObjects just because the sprite they're following gets destroyed (the label/bar aren't children of the sprite; Arcade Sprites don't support the Container-style parent/child relationship). Overrode `Enemy.destroy(fromScene?)` to destroy `nameLabel` and `statusBar` before calling `super.destroy(fromScene)`, so every current and future despawn call site gets the cleanup for free without needing its own matching edit.

**Self-verify:** `docker-compose run --rm game npm run typecheck`, `npm run build`, and `npm test` (15/15, including the 6 new tests) all clean. Did not bring up an isolated dev-server instance for this entry — port 5173 was already bound by another running `the_last_spellroad-game-1` container from a different session/worktree at the time, and reusing someone else's running container wouldn't have reflected this branch's code; typecheck/build/test already cover this change's only real compile/runtime-shape risk (the `destroy()` override signature, the Graphics/Text API calls), so the substitution doesn't weaken this entry's mechanical self-verify.

**Status:** `in-progress-with-owner` — self-verified per this entry's own gate, not yet developer-confirmed for the thing no static check can substitute for: whether the bars are actually legible in play and visibly update when an AoE lands on multiple enemies at once, per the ticket's own stated purpose.

## 2026-08-01 (3) — Tiled layouts wired into the playable sequence (backlog 3.8 remainder, issue #29)

Tilesmith's #28 (`tilesmith/tiled-layouts-28`, PR #35, itself stacked on #25's curated-tile-IDs
PR #34, neither merged to `main` at write-time) built 5 real Tiled JSON maps at
`public/assets/levels/level-1.json`..`level-5.json` (level 5 = the boss arena) but explicitly
left wiring them into `SpellroadScene.ts` for this ticket — the scene was still drawing the
original placeholder colored rectangles (a flat `ROAD_WIDTH`x`ROAD_HEIGHT` box, two border
lines, tick marks every 60px) across all 5 levels. This entry closes that gap: Tiled layouts now
render, wave/boss sequencing untouched.

**Read before writing any code**, per this ticket's own instructions: all 5 level JSON files
directly (single `Terrain` tile layer each, one embedded tileset `firstgid: 1`, image path
`../third-party/kenney-tiny-dungeon/Tilemap/tilemap_packed.png`, tileset name
`"kenney-tiny-dungeon-tilemap_packed"`, 60x18 tiles for Levels 1-4, 60x20 for the boss arena)
and Tilesmith's newest log entry (2026-08-01, "Backlog 3.7 (issue #28)") for the exact GID/tile
convention and the geometry-mismatch flag it already raised.

**Pure module extracted first, TDD** (`src/systems/levelArt.ts` + `.test.ts`, 7 tests, written
red-then-green against the actual module, same precedent as `waveThreatBudget.ts`/`.test.ts`):
- `levelMapKey(level)` / `levelMapUrl(level)` — level number to Phaser cache key / static URL
  (`assets/levels/level-N.json`), plus `ALL_LEVELS`/`isValidLevel` (1-5, matching every
  `WaveDefinition.level` value that exists today).
- `TILESET_IMAGE_KEY`/`TILESET_IMAGE_URL`/`TILESET_NAME_IN_MAP` — the one shared tileset every
  level references, loaded once regardless of level count.
- `computeTilemapOffset({ canvasWidth, laneCenterY, mapWidthPx, mapHeightPx })` — pure geometry:
  centers a level's Tiled map horizontally on the canvas and vertically on the same lane midline
  (`ROAD_TOP + ROAD_HEIGHT/2`) movement/spawn/preview-clip code already uses, without touching
  that geometry itself. This is the actual reconciliation Tilesmith's log flagged as left to
  this ticket, made unit-testable independent of a running Phaser Scene.

**`SpellroadScene.ts` changes:**
- `preload()`: `this.load.image()` for the shared tileset once, `this.load.tilemapTiledJSON()`
  for all 5 levels — eager-loaded up front, same precedent the existing wave-JSON preloading
  already sets (all level data loaded together, switched between at runtime), not a mid-scene
  `this.load.once('complete', ...)` dance. Justified in-code: 5 files at ~13KB each plus one
  already-committed 5KB PNG, not worth the extra complexity.
- `createRoad()`: dropped the placeholder road-color rect, border lines, and tick marks. Kept
  the one full-canvas dark background rect on purpose — Tilesmith's maps only paint their own
  bordered box, not the surrounding canvas, so something still has to fill outside it.
- New `renderLevelArt(level)`: destroys the previous level's tilemap/layer (if any), then
  `this.make.tilemap({ key })` / `map.addTilesetImage()` / `map.createLayer("Terrain", ...)` per
  `art-sourcing-contract.md`'s documented mechanism, positioned via `computeTilemapOffset`.
  Guarded by a `renderedLevel` field so repeat calls at the same level (e.g. boss phase-breaks,
  which call `startWave` again without changing level) are no-ops.
- Called from the top of `startWave(index)` — the same function that already flashes "Level N"
  at `wave.wave_index === 0` and resets HP per wave/boss-fight-start, so the art swap lands at
  exactly the existing level-transition points (including the death/respawn path, which replays
  from wave 0 and correctly swaps back to Level 1's art if the player died deeper in).
- Explicit `BACKGROUND_DEPTH`/`TILE_LAYER_DEPTH` constants (-100/-50), not left to insertion
  order: the tile layer gets destroyed and recreated *after* the mage/HUD/enemies already exist
  at every level transition, so without an explicit depth a freshly recreated layer would insert
  on top of the display list and render over everything — confirmed this would actually happen
  (Phaser's default same-depth ordering is insertion order) before adding the depth calls, not
  guessed defensively.

**Gameplay-bounds geometry, deliberately untouched:** `LANE_RECT`/`ROAD_WIDTH`/`ROAD_HEIGHT`/
`ROAD_LEFT`/`ROAD_TOP` still drive movement clamping, enemy spawn positioning
(`spawnWave(this, wave, { x: 820, y: 270 }, LANE_RECT, ...)`), and the preview-clip geometry mask
exactly as before — grepped the rest of `src/` to confirm no other file reads these constants,
so nothing needed touching outside `SpellroadScene.ts` itself.

**Geometry-mismatch caveat, flagged rather than silently reconciled:** Tilesmith's maps are
960x288px for Levels 1-4 and 960x320px for the boss arena (whole 16px tile units), while the
live gameplay rect is 780x280px inset within a 960x540 canvas (`ROAD_LEFT=90, ROAD_TOP=130,
ROAD_WIDTH=780, ROAD_HEIGHT=280` — 780/16 and 280/16 aren't whole tile counts). `computeTilemapOffset`
centers each map on the same lane midline and horizontally on the canvas, which gets the art
close (Levels 1-4 land 4px taller/higher than `ROAD_HEIGHT`'s exact box; the boss arena more so,
by design — it's meant to read as a distinct, larger space) but the tile art's own wall-border
tiles do not pixel-align to `LANE_RECT`'s exact clamp boundary. This is a visual approximation,
not a gameplay change — no movement/spawn/hit-test behavior differs from before this ticket.
Whether that's tight enough or needs either the art re-sized in tile units or the gameplay
constants revisited is a developer call, not decided unilaterally here, per this ticket's own
instruction to flag rather than silently change either side to match the other.

**Self-verify:** `docker-compose run --rm game npm run typecheck`, `npm test` (16/16 passing —
9 pre-existing `waveThreatBudget` + 7 new `levelArt`), and `npm run build` all clean. Confirmed
the built `dist/assets/levels/*.json` and `dist/assets/third-party/.../tilemap_packed.png` both
survive the production build (they live under `public/`, same as the tileset PNG already did).
**Dev server not brought up this session** — port 5173 was already bound by another process
(`lsof -i :5173` showed an existing `ssh` listener) at self-verify time, the same known caveat
#26's PR disclosed rather than silently working around; noting it plainly instead of blocking on
it or claiming a live check that didn't happen.

**Not yet developer-confirmed:** whether the 5 levels' art actually reads well in play, whether
the ~4-20px lane/art mismatch above is noticeable/acceptable, and whether the boss arena's
larger, visually distinct sizing lands as intended — same distinction as every other engine
entry in this log between self-verify (compile/build/test correctness) and the human playtest
gate this agent's own success criterion requires.

**Status:** `in-progress-with-owner` — self-verified, awaiting developer visual playtest.
Branch: `loomwright/wire-tiled-layouts-29`, stacked on `tilesmith/tiled-layouts-28` (PR #35),
itself stacked on `tilesmith/curate-tile-ids-25` (PR #34) — neither merged to `main` yet, so
this PR's base is #28's branch, not `main`, keeping the stack in review order (25 -> 28 -> 29).

## 2026-08-02 — Auto-aim: cone-based assisted targeting (backlog 2.22, issue #44)

Built against the approved design doc (`docs/superpowers/specs/2026-08-01-auto-aim-cone-targeting-design.md`, branch `design/auto-aim-cone-targeting`), all 7 decisions there.

**Pure logic** (`src/systems/autoAim.ts`, `autoAim.test.ts`, 7 Vitest cases): `selectAutoAimTarget(candidates, originX, originY, facingX, facingY, coneHalfAngleDeg?)` — nearest candidate within a facing cone (`AUTO_AIM_CONE_HALF_ANGLE_DEG = 82.5`, i.e. a 165° full angle, the middle of the doc's ~150-180° range), falling back to the globally nearest candidate when none qualify; a zero facing vector (e.g. before the mage has ever moved) defaults to +x rather than feeding `atan2(0, 0)` a degenerate case. Same Phaser-free seam convention as `waveThreatBudget.ts`/`enemyStatusOverlay.ts`.

**Scene wiring** (`SpellroadScene.ts`): a new `previewLockedEnemy` field, set once in `handleHotbarPress` when a *new* preview starts (only via the no-mouse fallback path — `pointerHasMoved` gates it exactly like the existing 2.10 fallback, decision 3) and cleared in `cancelPreview`/`confirmCast`. `currentAimPoint()` reads the locked enemy's live position every frame instead of re-selecting, so the preview tracks a moving target without ever swapping it (decision 5) — a shared `livePreviewLockedEnemy()` helper (guards against the enemy having despawned mid-preview via another kill) backs both `currentAimPoint()` and the highlight draw, so there's one liveness check, not two. Because `updatePreview()`'s line/cone/circle branches all derive their geometry from the same `currentAimPoint()` result, the auto-aim point applies uniformly across all 3 shapes with no shape-specific code (decision 4) — same for `confirmCast`'s hit-test. A gold ring (`AUTO_AIM_HIGHLIGHT_COLOR`/`AUTO_AIM_HIGHLIGHT_RADIUS`) highlights the locked enemy on top of the shape preview (decision 6). Target-cycle hotkey and an accessibility toggle are correctly not present (decision 7, explicitly deferred).

**Self-verify:** `docker-compose run --rm game npm run typecheck`, `npm test` (96/96, all suites), and `npm run build` all clean.

**Status:** `in-progress-with-owner` — self-verified only. Per my own success criterion this needs a real developer playtest (dodge-and-cast-back against a live enemy, multiple enemies on screen, an enemy dying mid-preview) before it can move to `shipped-and-validated`; nothing here substitutes for that. Branch: `design/auto-aim-cone-targeting` (already carries the approved design commit; this adds the implementation on top, per Ana's dispatch).

## 2026-08-02 (2) — Fix #47: archer ranged attacks always hit, no position recheck at impact

Root cause, confirmed by reading the code (already diagnosed in the issue and named directly in ADR-0001 as one of the three bugs that shipped through PR #46's clean typecheck/build/96-unit-tests): `SpellroadScene.ts`'s `onRangedFire` scheduled `this.health.applyDamage(ARCHETYPE_DAMAGE.ranged)` unconditionally inside a `this.time.delayedCall(RANGED_TRAVEL_MS, ...)`, with no recheck of the player's actual position at impact time. `spawnRangedProjectile`'s travel tween is (and remains) purely cosmetic — it was never backed by a collision/overlap test, so no amount of movement during the 450ms travel window could ever avoid the hit. This directly broke the game's stated core pillar ("tactical spell combat... over twitch reflexes").

**Fix, scoped to #47 only** (not touching #48's wave/timer race or #49's `pointerHasMoved` — both land on this same branch in separate dispatches):

**Pure logic extracted first, TDD, same seam convention as `autoAim.ts`/`waveThreatBudget.ts`/`enemyStatusOverlay.ts`:** `src/systems/rangedImpact.ts` + `.test.ts`. Wrote the test file first against the not-yet-created module (confirmed red — `vitest` failed to resolve `./rangedImpact`), then implemented `isStillInRangedImpactZone(playerX, playerY, impactX, impactY, hitRadius = RANGED_HIT_RADIUS)`, a plain `Math.hypot` distance check against a hit radius, inclusive at the boundary (green, 6/6 new tests, 35/35 total). `RANGED_HIT_RADIUS = 20` follows the same derivation `Enemy.ts`'s (unexported) `MELEE_RANGE = 34` already uses — mage half-footprint (32x32 sprite, 16px half-width) plus a small buffer — rather than inventing an unrelated convention, per the ticket's own instruction to follow how melee/kiting ranges are already checked in `Enemy.ts`.

**Scene wiring** (`SpellroadScene.ts`'s `onRangedFire` callback, inside `updateEnemies`): the existing `delayedCall(RANGED_TRAVEL_MS, ...)` callback now reads the mage's *live* `x`/`y` at the moment it actually fires (not the snapshot taken at shot-fired time) and calls `isStillInRangedImpactZone(this.mage.x, this.mage.y, toX, toY)` — `toX`/`toY` are the mage's position *when the shot was fired* (already threaded through `EnemyCallbacks.onRangedFire`'s existing signature, unchanged). Damage only applies if the check returns true. Added the same `if (!this.mage) return` guard the rest of `updateEnemies` already uses defensively. No change to `spawnRangedProjectile`'s visual (still cosmetic, still the same tween/timing) — the fix is entirely in whether the already-scheduled damage callback fires, not in the projectile's appearance.

**Why this verification would actually catch a regression of this specific failure mode (per ADR-0001):** the bug's exact shape was "damage applies unconditionally, no live position check at all." `isStillInRangedImpactZone`'s unit tests directly assert both failure directions of that: a player who moved far from the fired-at point returns `false` (the dodge case #47 exists to fix — if a future edit reintroduced unconditional application, or dropped the check, or inverted the comparison, this test fails), and a player who stayed put (or moved only within the hit radius) returns `true` (so a regression that made the check too strict, e.g. always returning false, is equally caught). This is different from PR #46's own gate: the 96 pre-existing unit tests never touched this code path at all — this is the *first* test that exercises the recheck logic itself, not a pre-existing test re-run. Typecheck/build only prove the code compiles and bundles; they say nothing about whether the callback's condition is correct, which is exactly the class of defect ADR-0001 calls out. What this unit test does *not* cover, and what a regression could still slip past: the actual `RANGED_TRAVEL_MS` timer wiring inside live Phaser `delayedCall` scheduling (e.g. if a future edit called `applyDamage` unconditionally *and* the guarded branch elsewhere, or the timer's callback closure captured a stale `toX`/`toY`) — that class of wiring-only regression needs the developer playtest below, same as every other engine entry in this log.

**Self-verify:** `docker-compose run --rm game npm run typecheck`, `npm test` (35/35, including the 6 new `rangedImpact` tests), and `npm run build` all clean.

**Status:** `in-progress-with-owner` — self-verified only, not `shipped-and-validated`. Per my own success criterion, only a real developer playtest (dodge during the archer's travel window and confirm the hit doesn't land) clears that gate — this session's environment is not doing an interactive playtest, so the actual "does dodging now work" question remains open pending that session. Branch: `loomwright/fix-playtest-bugs-47-48-49` (this entry covers #47 only; #48/#49 land as separate dispatches on the same branch).

## 2026-08-02 (3) — Fix #48: wave/timer race, death-restart inheriting the in-flight wave's monster count

Escalated to Opus per Ana's model-selection row ("escalate for one-off architecture calls") — this is a structural timer/state-machine decision, not a routine fix.

**Root cause, confirmed by reading the code — two defects that compound, not one:**

1. **Nothing invalidated a scheduled callback when the world moved on.** All five `delayedCall` sites in the wave path (`updateEnemies`'s 1200ms advance, `handleDeath`'s 1500ms restart, `startPhaseBreak`'s resolution, `onRangedFire`'s 450ms impact, and every per-enemy staggered spawn timer `WaveLoader.spawnWave` queues) were fire-and-forget, and none cancelled any other. A wave-complete advance scheduled just before a delayed ranged hit killed the player still fired at +1200ms, starting the *next* wave 300ms before the death restart replayed the level from wave 1 — and that next wave's spawn timers, plus the dead wave's own not-yet-fired ones, then spawned into the "restarted" wave 1.
2. **The auto-advance trigger was purely numeric, and `handleDeath` reproduces it exactly.** `enemiesRemainingToSpawn === 0 && enemies.length === 0` is precisely the state `handleDeath` creates when it clears the field, which is why the `-1` sentinel guard didn't hold: the sentinel was overwritten with `0` by the death path itself. This means the extra advance wasn't only reachable via the ranged-shot race — **every** death scheduled a bonus advance on the very next frame, and the ranged shot only determined *which* wave's leftovers were still in flight to be inherited. Worth stating plainly because it widens the reproduction: the developer's ranged-death report is one path into a defect that fires on any death.

**Architecture decision: (a) generation/session counter, plus an explicit phase — not (b) timer-handle tracking.** Both were live options in the issue; the deciding argument is what each one costs against the timers the fix *isn't* looking at:

- (b) requires a registry that is simultaneously **complete** (every timer registered, including the ~6-11 handles `spawnWave` creates per wave inside a loop in a different module, which would have to be plumbed back out and stored) and **selective** (cancel the dead wave's timers, *not* the boss phase-break's — the issue names that trap directly, and a blunt `time.removeAllEvents()` would also take out the ranged impact and every cosmetic tween). Both properties have to be re-established by hand at every new call site forever; a future `delayedCall` added by anyone who doesn't know the registry exists is a silent regression, which is exactly how this bug arrived.
- (a) inverts that. The check lives at the point of *use*, not the point of scheduling, so a callback that forgets to ask is the only failure mode, and it's visible in the callback body being reviewed rather than in an unrelated cancellation site. Selectivity is free and automatic: a generation is taken only when the world genuinely changed (a wave started, or the player died), so the phase-break timer keeps working precisely because nothing bumped the counter under it — no "careful not to cancel that one" special case is needed anywhere. It also scales to the per-enemy spawn timers without plumbing handles: `spawnWave` takes one `isStillCurrent: () => boolean` predicate (required, not defaulted, so a new call site must decide) and checks it inside each staggered callback.
- Cost of (a), stated rather than glossed: stale timers still fire and no-op instead of being cancelled, keeping their closures alive for up to ~1.5s. Negligible at this scale, and I'd rather pay it than own a cancellation registry.

The counter alone does **not** fix defect 2, and that's worth being explicit about since the issue framed it as an either/or: the bonus advance is scheduled *after* `handleDeath` bumps, so it carries a current generation and would happily fire. That half needs a state answer, so `WaveSession` carries a `WavePhase` (`idle`/`running`/`advancing`/`awaiting-phase-choice`/`dead`/`complete`) and the advance is gated on `shouldAutoAdvance(phase, remaining, alive)`, which requires `running`. This also let the two parallel ad-hoc flags it replaces — the `enemiesRemainingToSpawn = -1` sentinel and the separate `awaitingPhaseChoice` boolean, which had to be kept in agreement by hand — collapse into one field with one meaning.

**Pure logic first, TDD, same seam convention as `rangedImpact.ts`/`autoAim.ts`/`waveThreatBudget.ts`/`enemyStatusOverlay.ts`:** wrote `src/systems/waveSession.test.ts` against the not-yet-created module (confirmed red — `vitest` failed to resolve `./waveSession`), then implemented `src/systems/waveSession.ts`: the `WaveSession` class (monotonic `generation`; `beginWave()`/`beginDeath()` bump and return a token; `beginAdvance()`/`beginPhaseChoice()`/`markComplete()` change phase without bumping; `isCurrent(token)`) and the pure `shouldAutoAdvance` gate. Green, 14 new tests, 49/49 total.

**Scene/loader wiring:** `SpellroadScene` gained a `session` field (constructed in `create()` with the other run systems). `startWave` takes a generation and threads it into `spawnWave`'s new predicate; the out-of-waves branch calls `markComplete()`. `updateEnemies` calls `shouldAutoAdvance(...)`, then `beginAdvance()` in place of the `-1` sentinel, captures `nextIndex` at schedule time, and guards the 1200ms callback. `startPhaseBreak` captures (does not bump) the generation, uses the phase for its double-resolution guard, and guards its resolution timer. `handleDeath` calls `beginDeath()` as its very first statement — before any state is cleared — and guards its restart timer; `awaitingPhaseChoice` is deleted. `onRangedFire`'s impact timer is generation-tagged too, so a shot in flight across a death can't land on the respawned mage — the same class of bug, reachable from the same playtest, and #47's fix (commit e8eb527, untouched here) is unaffected: the live-position recheck still runs, it just no longer runs at all for a shot whose world is gone. Cosmetic tweens (projectile dot, damage numbers, debuff pulse) are deliberately left unguarded: they self-destroy and touch no game state.

**Why this verification would actually catch a regression of this specific timing-race class (per ADR-0001), and where it can't:** the honest limit first — Vitest here runs no Phaser clock, so **no test in this repo proves anything about real `delayedCall` interleaving**, and I'm not claiming otherwise. What the tests do prove is the part that was actually wrong, which is decision logic, not scheduling. The race's two failure modes are both expressible without a clock and both are asserted directly: (1) `shouldAutoAdvance("dead", 0, 0) === false` — the counters-look-cleared-because-death-cleared-them case, the exact condition that defeated the `-1` sentinel; a future edit that reverts to a numeric-only trigger, or lets `handleDeath` leave the phase `running`, fails that test. (2) A token captured before `beginDeath()` is no longer current, and generations are never reused, asserted over a 10-transition sequence — so an edit that made `beginDeath` non-bumping, or made `beginAdvance` bump (which would wrongly kill the phase-break timer), fails. There's also a test that replays #48's literal timeline in order (clear wave 2 → schedule advance → death → advance token stale → death token current → restart → wave 2's spawn tokens stale), so a regression has to break a test that reads like the bug report. Two guards deliberately cover the *opposite* direction as well, since over-invalidating is the failure mode a cancellation-happy fix would introduce: a phase-break token stays current while nothing else has happened, and `markComplete` doesn't bump. What none of this reaches: whether I tagged every call site correctly (a future sixth `delayedCall` that simply doesn't ask `isCurrent` is invisible to these tests), whether Phaser fires a 1200ms and a 1500ms timer in the order arithmetic says under real frame timing, and whether `handleDeath` is ever re-entered in a way this model doesn't anticipate. Those are wiring and runtime questions, and only the playtest below settles them.

**Self-verify:** `docker-compose run --rm game npm run typecheck`, `npm test` (49/49 — 35 pre-existing plus 14 new `waveSession` tests), and `npm run build` all clean. Docker was available; no host fallback needed.

**Flagging, not fixing (out of #48's scope):** `WaveLoader.spawnWave` `continue`s past an enemy type missing from `ENEMY_REGISTRY`, but `startWave` counts it into `enemiesRemainingToSpawn` — a wave referencing an unknown type would never reach 0 and never advance. No shipped wave data hits this today; noting it rather than widening this change.

**Status:** `in-progress-with-owner` — self-verified only, not `shipped-and-validated`. The gate is a real developer playtest of the exact reproduction: die mid-wave with a ranged shot in flight (Level 1 Wave 2 is where it was found) and confirm the restarted Wave 1 spawns exactly its own 3 enemies and no more. A second pass worth doing in the same session, since this change touches it: clear a boss phase and confirm the Y/N recovery prompt still resolves and advances normally. Branch: `loomwright/fix-playtest-bugs-47-48-49` (this entry covers #48 only; #47 landed in e8eb527, #49 is a separate dispatch after this one).

## 2026-08-02 (4) — Fix #49: auto-aim never re-engages after mouse/trackpad use, even once idle

Root cause, confirmed by reading the code (already diagnosed in the issue, and named directly in ADR-0001 as the third of the three bugs that shipped through PR #46's clean typecheck/build/96-unit-tests): `SpellroadScene.ts` tracked `pointerHasMoved` as a one-way boolean — set `true` on a `pointermove` past the existing `POINTER_JITTER_THRESHOLD_PX` threshold or on `pointerdown`, never reset back to `false` anywhere in the file. It was meant to represent "recent mouse activity" but actually meant "mouse moved at least once this session." Both `currentAimPoint()` and the auto-aim soft-lock decision in `handleHotbarPress` read the flag and permanently deferred to `this.input.activePointer` once tripped, regardless of idle time — exactly the developer's playtest report (aim correctly disengaged on first trackpad touch, then never came back even after the trackpad was left alone).

**Not touched, per the ticket:** the debuffer-invulnerability report flagged in the same issue. Re-read the issue's own reasoning and confirmed it in `Enemy.ts`/`HealthSystem.ts` myself before leaving it alone — no invulnerability flag or archetype-specific damage gate exists anywhere in the hit-apply path; the debuffer just has the highest placeholder HP and kites at the longest preferred range of the three archetypes. Left for the developer to retest once this fix lands, not fixed here.

**Chosen recency window: `POINTER_ACTIVE_WINDOW_MS = 2000` (`src/systems/pointerActivity.ts`).** The ticket asked for a window on the same order of magnitude as this game's own input pacing, not an arbitrary guess. Two independent existing constants converge on the same neighborhood: `ManaSystem.WEIGHT_CLASS`'s player spell cooldowns (light 2000ms / standard 4000ms / heavy 8000ms — the fastest complete aim-cast-recast cycle in the game is exactly 2000ms) and `Enemy.ts`'s `ATTACK_COOLDOWN_MS` (melee 1200ms / ranged 1800ms / debuffer 2500ms). 2000ms sits at the fast end of that ~1.2s-8s band: long enough that a mouse-aiming player's hand going still for one light-spell cooldown cycle doesn't get yanked back to the no-mouse fallback mid-decision, short enough that once the player is genuinely done with the mouse, auto-aim re-engages within about one action beat rather than several — matching "even once idle" rather than trading one permanent-feeling state for a differently-long one.

**Pure logic extracted first, TDD, same seam convention as `rangedImpact.ts`/`autoAim.ts`/`waveSession.ts`/`waveThreatBudget.ts`/`enemyStatusOverlay.ts`:** wrote `src/systems/pointerActivity.test.ts` against the not-yet-created module first — moved the not-yet-written implementation out of the way, confirmed red (`vitest` failed to resolve `./pointerActivity`), then restored it and confirmed green. Implemented `hasRecentPointerActivity(lastMovedAt: number | null, now: number, windowMs = POINTER_ACTIVE_WINDOW_MS): boolean` — `lastMovedAt === null` (pointer never moved this session) is always false regardless of window; otherwise `now - lastMovedAt <= windowMs`, inclusive at the boundary, matching this repo's existing inclusive-range convention (`rangedImpact.ts`'s hit-radius check, `Enemy.ts`'s melee/kiting ranges). 7 new tests, 56/56 total, including one that directly asserts issue #49's exact bug shape: a pointer that moved once, 5 minutes ago, must not still read as active.

**Scene wiring (`SpellroadScene.ts`):** `pointerHasMoved: boolean` replaced with `lastPointerActivityAt: number | null = null`. The `pointermove` handler (past the jitter threshold) and the `pointerdown` left-click handler now record `this.time.now` instead of setting a flag. `currentAimPoint()` and `handleHotbarPress`'s soft-lock decision both call `hasRecentPointerActivity(this.lastPointerActivityAt, this.time.now)` instead of reading the old boolean directly — same two read sites the issue named, no others existed. `POINTER_JITTER_THRESHOLD_PX` (what counts as real movement vs. incidental jitter) is unchanged and untouched — this fix only changes what happens to a qualifying movement afterward (a timestamp that can age out) not what qualifies as movement in the first place. Doc comments on `previewLockedEnemy` and `lastPointerActivityAt` itself updated to match; did not touch #47 (`e8eb527`) or #48 (`223f5fd`)'s own code, confirmed by re-reading `onRangedFire`/`WaveSession` wiring after the edit — neither reads or sets the pointer-activity state.

**Why this verification would actually catch a regression of this specific idle-state class of bug (per ADR-0001), and where it can't:** the bug's exact shape was "a flag that's set but never unset, so elapsed idle time is invisible to the read site." `hasRecentPointerActivity`'s unit tests directly assert the failure mode: a pointer that moved once, long ago, must read as inactive (the 5-minutes-idle case) — a future edit that went back to a sticky boolean, or that compared to a hardcoded `now` instead of the live clock, or that inverted the comparison, fails that test. The boundary tests (exactly at the window, one ms past it) also mean a regression that silently changed the window's semantics (e.g., `<` instead of `<=`, or reading the wrong operand) is caught, not just a total-breakage case. This is different from PR #46's own gate: none of the 96 pre-existing unit tests, nor #47/#48's new ones, ever exercised pointer-recency logic at all — this is the first test that touches this code path, not a pre-existing test re-run. What this unit test does *not* and cannot prove, stated plainly: it says nothing about whether `SpellroadScene`'s actual `pointermove`/`pointerdown` listeners really call `this.time.now` (a wiring mistake — e.g., capturing `Date.now()` instead, or a listener silently unregistered) or about real elapsed wall-clock time during an actual idle period at the keyboard/trackpad. A test using a fake clock proves the decision function is correct; it cannot prove the live Scene reads a live clock at the right two call sites, or that a real human touching a real trackpad and then waiting 2+ seconds actually experiences the transition as intended. That gap is exactly what the developer playtest below exists to close, not something this test suite can substitute for.

**Self-verify:** `docker-compose run --rm game npm run typecheck`, `npm test` (56/56 — 49 pre-existing plus 7 new `pointerActivity` tests), and `npm run build` all clean. Docker was available; no host fallback needed.

**Status:** `in-progress-with-owner` — self-verified only, not `shipped-and-validated`. Per ADR-0001 and this agent's own success criterion, only a real developer playtest clears that gate: touch the trackpad (confirm aim correctly follows the mouse, same as before), then leave it alone past ~2 seconds and confirm auto-aim resumes (cone-targets the nearest enemy in the facing cone again) instead of staying pinned to the last pointer position. Worth doing in the same session per the issue's own note: retest whether the debuffer is actually damageable now that aim can re-engage onto it after it kites out of a stale lock. Branch: `loomwright/fix-playtest-bugs-47-48-49` (this entry covers #49 only; #47 landed in e8eb527, #48 landed in 223f5fd, both untouched by this change).
