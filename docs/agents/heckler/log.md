# Heckler — Critique Log

Append-only, dated, one entry per critique run.

## 2026-07-21

Context store established. No critique runs logged yet. (The 2026-07-21 GDD review board at `gdd-review-kit/reviews/2026-07-21/` is a related but separate one-time run of the same six personas against the GDD itself, predating this standing log.)

## 2026-07-21 — HP/Hexcoin mechanic bundle critique (dispatched by Ana)

Critiqued the new HP pool (100, no in-combat regen, reset per wave/checkpoint), the three enemy archetypes (Melee 7/Ranged 4/Debuffer speed-or-Manaregen drain), and the Hexcoin-gated phase-transition HP recovery (15%/phase-break, fee = 50% of [BASIS FLAGGED]) against `hp-template.md` and `hexcoin-template.md`.

- **Systems designer:** BLOCKING — paying Hexcoin to recover up to 15%/phase-break (stacking across multiple phase-breaks in one boss fight) lets currency substitute for tactical play, undermining the stated "wins through positioning, not reflexes" pillar; also flagged the Mana-regen drain floor (2/sec) as unreachable dead code given the hard 2-application stacking cap (5 − 1.5×2 = 2 exactly).
- **Narrative critic:** MAJOR — the mid-fight pay-to-heal fee and the Debuffer archetype both ship with zero fictional framing (no lore hook, no explanation of what spending coin to heal mid-boss-fight means diegetically), reading as a bare monetization-style toggle bolted onto tactical combat.
- **Player psychologist:** BLOCKING — the recovery fee scales with Hexcoin *earned this expedition*, so players who performed well can easily afford it while players actually spiraling toward death (low HP, likely low Hexcoin) can least afford the mechanic meant to save them — inverting the stated purpose of preventing an "unavoidable death spiral."
- **Feasibility lead:** BLOCKING — the fee's basis (expedition-scoped vs. lifetime Hexcoin) is explicitly unresolved in both templates ("Do not implement against either reading until confirmed"), so this bundle cannot actually be built as-is despite being dispatched to close the top BLOCKING finding.
- **Adversarial QA:** MAJOR — no cap on total phase-recovery purchases within a single multi-phase boss fight (a 5-phase boss could recover up to ~60% of the pool across 4 breaks), and "computed fresh at the moment of that phase-break" leaves undefined whether mid-fight kills (minions/adds) feed the "earned this expedition" total, opening a possible self-funding fee loophole.
- **Business analyst:** BLOCKING — two Hexcoin sinks (the existing flat 100-fee spell-choice and the new 50%-of-earnings recovery fee) now draw on the same expedition-scoped pool whose reachability/farmability is *already* an open, escalated disagreement per `hexcoin-template.md`; the economy cannot be tuned or evaluated until that's resolved, and there's no stated cap preventing Hexcoin-rich players from systematically buying their way around the death-trigger Mastery-loss penalty across a whole run.
