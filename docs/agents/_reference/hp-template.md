# HP Template (Pato's authority)

Source of truth: `docs/game/the-last-spellroad-design.md`, "Spam Waves Vs. Tactical Trials" (pacing precedent) and "Death And Mastery Loss" (death-trigger precedent). This file is the first authoritative definition of the mage's HP pool; no prior GDD section fixes these numbers.

- Base HP pool: **100** (parallel structure to the 100-point Mana pool in `mana-template.md`).
- Regen: **none during combat** — unlike Mana's constant 5/sec, HP does not regenerate while a wave or boss/trial encounter is active.
- Reset: **full reset to 100** at the start of every wave and at every expedition/road-segment checkpoint.
- Death trigger: HP reaches 0 → the existing Mastery-tier-loss penalty fires (see `mastery-template.md`); mage respawns at the last road-segment checkpoint with HP reset to 100.

## Wave/Boss Damage-Threat Budget

Cumulative damage a fight is tuned to threaten, as a share of the 100-point pool. Since HP resets each wave, this is a per-encounter budget, not a run-long one.

| Encounter type | Competent play | Careless play |
| --- | --- | --- |
| Regular wave | 10-15% (10-15 HP) | 25-35% (25-35 HP) |
| Boss/trial | 40-60% cumulative (40-60 HP) | 70-90%+ cumulative (70-90+ HP) |

## Enemy Archetype Per-Hit Damage

| Archetype | Per-Hit Damage | % of Pool |
| --- | --- | --- |
| Melee | 7 | 7% |
| Ranged | 4 | 4% |
| Debuffer | 0 (no direct HP damage — see below) | — |

Melee sits at the high end of contact-damage punishment; Ranged sits low but steady, since it's harder to avoid outright. Warden tunes wave composition and hit frequency within these fixed per-hit values to hit the damage-threat budget above — Warden may not invent a different per-hit number.

