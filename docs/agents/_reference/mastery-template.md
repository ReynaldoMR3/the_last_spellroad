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

**SUPERSEDED 2026-07-25 (backlog item 0.4, original sizing): Mastery growth rate = 20 landed casts per tier.** ~~Sized once Warden's Level 1-3 regular-wave batch gave 60 total enemies (18+21+21) across a now-12-spell kit — the developer's stated "2-3 levels' worth of wave data (40-60+ enemies)" threshold. Full arithmetic in `docs/agents/pato/log.md`, 2026-07-25 (3).~~ **This number was wrong — see the correction below.** It rested on the premise "1 landed cast ≈ 1 kill" (fastest-mastering spell = lowest `base_targets`, ~1 landed cast per enemy killed). Heckler's 2026-07-25 critique (finding 2, `docs/agents/heckler/log.md`) falsified that premise directly against the shipped numbers: no Novice-tier spell one-shots any enemy (`Enemy.ts` HP — melee 18, ranged 14, debuffer 22 — dwarfs every Novice `base_power`), so every kill costs multiple landed casts, not one. Recomputed against Level 2's real composition, `stone_spike` alone yields 104 landed casts achievable in that single level — 2.6x the old 40-cast mastery threshold. Left in place only as a record of what was wrong and why; do not use 20 as the rate.

**Corrected 2026-07-25 (4) — supersedes entry (3)'s Part 2, backlog item 0.4: Mastery growth rate = 180 landed casts per tier (360 to fully master one spell).** Full arithmetic in `docs/agents/pato/log.md`, 2026-07-25 (4); summary below.

**Corrected derivation.** `MasterySystem.recordLandedCast` still increments per-spell on any landed cast regardless of target count — that part was never wrong. What was wrong is treating "landed cast" as "kill." The real relationship is casts-to-kill-one-enemy = `ceil(enemy_HP / spell_power)`. This means the fastest-mastering (worst-case) spell is not the lowest-`base_targets` one — it's the **lowest-`base_power`** one, played by deliberately isolating one enemy at a time (a spell's multi-target reach doesn't force a player to actually hit multiple enemies per cast; isolating a single target instead maximizes landed-cast accrual per enemy killed). The kit-wide minimum `base_power` is **2** (`flare_jab`, `spark_ring` — both already in the default 6-spell loadout per Heckler's critique finding 4), lower than `stone_spike`'s 4, making it the true worst case, not just a correction of Heckler's specific example.

Mastery scaling also feeds back into this: as the grinding spell itself tiers up, its power rises (+1 Adept, +2 Master), so kills get cheaper mid-grind and the total achievable landed-cast count is not simply "enemy HP ÷ Novice power" — it must be computed as a cumulative-damage schedule that steps up at the tier-up thresholds themselves.

**Worst-case arithmetic, properly self-accelerating.** Let `k` = casts/tier (mastery reached at `2k` casts). Spamming the power-2 spell in isolation: casts 1..k deal 2 dmg/cast (Novice), casts k+1..2k deal 3 dmg/cast (Adept). Cumulative damage at the mastery point (cast `2k`) = `2k + 3k = 5k`. Total enemy HP in Level 2 (8 melee×18 + 7 ranged×14 + 6 debuffer×22 = 374) and Level 3 (8×18 + 7×14 + 6×22 = 374, same composition shape) are the largest, and tied-worst, single levels — Level 1 is smaller (308) and non-binding. Casts needed to fully clear one such level, `T(k) = (k + 374) / 3` (valid once `k ≥ 374/5`, i.e. phase-2 alone finishes the clear). Safety requires `2k > T(k)` — mastery must need more casts than exist in one level, not fewer — with real margin, not a razor-thin pass (same standard the original derivation tried and failed to meet).

`k = 180`: `T(180) = (180+374)/3 = 184.67 → 185` casts to fully clear Level 2 (or 3) alone with the power-2 spell. Mastery point `2k = 360`. `360 / 185 ≈ 1.95x` — mastering the kit's weakest-power spell needs nearly two full Level-2/3-sized levels of exclusive, single-target spam, not a fraction of one; clears the single-level cap failure mode with real margin, the same ~1.9x standard the original (flawed) derivation aimed for but, this time, checked against the correct casts-to-kill relationship. Level 1 (308 HP) is even less binding (`T(180)=163`, margin 2.2x).

**Full 3-level reachability check** (so a dedicated specialist still gets a real payoff, not an unreachable number): across all three levels (1056 total HP), the same power-2 spell exclusively spammed reaches the `2k=360` mastery point at ~875/1056 ≈ 83% through the full 3-level kill-budget — reachable within, not beyond, the sampled 3-level arc, consistent with the original design intent ("master one favored spell by around level 2-3 with total dedication"), just now anchored to a relationship that actually holds. Ordinary varied play (spreading casts across the 12-spell kit rather than isolating one weak spell) needs meaningfully more total casts per kill on average — since most spells hit harder than `base_power=2` — so no spell under generalist play gets remotely close to 360 without deliberate single-spell focus, preserving the intended specialist/generalist asymmetry.

**Action for Loomwright:** replace `LANDED_CASTS_PER_TIER = 20` (itself replacing the original engine-testing placeholder of 5) in `src/systems/MasterySystem.ts` with **180**, and update its doc comment to cite this corrected derivation (`mastery-template.md`, "Corrected 2026-07-25 (4)") instead of the superseded 20-casts/tier reasoning. Pato does not edit engine code itself; this is a validated template value for Loomwright to wire in.

Only Pato edits this file. Frieren and Warden read it; they never invent their own scaling.
