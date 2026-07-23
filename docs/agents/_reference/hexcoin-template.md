# Hexcoin Template (Pato's authority)

Source of truth: `docs/game/the-last-spellroad-design.md`, "Hexcoin" and "Phase-Transition Recovery".

- Earn rate: **1 Hexcoin per kill**, flat across enemy types.
- Persists through death like every other permanent-progression element — never lost.
- **Fee 1: 100 Hexcoin** lets the player choose which equipped spell takes the Mastery-tier loss on death, instead of a random roll.
- **Fee 2 (resolved 2026-07-21, restore amount revised 2026-07-23): flat 30 Hexcoin**, same price every time regardless of how the run is going, lets the mage buy one Phase-Transition Partial HP Recovery (10% pool restore, revised down from 15% so the money ceiling is reachable across the full competent-play budget range — see `hp-template.md`) at a boss/trial phase-break — see `hp-template.md`, "Phase-Transition Partial HP Recovery" for the full rule, the cap formula, the money ceiling, and Pato's fee-sizing reasoning. This replaces the earlier "50% of [BASIS FLAGGED]" model entirely — there is no percentage-of-earnings component left in either template.

**Basis, resolved:** both fees above draw from the same **expedition-scoped** Hexcoin sub-total — earned since the current expedition/road-segment began, resetting to 0 at every checkpoint. Not the lifetime balance. (Developer decisions 2 and 3, `docs/superpowers/specs/2026-07-21-death-recovery-fee-decisions.md`.) This was Pato's original "on this road" reading and the flag against it is now closed, not just recommended.

**Mid-fight-kill freeze (Fee 2 only):** the balance eligible for Fee 2 is frozen at boss-fight start. Hexcoin earned mid-fight (adds, summons killed during the boss encounter) still banks toward the expedition total, but cannot fund that same fight's own recovery fee — see `hp-template.md` for the full rule and the reason (closing the farm-to-afford loophole). Fee 1 is not fight-scoped, so this freeze does not apply to it.

**Reachability/farmability, resolved:** the Spellroad is strictly forward-only — no backtracking into a cleared road segment (GDD, Gameplay Loop). This closes the 2026-07-21 review-board disagreement (`gdd-review-kit/reviews/2026-07-21/SYNTHESIS.md`) about whether the Hexcoin economy is reachable at all or trivially farmable: it is neither. Per-expedition income is now a bounded, predictable number instead of an open question — which is also the fact that let Pato pick Fee 2's flat 30-Hexcoin amount instead of guessing against an unbounded economy (see `hp-template.md` for the income estimate behind that number).

**Resolved 2026-07-21 — the two-fees-one-pool tension (previously an open flag):** Fee 1 (100 Hexcoin) and Fee 2 (flat 30 Hexcoin) draw on the same bounded, expedition-scoped pool. Now that backtracking is settled forward-only and both fees are flat numbers, this is not a problem to fix — it's the intended shape of the economy:

- Plausible pre-boss income for a reasonably active player, vertical-slice scope, is roughly 20-70 Hexcoin (see `hp-template.md`'s Fee reasoning for the wave/kill-count estimate behind this). Against that range, Fee 2 alone (30 Hexcoin) is affordable for most of it; Fee 1 alone (100 Hexcoin) is not, most of the time — the GDD already frames the 100-Hexcoin fee as "deliberately steep... not a formality," i.e. pitched above a typical expedition's income by design, not comfortably within it.
- A mage who pays Fee 2 during a boss fight banks that much less toward Fee 1 later (or toward the next expedition's Fee 2). That is a real, felt tradeoff, not a design defect — it is the same "pay because it's worth it, or decline and come back better prepared" choice the developer asked for, now extended across two fees competing for one pool instead of one fee against an unlimited one.
- Pato is not resolving this by re-pricing Fee 1, and is not trying to guarantee both fees are simultaneously affordable within one expedition — that would defeat the tradeoff. If a future playtest shows Fee 1 is effectively *unreachable* within a normal expedition's income (as opposed to merely steep), that's a developer call to revisit Fee 1's own number, not something Pato quietly compensates for by repricing Fee 2.

Only Pato edits this file.