**Calculator (added 2026-08-01, backlog 2.21 / issue #20):** `src/systems/waveThreatBudget.ts` is a pure, Phaser-free TypeScript reproduction of this section's arithmetic (`computeThreatBudget`) and the standard regular-wave band check (`isWithinBand` against `STANDARD_REGULAR_WAVE_BAND`). Warden and Pato should call this function for every future wave composition instead of hand-deriving `4×Ranged + 1.4×Melee` (competent) / `4×Ranged + 7×Melee` (careless) in a log entry — it's the same formula, just checkable and covered by `waveThreatBudget.test.ts` instead of living only in log prose (see `docs/agents/warden/log.md`'s and `docs/agents/pato/log.md`'s prior hand-arithmetic entries for the gap this closes).

**Level 1 Wave 0 onboarding exception (added 2026-08-01, backlog 2.21 / issue #20):** Level 1's very first wave (`src/data/waves/level-1.json`, `wave_index: 0`) is deliberately sized *below* this section's standard floors on both figures — a first-encounter grace period, not a change to the standard band itself. Composition: Melee=2, Ranged=1 → 6.8% competent / 18% careless. Checked against separate `ONBOARDING_COMPETENT_CEILING`/`ONBOARDING_CARELESS_CEILING` thresholds (`isOnboardingGrace()` in the calculator above requires *both*, corrected 2026-08-01 after a code-review pass found a melee-heavy composition could otherwise clear the competent floor while blowing past even the standard careless ceiling), never against `STANDARD_REGULAR_WAVE_BAND` — this is an explicit, separate floor so no future wave can silently inherit it. **No other wave in the game is affected** — Level 1 Wave 1/2, Levels 2-5 regular waves, and the boss trial all keep their Pato-authorized band rules exactly as stated below. Before touching Level 1 Wave 0 again, re-read this note; before authoring any other wave, use its applicable regular or boss band, not this exception.

## Per-Level Difficulty Curve (added 2026-08-12, issue #162, resolving backlog 3.12/issue #95's flat-numbers finding)

Every wave in the shipped vertical slice carried `hp_modifier: 1.0` / `damage_modifier: 1.0` — the fields existed (issue #71 wired them into `Enemy.ts`) but no template ever defined a curve to put in them, so every prior Warden log entry correctly refused to invent a number for them ("no template field defines a base enemy-HP number or a per-level multiplier to scale against"). This section is that missing definition — Pato's authority, per this file's closing line, so Warden now has a real number to read instead of defaulting to 1.0.

**The lever: a single shared difficulty-tier scalar, applied identically to both fields.** `hp_modifier` and `damage_modifier` move together on every wave (`hp_modifier === damage_modifier`) rather than as two independently-derived curves — this keeps enemy tankiness (time-to-kill) and enemy output (damage-taken) scaling in lockstep, so the fight's pacing doesn't drift out of the shape Warden already tuned via composition/cadence/debuff-cap axes. The issue's "or equivalent budget-based lever" allowance covers this: one scalar is simpler to validate than two, and nothing here requires them to diverge.

**How it's checked — extends `computeThreatBudget`/`isWithinBand`, doesn't replace them.** `src/systems/waveThreatBudget.ts` adds:
- `LEVEL_BAND_MULTIPLIER` — a per-level multiplier on the *entire* `STANDARD_REGULAR_WAVE_BAND` envelope (floor and ceiling scaled together, so the band's shape never distorts): Level 1 = 1.00 (unchanged from before this issue — Level 1 still validates against the exact same band it always has), Level 2 = 1.08, Level 3 = 1.16, Level 4 = 1.24, Level 5 = 1.32. A fixed +0.08 step per level — small enough that the two already-validated composition pairs ((Melee=3,Ranged=2) and (Melee=2,Ranged=3)) still clear the scaled floor at every level, large enough that reaching the scaled ceiling now requires an actual `damage_modifier` above 1.0 instead of the envelope just floating uselessly above an unchanged raw composition.
- `levelRegularWaveBand(level)` — returns `scaleBand(STANDARD_REGULAR_WAVE_BAND, LEVEL_BAND_MULTIPLIER[level])`. Warden/Pato check a wave's modifier-scaled budget against *this*, not the raw `STANDARD_REGULAR_WAVE_BAND`, for every level 2-5 regular wave (Level 1 waves check against the plain `STANDARD_REGULAR_WAVE_BAND` exactly as before, since its multiplier is 1.0 — Level 1 Wave 0 keeps checking against `isOnboardingGrace` instead, untouched by any of this).
- `applyDamageModifier(budget, damageModifier)` — multiplies a raw `computeThreatBudget` result by the wave's `damage_modifier`, since the modifier scales the same per-hit percentages `HIT_PCT` encodes.
- `BOSS_TRIAL_BAND` (40-60% competent / 70-90% careless, this section's existing Boss/trial row as a `ThreatBand`) and `sumThreatBudgets(perPhaseBudgets)` — the Level 5 boss/trial phases are separate from Level 5's regular-wave curve and do not use its multiplier; their modifier-scaled per-phase budgets are summed (no HP reset between phases) and checked against `BOSS_TRIAL_BAND` directly.

**Within-level escalation (wave-over-wave).** Each level's three waves' `damage_modifier` step up by a small, fixed increment across the level (e.g. Level 4: 1.24 → 1.25 → 1.26) — real variation, not just "level average is higher." Level 1 Wave 0 is excluded from this step (held at exactly 1.0, on top of its already-below-standard-band onboarding composition) so the onboarding grace period isn't quietly re-inflated by the curve landing on top of it.

**Across-level escalation.** Each level's opening wave's `damage_modifier` is strictly higher than the previous level's opening wave (Level 1 Wave 1's 1.01 → Level 2 Wave 0's 1.08 → Level 3 Wave 0's 1.16 → Level 4 Wave 0's 1.24 → Level 5 Wave 0's 1.32), and every regular wave's modifier-scaled budget sits inside that level's own wider `levelRegularWaveBand`, so the same composition literally threatens more HP at Level 5 than the identical composition did at Level 1.

**Boss escalation is structural, not modifier-led — a boss modifier is *not* expected to exceed Level 5 regular waves'.** The boss/trial's own composition (Melee=1,Ranged=3 → Melee=2,Ranged=4 → Melee=2,Ranged=4, no HP reset between phases) already produces a raw cumulative budget of 51.0% competent / 79.0% careless at `damage_modifier = 1.0` — 3-4x any single regular wave's raw figure, and already deep inside `BOSS_TRIAL_BAND` on its own. `BOSS_TRIAL_BAND`'s own ceiling (60%/90%) leaves very little room for a modifier above 1.0 without busting the band (a uniform modifier above ~1.14 already overshoots either bound). The boss's phase modifiers therefore escalate gently across its own 3 phases (1.00 → 1.05 → 1.10, cumulative effective budget 53.82% / 83.50%, both inside `BOSS_TRIAL_BAND`) rather than continuing Level 5 regular waves' absolute modifier value upward — the escalation into the boss is real and large, it just shows up in the *composition* Warden already authored for the boss, not in the modifier field matching or exceeding the regular-wave peak.

**Verification (rerun before trusting this table — don't hand-derive, call the functions):** every regular-wave file's modifier-scaled budget against its own `levelRegularWaveBand`, and the boss's summed modifier-scaled budget against `BOSS_TRIAL_BAND`, is asserted directly against the real shipped JSON in `waveThreatBudget.test.ts` (not just this file's prose) — see the `issue #162` describe block added 2026-08-12.

| Level | `LEVEL_BAND_MULTIPLIER` | Wave 0 `damage_modifier`/`hp_modifier` | Wave 1 | Wave 2 |
| --- | --- | --- | --- | --- |
| 1 | 1.00 | 1.00 (onboarding exception, unchanged) | 1.01 | 1.02 |
| 2 | 1.08 | 1.08 | 1.09 | 1.10 |
| 3 | 1.16 | 1.16 | 1.17 | 1.18 |
| 4 | 1.24 | 1.24 | 1.25 | 1.26 |
| 5 regular | 1.32 | 1.32 | 1.33 | 1.34 |
| Boss (phase 0-2) | n/a — `BOSS_TRIAL_BAND` | 1.00 | 1.05 | 1.10 |

## Debuffer Magnitudes

Debuffer drains either speed or Mana regen per instance (Warden's choice per encounter, not both from the same instance).

| Variant | Per-application magnitude | Stacking | Hard cap | Floor |
| --- | --- | --- | --- | --- |
| Speed drain | 12% | Additive | 2 applications (24% max) | — |
| Mana-regen drain | 2.4 Mana/sec (off the 8/sec base in `mana-template.md`) | Additive | 2 applications (4.8/sec max drain) | Regen can never drop below **3.2 Mana/sec**, regardless of stack count |

Cap is set at 2, not Warden's suggested 2-3 — tighter cap chosen specifically because HP has no in-combat regen, so compounding drains (speed loss extending exposure time, or Mana-regen loss removing defensive/escape options) carry more downside here than they would against a regenerating pool. This is a numeric tightening of Warden's proposal, not a rejection of it.

**Retuned 2026-08-06 (backlog 2.39 / issue #88):** the 1.5/2.0 figures above were sized against `MANA_REGEN_PER_SEC`'s old 5/sec base, where the 2-stack cap (3.0/sec drain) landed exactly on the 2/sec floor by design. Backlog 2.34 retuned the base to 8/sec; retuning the drain and floor to 2.4/3.2 restores the same relationship (1-stack lands at 5.6/sec, 70% of base, matching the old ratio; 2-stack lands exactly on the new 3.2 floor). Applied once 2.34's 8/sec base cleared its developer-playtest gate — see `docs/agents/pato/log.md`, 2026-08-03 and 2026-08-06.

## Phase-Transition Partial HP Recovery

**Status: ENABLED. Final numeric spec — all five blocking sub-decisions the developer flagged (cap formula, money ceiling, fee model, fee basis, mid-fight-kill freeze) are resolved.** Full decision record: `docs/superpowers/specs/2026-07-21-death-recovery-fee-decisions.md`. Nothing below is pending; this replaces the earlier "one sub-parameter still open" framing in full.

**Revised 2026-07-23** — the gdd-review-kit board's adversarial-qa reviewer found the original 15%-restore / 33%-ceiling pair was arithmetically incompatible with the cap formula across the stated 40-60 HP competent-play range (a single 15-HP recovery already exceeded the ceiling for any boss budgeted below ~45.5 HP, and a second recovery never cleared the ceiling anywhere in-range, making "capped at 3" unreachable regardless of boss design). This file's original worked example (below) already reasoned through and accepted "expect 0 or 1, not the full 3" as the practical outcome — that reasoning was sound but under-stated in the main GDD, and the review board read the gap as a live contradiction rather than an accepted limitation. Rather than leave "3" as a number the numbers can never reach, the restore amount, ceiling, and cap are revised together below so the stated cap is actually achievable somewhere in the stated budget range.

This addresses the pacing risk Warden originally flagged: "no regen in combat" combined with a long multi-phase boss/trial could let one bad early phase compound into an unavoidable death spiral regardless of later play, since nothing between phases gives the pool back. The developer resolved the fork by enabling recovery, gated behind a Hexcoin fee, and set the guiding intent for every decision below: boss fights should stay genuinely hard and the fee should be "a real, punishing choice... not a cheap safety net that trivializes the fight."

**Rule, fully specified:**

- At each boss/trial phase-break (multi-phase encounters only — regular waves have no phases to break between), the mage is offered a choice: pay a flat Hexcoin fee to restore **10%** of pool HP (10 HP), or decline and continue at current HP.
- Revised down from the original 15% (2026-07-23) specifically so the money ceiling below can actually permit more than one recovery somewhere in the stated competent-play budget range — see the worked example. This is a money-ceiling-compatibility fix, not a new signal about how satisfying 10% feels; if playtesting later shows 10% reads as too small to matter, that's a separate developer call.
- The fee must be paid in full to trigger the recovery — no partial payment for a partial (pro-rated) restore. If the mage cannot afford the full fee, no recovery is offered/possible for that phase-break; the encounter proceeds exactly as it does today with the option disabled (no new failure state introduced).
- The recovery does not stack with itself within a single phase-break — one fee payment buys one 10-HP restore per phase-break, not multiple.

**Cap on recoveries per fight (settled):**

- Cap = (that boss's total phase-breaks − 1), hard-ceilinged at **2 recoveries** regardless of fight length.
- Revised down from 3 (2026-07-23): with the fee and ceiling both fixed below, 3 recoveries is never reachable anywhere in the stated 40-60 HP competent-play range (see worked example) — stating a cap the numbers can't reach was the review-board-flagged defect, so the cap is set to match what's actually achievable rather than left decorative.
- A boss with exactly one phase-break — the shortest possible multi-phase fight — yields **zero** recoveries under this formula. Confirmed intentional: the mechanic exists to stop a death spiral in a *long* fight; the shortest multi-phase fights were never the risk it protects against.
- Warden designs each boss's phase-break count as part of its own encounter design. Pato validates every submission against this formula and against the money ceiling below before it ships.

**Money ceiling — the actual skill-over-money guarantee, and Pato's enforcement mechanism, not a suggestion to Warden:**

- Total HP recoverable via fee across the whole fight can never exceed **35% of that boss's competent-play threat budget** (this file's Wave/Boss Damage-Threat Budget table, above).
- Revised up from 33% (2026-07-23), paired with the 15%→10% fee cut above, specifically so the ceiling and the fee are mutually satisfiable across the whole stated budget range rather than only at one specific boss's numbers.
- **Pato rejects any Warden phase-break submission that would let purchased recovery exceed this share.** This is a hard gate Pato runs on every submission — a boss design that clears the phase-break cap formula but fails this ceiling still fails validation.
- Worked example, so Warden has a concrete target instead of an abstract percentage: one 10-HP recovery clears the 35% ceiling at every budget in the stated 40-60 HP competent-play range (35% of the lowest budget, 40 HP, is 14 HP — comfortably above the 10-HP fee). A second recovery (20 HP total restored) needs a budget of at least 20 / 0.35 ≈ **57.1 HP** — reachable only for bosses tuned to the upper end of the stated range, not the low end. A third recovery (30 HP total) needs a budget of at least 30 / 0.35 ≈ 85.7 HP, above the entire stated competent-play range — which is exactly why the cap above is set to 2, not 3: a cap the money ceiling can never reach isn't a real cap, it's a number that looks generous on paper and is always overridden by the tighter constraint. Practical reading for Warden: expect Pato to clear **1 recovery for most bosses, 2 only for bosses tuned toward the top of the budget range** — the phase-break cap and the money ceiling are independent constraints, and the tighter one always wins, but now at least one of them can be reached by design instead of by luck.

**Fee — Pato's numeric call: flat 30 Hexcoin, same price every recovery, every phase-break, no scaling by run performance.**

Reasoning behind 30, shown in full rather than asserted:

- Forward-only backtracking (GDD, Gameplay Loop; also see `hexcoin-template.md`) is the fact that makes this number pickable at all, not something to re-derive here — because a mage can never re-enter a cleared road segment to farm more kills, Hexcoin earned within one expedition/road-segment is a bounded, predictable amount instead of an open-ended farm.
- Plausible per-expedition income, vertical-slice scope: the course target is 5-10 short levels culminating in 1 mini-boss (GDD, Seven-Week Vertical Slice). Regular waves are tuned to "resolve quickly" (GDD, Spam Waves Vs. Tactical Trials) — read here as a handful of enemies per wave, not a long grind. Estimating ~4-9 regular waves before the boss checkpoint at ~5-8 kills each puts a reasonably active player's pre-boss Hexcoin balance in the rough range of **20-70 Hexcoin**. That range is consistent with the GDD's own framing of the existing 100-Hexcoin mastery-choice fee as "roughly the return from 100 defeated enemies" and "deliberately steep" — i.e. already pitched as *more* than a typical expedition's income, not comfortably less than it.
- Against a ~20-70 Hexcoin range, a 30-Hexcoin fee sits close to the middle: affordable in full for a player who has been clearing waves at a normal pace, but a real bite — often a third to all of the balance banked so far, not pocket change. A player who has coasted or died a lot (fewer kills banked) genuinely might not be able to afford it; a player who cleared efficiently can pay it and keep going. That gap is the intended tension, not a flaw.
- 30 sits deliberately well below the existing 100-Hexcoin fee so the two read as different-weight decisions rather than near-duplicates, while still drawing on the same bounded pool — see `hexcoin-template.md`'s resolved two-fees-one-pool section for how that competition is meant to work.
- **Tiering by boss/expedition: not introduced now.** The vertical slice ships exactly one mini-boss/Director trial, so there is nothing to tier a fee against yet — a tier table today would be guessing at boss budgets that don't exist. When a second boss or a harder expedition tier is built, Pato re-prices this fee against that boss's own competent-play threat budget using the same method above (income estimate vs. fee-as-fraction-of-income), rather than scaling today's number by a guess.

**Basis — resolved, expedition-scoped:** the fee draws from Hexcoin earned since the current expedition/road-segment began, resetting to 0 at every checkpoint. This is Pato's original recommendation (reading 1 from the earlier flag), now the developer-settled reading (`docs/superpowers/specs/2026-07-21-death-recovery-fee-decisions.md`, decision 3) — not a flag anymore. The lifetime-balance alternative was considered and rejected: it would let the fee's real weight drift upward over a whole playthrough regardless of how the current expedition is going, disconnecting the cost from the run it's supposed to be pricing.

**Mid-fight-kill freeze:** the eligible Hexcoin balance for this fee is **frozen at fight-start**. Hexcoin earned mid-fight — from adds or summons killed during the boss encounter itself — is not eligible for that same fight's own recovery fee; it banks toward the expedition total for later use (the next fight, the mastery-choice fee, etc.), but cannot fund a bailout in the fight that produced it. **Loomwright: snapshot the eligible balance the instant the boss encounter starts, and check every phase-break fee payment against that frozen snapshot, never against the live running total.** This closes the farm-to-afford loophole (killing adds specifically to afford the next phase-break's fee) without touching the underlying 1-Hexcoin-per-kill earn rate.

Only Pato edits this file. Warden and Frieren read it; they never invent their own numbers.
