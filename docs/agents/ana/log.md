# Ana — Orchestration Log

Append-only, dated, one entry per notable dispatch decision or status change. Other agents do not read this file directly — they ask Ana.

## 2026-07-21

Context store and orchestration model established (see `docs/superpowers/specs/2026-07-21-agent-context-and-orchestration-design.md`). No task dispatches yet.

## 2026-07-21 (2) — Death system (HP/damage trigger): status `blocked-with-reason`

Dispatched to close the GDD review board's top BLOCKING finding (no HP/death trigger existed). Sequence run: Warden (pacing intent) -> Pato (finalized `docs/agents/_reference/hp-template.md`: 100 HP pool, no regen in combat, full reset per wave/checkpoint, Melee 7/Ranged 4 per-hit, Debuffer speed/Mana-regen drain) -> developer requested fee-gated phase-transition recovery (50% of Hexcoin earned "this expedition") -> Pato drafted the fee rule into `hp-template.md` and `hexcoin-template.md`, flagging one ambiguity -> Heckler critiqued the full bundle (six personas, logged in full at `docs/agents/heckler/log.md`).

**Not yet written into the GDD.** Four open decisions block that, all needing the developer, not another agent guess:

1. **Cap total phase-recovery purchases per fight.** Systems Designer (BLOCKING): nothing currently bounds how many phase-breaks a boss can have or how many times the fee can be paid — a tuned 40-60% damage-threat budget can be bought back 30-60%+ with enough Hexcoin, making currency (not positioning) the deciding factor.
2. **Fix the fee curve's inverted incentive.** Player Psychologist (BLOCKING): pricing the fee at 50% of *this expedition's* earnings means players playing well can easily afford the safety net, while players actually spiraling toward death (fewer kills, less Hexcoin) can least afford the mechanic built to catch them. Needs a different curve (flat fee? scale with remaining HP instead of earnings? something else) or a deliberate acceptance of this tradeoff.
3. **Confirm expedition-scoped vs. lifetime Hexcoin** for the fee basis (Pato's original flag in `hp-template.md`'s Phase-Transition Partial HP Recovery section) — Pato recommends expedition-scoped but has not implemented against either reading.
4. **Decide whether mid-fight kills count toward the fee basis.** Adversarial QA (MAJOR): if boss-fight adds/summons killed during the fight count toward "earned this expedition" at the moment of the recovery offer, the fee partially pays for itself mid-fight — a real loophole, not hypothetical.

Also flagged, not blocking but worth a follow-up dispatch: Narrative Critic (MAJOR) — the fee has zero fictional framing (reads as a bare paywall) and the Debuffer archetype has no lore identity at all. Lorena has not been looped in yet; do that once the four decisions above are resolved and the mechanic is numerically stable enough to be worth narrating.

**Next session starts here:** read this entry, `docs/agents/_reference/hp-template.md`, and `docs/agents/heckler/log.md`'s 2026-07-21 entry in full before doing anything else — do not re-derive this from the GDD, it isn't in the GDD yet. Branch: `death-system-hp-design` (off `main`, not yet pushed as of this entry).
