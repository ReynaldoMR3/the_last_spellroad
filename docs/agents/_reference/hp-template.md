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

## Debuffer Magnitudes

Debuffer drains either speed or Mana regen per instance (Warden's choice per encounter, not both from the same instance).

| Variant | Per-application magnitude | Stacking | Hard cap | Floor |
| --- | --- | --- | --- | --- |
| Speed drain | 12% | Additive | 2 applications (24% max) | — |
| Mana-regen drain | 1.5 Mana/sec (off the 5/sec base in `mana-template.md`) | Additive | 2 applications (3.0/sec max drain) | Regen can never drop below **2 Mana/sec**, regardless of stack count |

Cap is set at 2, not Warden's suggested 2-3 — tighter cap chosen specifically because HP has no in-combat regen, so compounding drains (speed loss extending exposure time, or Mana-regen loss removing defensive/escape options) carry more downside here than they would against a regenerating pool. This is a numeric tightening of Warden's proposal, not a rejection of it.

## Phase-Transition Partial HP Recovery

**Status: ENABLED. Final numeric spec — all five blocking sub-decisions the developer flagged (cap formula, money ceiling, fee model, fee basis, mid-fight-kill freeze) are resolved.** Full decision record: `docs/superpowers/specs/2026-07-21-death-recovery-fee-decisions.md`. Nothing below is pending; this replaces the earlier "one sub-parameter still open" framing in full.

This addresses the pacing risk Warden originally flagged: "no regen in combat" combined with a long multi-phase boss/trial could let one bad early phase compound into an unavoidable death spiral regardless of later play, since nothing between phases gives the pool back. The developer resolved the fork by enabling recovery, gated behind a Hexcoin fee, and set the guiding intent for every decision below: boss fights should stay genuinely hard and the fee should be "a real, punishing choice... not a cheap safety net that trivializes the fight."

**Rule, fully specified:**

- At each boss/trial phase-break (multi-phase encounters only — regular waves have no phases to break between), the mage is offered a choice: pay a flat Hexcoin fee to restore **15%** of pool HP (15 HP), or decline and continue at current HP.
- The 15% restore amount is unchanged from the original spec. Gating the rule behind currency is an accessibility/cost lever on the Hexcoin economy, not a signal about whether 15% is the right HP amount — no numeric reason has surfaced to revise it.
- The fee must be paid in full to trigger the recovery — no partial payment for a partial (pro-rated) restore. If the mage cannot afford the full fee, no recovery is offered/possible for that phase-break; the encounter proceeds exactly as it does today with the option disabled (no new failure state introduced).
- The recovery does not stack with itself within a single phase-break — one fee payment buys one 15-HP restore per phase-break, not multiple.

**Cap on recoveries per fight (settled):**

- Cap = (that boss's total phase-breaks − 1), hard-ceilinged at **3 recoveries** regardless of fight length.
- A boss with exactly one phase-break — the shortest possible multi-phase fight — yields **zero** recoveries under this formula. Confirmed intentional: the mechanic exists to stop a death spiral in a *long* fight; the shortest multi-phase fights were never the risk it protects against.
- Warden designs each boss's phase-break count as part of its own encounter design. Pato validates every submission against this formula and against the money ceiling below before it ships.

**Money ceiling — the actual skill-over-money guarantee, and Pato's enforcement mechanism, not a suggestion to Warden:**

- Total HP recoverable via fee across the whole fight can never exceed **33% of that boss's competent-play threat budget** (this file's Wave/Boss Damage-Threat Budget table, above).
- **Pato rejects any Warden phase-break submission that would let purchased recovery exceed this share.** This is a hard gate Pato runs on every submission — a boss design that clears the phase-break cap formula but fails this ceiling still fails validation.
- Worked example, so Warden has a concrete target instead of an abstract percentage: one 15-HP recovery only clears the 33% ceiling if the boss's own competent-play threat budget is at least 15 / 0.33 ≈ **45.5 HP**. Since the stated competent-play range for boss/trial fights is 40-60 HP, a boss tuned toward the low end of that range (roughly 40-45 HP) cannot support *any* purchasable recovery without failing the ceiling — only bosses tuned to the upper half of the range clear even one. A second recovery (30 HP total restored) needs a budget of at least 30 / 0.33 ≈ 90.9 HP, above the entire stated competent-play range. Practical reading for Warden: within this template's current budget table, expect Pato to clear **0 or 1** purchasable recovery for most bosses, not the full 3 the cap formula alone would allow on a long fight — the phase-break cap and the money ceiling are independent constraints, and the tighter one always wins.

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
