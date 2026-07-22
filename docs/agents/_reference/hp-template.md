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

**Status: ENABLED, gated behind a Hexcoin fee (developer sign-off 2026-07-21). One sub-parameter of the fee is still open — see the flag below before implementing.**

This addresses the pacing risk Warden originally flagged: "no regen in combat" combined with a long multi-phase boss/trial could let one bad early phase compound into an unavoidable death spiral regardless of later play, since nothing between phases gives the pool back. The developer resolved the fork by enabling recovery, but paywalling it behind Hexcoin rather than granting it for free, per the developer's own framing: "add the partial recovery if a fee is payed, the fee should be around 50% of the money it already won on this road, so the game is not so easy."

**Rule, fully specified except one flagged parameter:**

- At each boss/trial phase-break (multi-phase encounters only — regular waves have no phases to break between), the mage is offered a choice: pay a Hexcoin fee to restore **15%** of pool HP (15 HP), or decline and continue at current HP.
- Fee amount: **50% of [BASIS FLAGGED — see below]**, computed fresh at the moment of that phase-break.
- The fee must be paid in full to trigger the recovery — no partial payment for a partial (pro-rated) restore. If the mage cannot afford the full fee, no recovery is offered/possible for that phase-break; the encounter proceeds exactly as it does today with the option disabled (no new failure state introduced).
- The recovery does not stack with itself within a single phase-break (unchanged from the original spec) — one fee payment buys one 15-HP restore per phase-break, not multiple.
- The 15% restore amount is **unchanged from the original pending spec**. Reasoning: the developer's fee requirement is an accessibility/cost lever on the Hexcoin economy, not a signal about whether 15% is the right HP amount — nothing about gating the rule behind currency changes how much death-spiral risk one restore needs to offset. No numeric reason surfaced to revise the 15% figure; Pato is not adjusting it.

**Flag — needs developer confirmation before implementation:** "50% of the money it already won on this road" is ambiguous between two readings, and Pato is not silently picking one:

1. **Expedition-scoped (recommended):** 50% of Hexcoin earned since entering the current expedition/road segment — a running sub-total that resets to 0 at the start of each new expedition.
2. **Lifetime:** 50% of the mage's total persistent Hexcoin balance (Hexcoin is never lost on death per `hexcoin-template.md`, so this would include everything ever earned across the whole save).

**Pato's recommendation: reading 1 (expedition-scoped).** The developer's own qualifier — "on this road" — is a direct textual match for the expedition/road-segment scope already used elsewhere in this template (see the HP pool's own "full reset... at every expedition/road-segment checkpoint" rule above), not for "ever earned" or "total." Reading 2 would also make the fee's weight drift wildly and permanently upward over a playthrough — a veteran mage with a large lifetime balance would pay a fee disconnected from what's actually at stake in the current run, which sits awkwardly next to a mechanic meant to answer a specific run's death-spiral risk. Reading 1 keeps the fee's cost proportional to what the current expedition has actually produced, which is what "so the game is not so easy" appears to be pricing against.

This is still a flag, not a resolution — the developer must confirm before Warden/Frieren build anything referencing this fee. Do not implement against either reading until confirmed.

Only Pato edits this file. Warden and Frieren read it; they never invent their own numbers.
