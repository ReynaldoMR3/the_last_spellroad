# Pato — Validation Log

Append-only, dated, one entry per validation run.

## 2026-07-21

Context store established. No validation runs logged yet.

## 2026-07-21 (2)

Set the new HP template (`docs/agents/_reference/hp-template.md`) at Ana's dispatch, following Warden's pacing-informed design intent for the mage's HP pool and the three base enemy archetypes' damage/debuffs. Basis: structurally parallel to the existing Mana template (100-point pool) but with no in-combat regen and a full reset per wave/checkpoint, per the developer's locked conceptual design. Finalized authoritative numbers from Warden's proposed ranges rather than taking them verbatim — picked 7/4 flat per-hit damage for Melee/Ranged (top and bottom of Warden's suggested ranges respectively), 12% speed drain and 1.5 Mana/sec regen drain for the Debuffer variants, and tightened Warden's suggested 2-3 stacking cap down to a hard cap of 2 applications specifically because the no-regen-in-combat rule makes compounding debuffs riskier here than against a regenerating pool. Left the phase-transition-recovery question (Warden's flagged death-spiral risk on long multi-phase bosses) as an explicitly optional, off-by-default rule pending developer sign-off — did not resolve that fork myself, since the developer has not decided it.

## 2026-07-21 (3)

Developer signed off on the phase-transition recovery fork: enabled by default, gated behind a Hexcoin fee ("50% of the money it already won on this road, so the game is not so easy"). Updated `docs/agents/_reference/hp-template.md`'s "Phase-Transition Partial HP Recovery" section in place — status changed from PENDING to ENABLED, rule fully specified (choice offered at each boss/trial phase-break, fee must be paid in full or no recovery, no stacking within a phase-break, 15% restore amount left unchanged since the fee is a cost/accessibility lever on the Hexcoin economy and not a signal to revise the HP-restore magnitude). Left one parameter explicitly flagged rather than guessing: "on this road" is ambiguous between (1) 50% of Hexcoin earned since entering the current expedition/road segment (expedition-scoped, resets each expedition) and (2) 50% of lifetime Hexcoin balance. Recommended reading 1 on textual grounds ("on this road" mirrors the expedition/road-segment scope already used elsewhere in the HP template) and design grounds (keeps the fee proportional to the current run's stakes rather than drifting upward over a whole playthrough) — but did not silently pick it; flagged for developer confirmation before Warden/Frieren build against it, same handling as the original phase-recovery fork.

Also updated `docs/agents/_reference/hexcoin-template.md` to record the new fee line and flagged a second-order tension: the new fee draws from the same undecided, potentially-scarce Hexcoin pool as the existing 100-Hexcoin spell-choice fee, whose reachability/farmability is already an open developer decision. Under the expedition-scoped reading this makes that existing disagreement higher-stakes (two fees now compete for one scarce per-segment sub-total); under the lifetime reading it instead risks making the flat 100-Hexcoin fee's tuning comparatively irrelevant without resolving reachability either way. Not resolved — flagged for the developer, who should weigh both fees together when deciding the backtracking/farmability question.
