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
