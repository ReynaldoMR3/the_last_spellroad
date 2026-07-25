# Mastery Template (Pato's authority)

Source of truth: `docs/game/the-last-spellroad-design.md`, "Death And Mastery Loss".

| Mastery | Power | Enemies hit | Cooldown / Cost |
| --- | --- | --- | --- |
| Novice (start) | base | base (e.g. 1) | base |
| Adept | +1 | +1 | base |
| Master | +2 | +2 | -10% cooldown or resource cost |

Example (starting fire spell, base Power 5, 1 enemy): Novice = Power 5 / 1 enemy; Adept = Power 6 / 2 enemies; Master = Power 7 / 3 enemies with cheaper/faster cast.

Every spell uses this same template — Mastery scaling is never authored per spell. Death drops one Mastery tier on a random equipped spell by default; paying Pato's 100-Hexcoin fee (see `hexcoin-template.md`) lets the player choose which spell takes the loss instead.

**Resolved 2026-07-22 (developer decision, closing the 2026-07-21 review board's Novice-padding finding):** the random death-roll excludes Novice-tier equipped spells from its pool — there is nothing left to lose below Novice, so it isn't a valid roll target. If every equipped spell is Novice, death costs no Mastery that time. This is the designed floor, not an exploit to patch.

**Resolved 2026-07-22 (developer decision):** hierarchy rank never drops on death. Mastery-tier loss on a single spell is the entire cost death imposes.

**Resolved 2026-07-25 (backlog item 0.4): Mastery growth rate = 20 landed casts per tier.** Sized once Warden's Level 1-3 regular-wave batch gave 60 total enemies (18+21+21) across a now-12-spell kit — the developer's stated "2-3 levels' worth of wave data (40-60+ enemies)" threshold. Full arithmetic in `docs/agents/pato/log.md`, 2026-07-25 (3); summary below.

Derivation: `MasterySystem.recordLandedCast` increments per-spell on any landed cast, regardless of how many targets that cast hits — so the fastest-mastering spell in the kit is the lowest-target one (base_targets=1: `stone_spike`, `magma_lance`), since a 1-target spell can accrue up to ~1 landed cast per enemy killed. Worst-case bound: the largest single level in the sampled data (Level 2 or 3, 21 enemies) could in principle yield up to 21 landed casts of a 1-target spell if a player spammed it against every enemy that level. To avoid the exact failure mode flagged on 2026-07-23 (4) — "a naive rate sized off it alone would cap most of the spellbook at Master within a single level" — the rate must put 2 tier-ups (Novice→Adept→Master = 2x the per-tier rate) clearly out of reach of that single-level ceiling, not just barely above it.

20 landed casts/tier → 40 casts to fully master one spell. 40 vs. the 21-enemy single-level ceiling: mastering even a 1-target spell needs just under 2 full levels of exclusive, single-spell spam at minimum — clears the single-level cap failure mode with real margin (40 is ~1.9x the hardest level's ceiling, not a razor-thin pass). Checked against the full 3-level, 60-enemy sample too: 40 sits inside the 60-enemy total, so a maximally dedicated specialist could just about master one favorite spell by the end of the sampled 3 levels — a real, earned payoff, not unreachable — while under ordinary varied play (kit-wide average 2.92 targets/cast across all 12 spells, i.e. only ~60/2.92 ≈ 20.5 total landed casts available across all 3 levels if spread efficiently across the whole kit) no spell gets remotely close to Master without deliberate single-spell focus. That asymmetry — specialization rewarded, generalist play left far short — is the intended shape: most of the 12-spell kit stays at Novice/Adept through the sampled levels; only a player's actively-mained spell(s) progress meaningfully, and even then not before roughly level 2-3.

**Action for Loomwright:** replace `PLACEHOLDER_LANDED_CASTS_PER_TIER = 5` in `src/systems/MasterySystem.ts` with **20** and drop the placeholder comment — this is now a sized design number, not an engine-testing stand-in. Pato does not edit engine code itself; this is a validated template value for Loomwright to wire in.

Only Pato edits this file. Frieren and Warden read it; they never invent their own scaling.
